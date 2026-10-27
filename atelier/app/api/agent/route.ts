import { z } from "zod";
import { getActor } from "@/lib/server/auth";
import { body, route } from "@/lib/server/http";
import { prepareTurn, runAgentTurn } from "@/lib/server/agent/loop";
import type { AgentStreamEvent } from "@/lib/shared/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 300;

const Id = z.string().max(100);
const Screen = z.object({
  page: z.string().max(80),
  folderId: Id.nullable().optional(),
  selectedAssetIds: z.array(Id).max(500).optional(),
  montageId: Id.nullable().optional(),
  postId: Id.nullable().optional(),
  skillSlug: z.string().max(80).nullable().optional(),
  /** Adresse de la page (complète le contexte quand l'écran ne le déclare pas). */
  path: z.string().max(300).optional(),
});

const Turn = z.object({
  threadId: z.string().uuid().nullable().optional(),
  message: z.string().max(8000).optional(),
  screen: Screen.nullable().optional(),
  actionId: z.string().uuid().nullable().optional(),
  retry: z.boolean().optional(),
});

/** Heartbeat : ligne de commentaire (ignorée par le lecteur NDJSON) si rien n'a été envoyé depuis 15 s. */
const HEARTBEAT_MS = 15_000;

/**
 * Envoie un message à l'agent et diffuse sa réponse en NDJSON (une ligne JSON par
 * AgentStreamEvent, envoyée dès qu'elle est prête). Les erreurs de préparation (clé absente,
 * conversation occupée…) restent des réponses JSON classiques.
 */
export const POST = route(async (req) => {
  const b = await body(req, Turn);
  const prep = await prepareTurn({ ...b, actor: await getActor() });

  const abort = new AbortController();
  req.signal?.addEventListener("abort", () => abort.abort(), { once: true });
  const encoder = new TextEncoder();
  let closed = false;
  let lastWrite = Date.now();
  let timer: ReturnType<typeof setInterval> | undefined;

  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      const write = (line: string) => {
        if (closed) return;
        try {
          controller.enqueue(encoder.encode(line));
          lastWrite = Date.now();
        } catch {
          closed = true; // navigateur parti : la boucle s'arrête proprement via abort
        }
      };
      timer = setInterval(() => {
        if (Date.now() - lastWrite >= HEARTBEAT_MS) write(": ping\n");
      }, 5_000);
      const emit = (e: AgentStreamEvent) => write(`${JSON.stringify(e)}\n`);
      void runAgentTurn(prep, emit, abort.signal).finally(() => {
        clearInterval(timer);
        if (!closed) {
          closed = true;
          try {
            controller.close();
          } catch {
            /* déjà fermé */
          }
        }
      });
    },
    cancel() {
      closed = true;
      clearInterval(timer);
      abort.abort();
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "application/x-ndjson; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      "X-Accel-Buffering": "no",
    },
  });
});
