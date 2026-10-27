import "server-only";
import type { BetaTool, BetaToolResultBlockParam } from "@anthropic-ai/sdk/resources/beta/messages/messages";
import { serviceErrorMessage } from "@/lib/server/agent/errors";
import { createPendingAction, type ToolChipMeta } from "@/lib/server/agent/store";
import { describeZodError, type AgentTool, type ToolContext, type ToolOutcome } from "@/lib/server/agent/tool-kit";
import { LIBRARY_TOOLS } from "@/lib/server/agent/tools/library";
import { MONTAGE_TOOLS } from "@/lib/server/agent/tools/montage";
import { OVERVIEW_TOOLS } from "@/lib/server/agent/tools/overview";
import { POST_TOOLS } from "@/lib/server/agent/tools/posts";
import { RETOUCH_TOOLS } from "@/lib/server/agent/tools/retouch";
import { SKILL_TOOLS } from "@/lib/server/agent/tools/skills";
import type { PendingAction } from "@/lib/shared/types";

/**
 * Registre des outils de l'agent. L'ordre est trié par nom et les définitions ne dépendent de
 * rien de variable (ni personne, ni date) : le préfixe outils + système reste en cache.
 */
export const AGENT_TOOLS: AgentTool[] = [...LIBRARY_TOOLS, ...RETOUCH_TOOLS, ...OVERVIEW_TOOLS, ...MONTAGE_TOOLS, ...POST_TOOLS, ...SKILL_TOOLS].sort((a, b) => (a.name < b.name ? -1 : a.name > b.name ? 1 : 0));

const BY_NAME = new Map(AGENT_TOOLS.map((t) => [t.name, t]));
if (BY_NAME.size !== AGENT_TOOLS.length) throw new Error("Deux outils de l'agent portent le même nom.");

export function getTool(name: string): AgentTool | undefined {
  return BY_NAME.get(name);
}

export function toolLabel(name: string): string {
  return BY_NAME.get(name)?.label ?? name;
}

/** Outils qui demandent une confirmation dans l'interface avant de s'exécuter. */
export const CONFIRM_TOOLS = AGENT_TOOLS.filter((t) => t.confirm).map((t) => t.name);

/**
 * Définitions envoyées à Claude. `eager_input_streaming` : les entrées arrivent au fil de l'eau
 * (la requête est en flux) ; le serveur ne les valide plus, c'est zod qui le fait avant exécution.
 */
export const API_TOOLS: BetaTool[] = AGENT_TOOLS.map((t) => ({ name: t.name, description: t.description, input_schema: t.inputSchema, eager_input_streaming: true }));

const MAX_RESULT_CHARS = 60_000;

function resultText(outcome: ToolOutcome): string {
  const data = outcome.data;
  const payload = data && typeof data === "object" && !Array.isArray(data) ? { resume: outcome.summary, ...(data as Record<string, unknown>) } : { resume: outcome.summary, data: data ?? null };
  const text = JSON.stringify(payload);
  return text.length > MAX_RESULT_CHARS ? `${text.slice(0, MAX_RESULT_CHARS)}… [résultat tronqué : affine la demande (limit, filtres)]` : text;
}

export interface ToolRun {
  result: BetaToolResultBlockParam;
  chip: ToolChipMeta;
  outcome: ToolOutcome | null;
  pendingAction: PendingAction | null;
}

/** Exécute un appel d'outil (ou prépare sa confirmation). Ne lève jamais : les erreurs deviennent is_error. */
export async function executeTool(use: { id: string; name: string; input: unknown }, ctx: Omit<ToolContext, "toolUseId">): Promise<ToolRun> {
  const tool = BY_NAME.get(use.name);
  const label = tool?.label ?? use.name;
  const fail = (message: string): ToolRun => ({
    result: { type: "tool_result", tool_use_id: use.id, is_error: true, content: message },
    chip: { id: use.id, name: use.name, label, ok: false, summary: message.replace(/^Erreur : /, "").slice(0, 200) },
    outcome: null,
    pendingAction: null,
  });
  if (!tool) return fail(`Outil inconnu : ${use.name}.`);
  const parsed = tool.input.safeParse(use.input ?? {});
  if (!parsed.success) return fail(`Entrée invalide pour ${use.name} — ${describeZodError(parsed.error)}. Corrige l'appel.`);
  const fullCtx: ToolContext = { ...ctx, toolUseId: use.id };
  try {
    let outcome: ToolOutcome;
    let pendingAction: PendingAction | null = null;
    if (tool.confirm) {
      const plan = await tool.confirm.prepare(parsed.data, fullCtx);
      pendingAction = await createPendingAction({ threadId: ctx.threadId, tool: tool.name, input: plan.input, summary: plan.summary });
      outcome = {
        summary: `À confirmer : ${plan.summary}`,
        data: {
          statut: "en_attente_de_confirmation",
          action_id: pendingAction.id,
          consigne: "Rien n'est encore fait. L'utilisateur voit une carte « Confirmer / Annuler ». Ne relance pas cet outil : dis-lui en une phrase ce qui attend sa confirmation, puis arrête-toi sur ce point.",
        },
        assetIds: plan.assetIds,
        pendingAction,
      };
    } else {
      outcome = await tool.run!(parsed.data, fullCtx);
    }
    return {
      result: { type: "tool_result", tool_use_id: use.id, content: outcome.content ?? resultText(outcome) },
      chip: { id: use.id, name: tool.name, label, ok: true, summary: outcome.summary, assetIds: outcome.assetIds?.length ? outcome.assetIds : undefined, actionId: pendingAction?.id },
      outcome,
      pendingAction,
    };
  } catch (err) {
    return fail(`Erreur : ${serviceErrorMessage(err)}`);
  }
}

/** Exécute une action confirmée dans l'interface, avec l'entrée stockée à la préparation. */
export async function executeConfirmed(action: PendingAction, actor: string | null): Promise<ToolOutcome> {
  const tool = BY_NAME.get(action.tool);
  if (!tool?.confirm) throw new Error(`Action inconnue : ${action.tool}.`);
  return tool.confirm.execute(action.input, actor);
}
