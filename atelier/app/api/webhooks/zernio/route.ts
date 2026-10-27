import { NextResponse } from "next/server";
import { env } from "@/lib/server/env";
import { applyZernioEvent } from "@/lib/server/services/posts";
import { verifyZernioSignature } from "@/lib/server/zernio/client";
import { forgetEvent, linkEvent, recordEvent } from "@/lib/server/zernio/webhooks";
import type { ZWebhookEvent } from "@/lib/server/zernio/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function reply(status: number, code: string, message: string) {
  return NextResponse.json(status < 300 ? { ok: true, code, message } : { error: { code, message } }, { status });
}

/**
 * Webhook Zernio (route publique, voir middleware) : post.scheduled / published / partial / failed,
 * post.platform.*, post.tiktok.url_resolved…
 * - signature X-Zernio-Signature (HMAC-SHA256 hexadécimal du corps brut, ZERNIO_WEBHOOK_SECRET) ;
 * - sans secret configuré : refusé en production (503), accepté en développement ;
 * - dédoublonnage sur l'identifiant de l'événement ; réponse rapide (Zernio attend < 5 s).
 */
export async function POST(req: Request): Promise<Response> {
  const raw = await req.text();
  const secret = env.zernio.webhookSecret;
  if (!secret) {
    if (env.isProd) return reply(503, "not_configured", "Webhook Zernio non configuré : définissez ZERNIO_WEBHOOK_SECRET.");
  } else if (!verifyZernioSignature(raw, req.headers.get("x-zernio-signature") ?? req.headers.get("x-late-signature"), secret)) {
    return reply(401, "invalid_signature", "Signature du webhook invalide.");
  }

  let evt: ZWebhookEvent;
  try {
    evt = JSON.parse(raw) as ZWebhookEvent;
  } catch {
    return reply(400, "invalid_json", "Corps JSON attendu.");
  }
  const eventId = evt?.id || req.headers.get("x-zernio-event-id") || req.headers.get("x-late-event-id");
  if (!evt || typeof evt.event !== "string" || !eventId) return reply(400, "invalid_event", "Événement Zernio incomplet (id, event).");
  if (evt.event === "webhook.test" || evt.test) return reply(200, "test", "Webhook de test reçu.");

  const fresh = await recordEvent(evt, eventId);
  if (!fresh) return reply(200, "duplicate", "Événement déjà traité.");
  try {
    const { postId, status } = await applyZernioEvent(evt);
    if (postId) await linkEvent(eventId, postId);
    return reply(200, postId ? "applied" : "ignored", postId ? `Publication mise à jour (${status}).` : "Aucune publication de l'Atelier ne correspond.");
  } catch (err) {
    console.error("[atelier] webhook Zernio", err instanceof Error ? err.message : err);
    // Zernio relivrera l'événement : on l'oublie pour pouvoir le traiter à la prochaine tentative.
    await forgetEvent(eventId).catch(() => undefined);
    return reply(500, "server_error", "Traitement du webhook impossible, il sera relivré.");
  }
}
