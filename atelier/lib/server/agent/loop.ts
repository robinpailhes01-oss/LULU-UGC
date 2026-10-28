import "server-only";
import Anthropic from "@anthropic-ai/sdk";
import type {
  BetaContentBlock,
  BetaContentBlockParam,
  BetaMessage,
  BetaMessageParam,
  BetaTextBlockParam,
  BetaToolResultBlockParam,
  BetaToolUseBlock,
} from "@anthropic-ai/sdk/resources/beta/messages/messages";
import { AGENT_BETAS, AGENT_EFFORT, AGENT_MAX_ITERATIONS, AGENT_MAX_TOKENS } from "@/lib/server/agent/config";
import { describeAiError } from "@/lib/server/agent/errors";
import { clientBlockText, freezeSystem, skillsBlockText, systemBlocks } from "@/lib/server/agent/prompt";
import { buildScreenBlock } from "@/lib/server/agent/screen";
import {
  appendMessage,
  createThread,
  getPendingAction,
  loadMessages,
  renameThread,
  requireThread,
  toApiMessages,
  type FrozenSystem,
  type MessageMeta,
  type StoredMessage,
  type ToolChipMeta,
} from "@/lib/server/agent/store";
import { generateTitle, needsGeneratedTitle, provisionalTitle } from "@/lib/server/agent/title";
import { API_TOOLS, executeTool, toolLabel } from "@/lib/server/agent/tools";
import { aiModel, getAnthropic } from "@/lib/server/ai/client";
import { getCurrentClientId, runWithClient, type ClientScopeStore } from "@/lib/server/client-scope";
import { badRequest, HttpError } from "@/lib/server/http";
import { logActivity } from "@/lib/server/repo/activity";
import { skillsIndex } from "@/lib/server/services/skills";
import type { AgentScreenContext, AgentStreamEvent, AgentThread, RefreshScope } from "@/lib/shared/types";

/**
 * Boucle de l'agent (boucle manuelle en flux sur client.beta.messages.stream, SDK 0.133.0).
 *
 * Pourquoi une boucle manuelle plutôt que le toolRunner : on persiste chaque message au fil de
 * l'eau (append-only), on garde la main sur l'arrêt (bouton « Arrêter » : le texte déjà reçu est
 * conservé), sur la confirmation (outils sensibles → carte dans l'interface) et sur les cas
 * refus / max_tokens / pause_turn / relais vers un modèle de repli. Les outils d'un même tour
 * s'exécutent en parallèle et tous leurs résultats partent dans UN message utilisateur.
 */

export type Emit = (e: AgentStreamEvent) => void;

export interface TurnRequest {
  threadId?: string | null;
  message?: string;
  screen?: (AgentScreenContext & { path?: string }) | null;
  /** Action confirmée/annulée à laquelle ce message répond (résultat joint depuis la base). */
  actionId?: string | null;
  /** Relancer la réponse sans nouveau message (après une erreur). */
  retry?: boolean;
  actor: string | null;
}

export interface PreparedTurn {
  client: Anthropic;
  thread: AgentThread;
  created: boolean;
  request: TurnRequest;
  release: () => void;
}

// Un seul tour à la fois par conversation (par instance du serveur).
const running = new Set<string>();

/** Vérifications avant d'ouvrir le flux (les erreurs deviennent une réponse JSON classique). */
export async function prepareTurn(request: TurnRequest): Promise<PreparedTurn> {
  const client = getAnthropic(); // 503 « Branchez l'agent » si la clé manque
  const message = request.message?.trim() ?? "";
  if (!request.retry && !message) throw badRequest("Message vide.");
  let thread: AgentThread;
  let created = false;
  if (request.threadId) thread = await requireThread(request.threadId);
  else {
    if (request.retry) throw badRequest("Aucune conversation à reprendre.");
    // Nouvelle conversation : rattachée au client courant de l'interface.
    thread = await createThread(provisionalTitle(message), request.actor, await getCurrentClientId());
    created = true;
  }
  if (running.has(thread.id)) throw new HttpError(409, "busy", "L'agent répond déjà dans cette conversation. Attendez la fin ou arrêtez-le.");
  running.add(thread.id);
  return { client, thread, created, request: { ...request, message }, release: () => running.delete(thread.id) };
}

function lastKnownClient(rows: StoredMessage[], frozen: FrozenSystem): string | undefined {
  for (let i = rows.length - 1; i >= 0; i--) {
    const c = rows[i].meta.clientBlock;
    if (c) return c;
  }
  return frozen.client;
}

function lastKnownSkills(rows: StoredMessage[], frozen: FrozenSystem): string {
  for (let i = rows.length - 1; i >= 0; i--) {
    const s = rows[i].meta.skillsIndex;
    if (s) return s;
  }
  return frozen.skills;
}

/** Après un fallback en cours de réponse : ce qui précède le dernier bloc `fallback` ne se renvoie pas tel quel. */
export function sanitizeFallbackTurn(content: BetaContentBlock[]): { content: BetaContentBlock[]; dropped: string[] } {
  const last = content.map((b) => b.type).lastIndexOf("fallback");
  if (last < 0) return { content, dropped: [] };
  const pairedServer = new Set(content.flatMap((b) => ("tool_use_id" in b && typeof (b as { tool_use_id?: unknown }).tool_use_id === "string" ? [(b as { tool_use_id: string }).tool_use_id] : [])));
  const dropped: string[] = [];
  const kept = content.filter((b, i) => {
    if (i >= last) return true;
    if (b.type === "text") return true;
    if (b.type === "server_tool_use") return pairedServer.has(b.id);
    if ("tool_use_id" in b) return true; // résultat d'outil serveur apparié
    if (b.type === "tool_use") dropped.push(b.id);
    return false; // thinking, redacted_thinking, tool_use et blocs internes
  });
  return { content: kept, dropped };
}

function textOf(blocks: BetaContentBlock[]): string {
  return blocks
    .filter((b): b is Extract<BetaContentBlock, { type: "text" }> => b.type === "text")
    .map((b) => b.text)
    .join("");
}

/**
 * Déroule un tour complet en émettant les événements (texte, outils, confirmations, rafraîchissements).
 * Tout le tour s'exécute dans la portée du client de la conversation : les outils ne voient que
 * ce client (set_conversation_client peut en changer en cours de tour).
 */
export function runAgentTurn(prep: PreparedTurn, emit: Emit, signal: AbortSignal): Promise<void> {
  const scope: ClientScopeStore = { clientId: prep.thread.clientId };
  return runWithClient(scope, () => runScopedTurn(prep, emit, signal, scope));
}

async function runScopedTurn(prep: PreparedTurn, emit: Emit, signal: AbortSignal, scope: ClientScopeStore): Promise<void> {
  const { client, thread, request } = prep;
  const actor = request.actor;
  const message = request.message ?? "";
  try {
    if (prep.created) emit({ type: "thread", threadId: thread.id, title: thread.title });
    const titlePromise = prep.created && needsGeneratedTitle(message) ? generateTitle(client, message, signal) : Promise.resolve(null);

    const rows = await loadMessages(thread.id);
    const frozen = rows.find((r) => r.meta.system)?.meta.system ?? (await freezeSystem(scope.clientId));
    const firstWithSystem = !rows.some((r) => r.meta.system);

    // Réparation : un tour d'outils interrompu (coupure serveur) reçoit ses résultats avant toute suite.
    const last = rows[rows.length - 1];
    if (last?.role === "assistant") {
      const dangling = last.content.filter((b): b is BetaContentBlockParam & { type: "tool_use"; id: string; name: string } => b.type === "tool_use");
      if (dangling.length) {
        const results: BetaToolResultBlockParam[] = dangling.map((b) => ({ type: "tool_result", tool_use_id: b.id, is_error: true, content: "Interrompu : cet outil n'a pas été exécuté." }));
        rows.push(await appendMessage(thread.id, "user", results, { kind: "tool_results", tools: dangling.map((b) => ({ id: b.id, name: b.name, label: toolLabel(b.name), ok: false, summary: "Interrompu" })) }));
      }
    }

    if (!request.retry) {
      const header: string[] = [await buildScreenBlock(request.screen, actor, scope.clientId)];
      const meta: MessageMeta = { kind: "user", text: message };
      if (firstWithSystem) meta.system = frozen;
      else {
        const current = skillsBlockText(await skillsIndex());
        if (current !== lastKnownSkills(rows, frozen)) {
          header.push(`<skills_a_jour>\nL'index des skills a changé depuis le début de la conversation. Index actuel :\n${current}\n</skills_a_jour>`);
          meta.skillsIndex = current;
        }
        const clientNow = await clientBlockText(scope.clientId);
        if (clientNow !== lastKnownClient(rows, frozen)) {
          header.push(`<client_a_jour>\nLe client de la conversation (ou sa fiche) a changé. Il remplace le bloc <client> :\n${clientNow}\n</client_a_jour>`);
          meta.clientBlock = clientNow;
        }
      }
      if (request.actionId) {
        const action = await getPendingAction(request.actionId);
        if (action && action.threadId === thread.id) {
          const tag = action.status === "cancelled" ? "action_annulee" : "action_confirmee";
          header.push(`<${tag}>\n${JSON.stringify({ outil: action.tool, resume: action.summary, statut: action.status, resultat: action.result ?? null })}\n</${tag}>`);
          meta.actionId = action.id;
        }
      }
      const content: BetaTextBlockParam[] = [
        { type: "text", text: header.join("\n\n") },
        { type: "text", text: message },
      ];
      rows.push(await appendMessage(thread.id, "user", content, meta));
    } else if (!rows.length || rows[rows.length - 1].role !== "user") {
      throw badRequest("Rien à reprendre : la dernière réponse est complète.");
    }

    const messages: BetaMessageParam[] = toApiMessages(rows);
    const system = systemBlocks(frozen);
    let emittedText = false;
    let jsonRetries = 0;
    let stoppedEarly: string | null = null;

    for (let iteration = 0; ; iteration++) {
      if (signal.aborted) break;
      if (iteration >= AGENT_MAX_ITERATIONS) {
        stoppedEarly = `Je m'arrête ici : ${AGENT_MAX_ITERATIONS} étapes pour ce message. Dites « continue » pour que je poursuive.`;
        break;
      }
      const stream = client.beta.messages.stream(
        {
          model: aiModel(),
          max_tokens: AGENT_MAX_TOKENS,
          betas: AGENT_BETAS,
          fallbacks: "default",
          thinking: { type: "adaptive", display: "omitted", block_binding: { prefix_mismatch_behavior: "drop_block" } },
          output_config: { effort: AGENT_EFFORT },
          cache_control: { type: "ephemeral" },
          context_management: {
            edits: [{ type: "clear_tool_uses_20250919", trigger: { type: "input_tokens", value: 120_000 }, keep: { type: "tool_uses", value: 6 }, clear_at_least: { type: "input_tokens", value: 20_000 } }],
          },
          system,
          tools: API_TOOLS,
          messages,
        },
        { signal },
      );

      let msg: BetaMessage;
      let iterationText = false;
      try {
        for await (const ev of stream) {
          if (ev.type === "content_block_start" && ev.content_block.type === "tool_use") {
            emit({ type: "tool_start", id: ev.content_block.id, name: ev.content_block.name, label: toolLabel(ev.content_block.name) });
          } else if (ev.type === "content_block_delta" && ev.delta.type === "text_delta" && ev.delta.text) {
            if (!iterationText && emittedText) emit({ type: "text", delta: "\n\n" });
            iterationText = true;
            emittedText = true;
            emit({ type: "text", delta: ev.delta.text });
          }
        }
        msg = await stream.finalMessage();
        jsonRetries = 0;
      } catch (err) {
        if (signal.aborted || err instanceof Anthropic.APIUserAbortError) {
          // « Arrêter » : on garde le texte déjà reçu (sans réflexion ni outil inachevé).
          const partial = stream.currentMessage;
          const text = partial ? textOf(partial.content).trim() : "";
          if (text) await appendMessage(thread.id, "assistant", [{ type: "text", text }], { kind: "assistant", aborted: true, model: partial?.model });
          break;
        }
        // Entrée d'outil illisible (flux d'entrée en direct) : rien n'a été persisté, on relance le tour.
        if (!(err instanceof Anthropic.APIError) && err instanceof Anthropic.AnthropicError && jsonRetries < 2) {
          jsonRetries++;
          continue;
        }
        throw err;
      }

      const toolUses = msg.content.filter((b): b is BetaToolUseBlock => b.type === "tool_use");
      if (msg.stop_reason === "refusal") {
        // Toute la chaîne de repli a décliné : rien n'est rejoué plus tard.
        console.warn("[atelier] agent : refus", { thread: thread.id, details: msg.stop_details });
        await logActivity({ actor, verb: "a reçu un refus de l'agent", objectType: "thread", objectId: thread.id, summary: msg.stop_details?.category ?? "refus" });
        throw new HttpError(
          422,
          "refusal",
          msg.stop_details?.category === "reasoning_extraction"
            ? "Claude ne peut pas détailler son raisonnement interne. Demandez plutôt un résumé de ce qui a été fait."
            : "Claude a décliné cette demande. Reformulez-la ou découpez-la en étapes plus simples.",
        );
      }
      if ((msg.stop_reason === "max_tokens" || msg.stop_reason === "model_context_window_exceeded") && toolUses.length > 0) {
        // Une entrée d'outil coupée peut sembler valide : on n'exécute pas, on ne garde pas ce tour.
        throw new HttpError(422, "truncated", msg.stop_reason === "model_context_window_exceeded" ? "La conversation est devenue trop longue : commencez une nouvelle conversation." : "La réponse a été coupée avant la fin. Réessayez avec une demande plus courte.");
      }

      const { content, dropped } = sanitizeFallbackTurn(msg.content);
      const fallback = content.length !== msg.content.length || msg.content.some((b) => b.type === "fallback");
      for (const id of dropped) emit({ type: "tool_end", id, name: toolUses.find((b) => b.id === id)?.name ?? "outil", ok: false, summary: "Abandonné (relais vers un autre modèle)" });
      const assistantContent = content as unknown as BetaContentBlockParam[];
      await appendMessage(thread.id, "assistant", assistantContent, {
        kind: "assistant",
        model: msg.model,
        stopReason: msg.stop_reason,
        usage: msg.usage,
        requestId: stream.request_id ?? null,
        fallback: fallback || undefined,
      });
      messages.push({ role: "assistant", content: assistantContent });

      if (msg.stop_reason === "max_tokens" || msg.stop_reason === "model_context_window_exceeded") {
        stoppedEarly = "La réponse a été coupée car elle était trop longue. Demandez la suite si besoin.";
        break;
      }
      if (msg.stop_reason === "pause_turn") continue; // le serveur reprend là où il s'est arrêté

      const uses = content.filter((b): b is BetaToolUseBlock => b.type === "tool_use");
      if (uses.length === 0) break;

      // Outils du tour en parallèle ; tous les résultats dans un seul message utilisateur.
      const runs = await Promise.all(
        uses.map((u) =>
          executeTool(
            { id: u.id, name: u.name, input: u.input },
            { actor, threadId: thread.id, scope, progress: (label) => emit({ type: "tool_start", id: u.id, name: u.name, label }) },
          ),
        ),
      );
      const results = runs.map((r) => r.result);
      const chips: ToolChipMeta[] = runs.map((r) => r.chip);
      await appendMessage(thread.id, "user", results, { kind: "tool_results", tools: chips });
      messages.push({ role: "user", content: results });

      const scopes = new Set<RefreshScope>();
      for (const r of runs) {
        emit({ type: "tool_end", id: r.chip.id, name: r.chip.name, ok: r.chip.ok, summary: r.chip.summary, assetIds: r.chip.assetIds });
        if (r.pendingAction) emit({ type: "confirm", action: r.pendingAction });
        for (const s of r.outcome?.refresh ?? []) scopes.add(s);
      }
      if (scopes.size) emit({ type: "refresh", scopes: [...scopes] });
    }

    // Avis affiché sans être conservé : « error » est réservé aux échecs (rien du tour en cours n'est gardé).
    if (stoppedEarly) emit({ type: "text", delta: `${emittedText ? "\n\n" : ""}_${stoppedEarly}_` });
    const title = await Promise.race([titlePromise, new Promise<null>((r) => setTimeout(() => r(null), 15_000))]);
    if (title && title !== thread.title) {
      await renameThread(thread.id, title);
      emit({ type: "thread", threadId: thread.id, title });
    }
  } catch (err) {
    if (err instanceof HttpError) emit({ type: "error", message: err.message });
    else {
      const d = describeAiError(err);
      if (!(err instanceof Anthropic.APIError)) console.error("[atelier] agent", err);
      else console.warn("[atelier] agent : erreur Claude", { status: err.status, requestId: err.requestID, message: err.message });
      emit({ type: "error", message: d.message });
    }
  } finally {
    prep.release();
    emit({ type: "done" });
  }
}
