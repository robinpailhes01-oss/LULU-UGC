import { z } from "zod";
import { getActor } from "@/lib/server/auth";
import { body, HttpError, notFound, route } from "@/lib/server/http";
import { logActivity } from "@/lib/server/repo/activity";
import { serviceErrorMessage } from "@/lib/server/agent/errors";
import { claimPendingAction, getPendingAction, isExpired, presentAction, resolvePendingAction } from "@/lib/server/agent/store";
import { executeConfirmed } from "@/lib/server/agent/tools";
import type { RefreshScope } from "@/lib/shared/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 300;

type Ctx = { params: Promise<{ id: string }> };

const Decision = z.object({ decision: z.enum(["confirm", "cancel"]) });

const isUuid = (s: string) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(s);

/**
 * Confirme ou annule une action proposée par l'agent (corbeille, programmation, annulation de
 * publication). L'action s'exécute ici, côté serveur, avec l'entrée enregistrée à la proposition.
 * Réponse : { action, refresh } ; l'interface envoie ensuite « J'ai confirmé : … » à l'agent.
 */
export const GET = route<Ctx>(async (_req, { params }) => {
  const { id } = await params;
  const action = isUuid(id) ? await getPendingAction(id) : null;
  if (!action) throw notFound("Action");
  return presentAction(action);
});

export const POST = route<Ctx>(async (req, { params }) => {
  const { id } = await params;
  const { decision } = await body(req, Decision);
  const actor = await getActor();
  const action = isUuid(id) ? await getPendingAction(id) : null;
  if (!action) throw notFound("Action");
  if (action.status !== "pending" || action.resolvedAt) throw new HttpError(409, "already_resolved", "Cette action a déjà été traitée.");
  if (isExpired(action)) {
    await resolvePendingAction(id, "cancelled", { expired: true, message: "Demande expirée (plus de 24 h)." });
    throw new HttpError(410, "expired", "Cette demande a expiré (plus de 24 h) : redemandez-la à l'agent.");
  }
  const claimed = await claimPendingAction(id, actor);
  if (!claimed) throw new HttpError(409, "already_resolved", "Cette action a déjà été traitée.");

  if (decision === "cancel") {
    const updated = await resolvePendingAction(id, "cancelled", { cancelledBy: actor });
    await logActivity({ actor, verb: "a annulé une action proposée par l'agent", objectType: "thread", objectId: action.threadId, summary: action.summary });
    return { action: updated, refresh: [] as RefreshScope[] };
  }

  try {
    const outcome = await executeConfirmed(claimed, actor);
    const updated = await resolvePendingAction(id, "executed", { summary: outcome.summary, data: outcome.data ?? null, assetIds: outcome.assetIds ?? [] });
    await logActivity({ actor, verb: "a confirmé une action de l'agent", objectType: "thread", objectId: action.threadId, summary: `${action.summary} — ${outcome.summary}` });
    return { action: updated, refresh: outcome.refresh ?? [] };
  } catch (err) {
    const message = serviceErrorMessage(err);
    const updated = await resolvePendingAction(id, "failed", { error: message });
    await logActivity({ actor, verb: "a confirmé une action de l'agent (échec)", objectType: "thread", objectId: action.threadId, summary: `${action.summary} — ${message}` });
    return { action: updated, refresh: [] as RefreshScope[] };
  }
});
