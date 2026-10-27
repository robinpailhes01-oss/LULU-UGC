import "server-only";
import { env } from "@/lib/server/env";
import { notConfigured, HttpError } from "@/lib/server/http";
import { claimRenderCompletion, selectMontage } from "@/lib/server/montage/repo";
import { completeRender, failRender, nowIso, posterFromImage, reportProgress } from "@/lib/server/montage/render/common";
import { createHeygenClient, HeygenError, type HeygenClient } from "@/lib/server/montage/render/heygen-client";
import type { Montage, RenderState } from "@/lib/shared/types";

/**
 * Rendu chez HeyGen (HyperFrames Cloud Render, API REST v3) — solution de repli quand la Sandbox
 * Vercel n'est pas disponible. Nécessite HEYGEN_API_KEY (droits hyperframes:read/write, crédits
 * API) et un stockage S3/R2 : HeyGen télécharge les médias par des liens HTTPS signés.
 * HEYGEN_API_BASE_URL permet de viser un autre hôte (tests).
 */

export function heygenClient(): HeygenClient {
  const apiKey = env.hyperframes.heygenApiKey;
  if (!apiKey) throw notConfigured("Rendu HeyGen : définissez HEYGEN_API_KEY (clé API HeyGen avec les droits HyperFrames).");
  return createHeygenClient({ apiKey, baseUrl: process.env.HEYGEN_API_BASE_URL?.trim() || undefined });
}

export function heygenAspect(format: Montage["spec"]["format"]): "9:16" | "16:9" | "1:1" {
  if (format === "4:5") throw new HttpError(422, "unsupported_format", "HeyGen ne rend pas le format 4:5 : choisissez 9:16, 1:1 ou 16:9, ou utilisez le rendu Sandbox.");
  return format;
}

/** Envoie la composition à HeyGen ; renvoie l'identifiant du rendu (jobId). */
export async function startHeygenRender(montage: Montage, remoteHtml: string, jobId: string): Promise<string> {
  const client = heygenClient();
  try {
    return await client.submit({ html: remoteHtml, jobId, fps: montage.spec.fps, aspectRatio: heygenAspect(montage.spec.format), title: montage.title });
  } catch (err) {
    if (err instanceof HeygenError) throw new HttpError(502, "heygen_error", `HeyGen a refusé le rendu (${err.code}) : ${err.message}`);
    throw err;
  }
}

/** Interroge HeyGen ; à la fin, récupère la vidéo et l'ajoute à la médiathèque. */
export async function pollHeygenRender(montage: Montage): Promise<Montage> {
  const state = montage.render as RenderState;
  if (!state.jobId) return montage;
  const client = heygenClient();
  let r;
  try {
    r = await client.get(state.jobId);
  } catch (err) {
    if (err instanceof HeygenError && err.status === 404) return (await failRender(montage.id, state, "HeyGen ne retrouve plus ce rendu.")) ?? montage;
    // Erreur passagère : on garde l'état et on réessaiera au prochain appel.
    return montage;
  }
  if (r.status === "queued" || r.status === "rendering") {
    const next: RenderState = { ...state, progress: r.status === "queued" ? 0.05 : Math.max(state.progress ?? 0.1, 0.1), message: r.status === "queued" ? "En file d'attente chez HeyGen…" : "Rendu en cours chez HeyGen…" };
    await reportProgress(montage, next, true);
    return (await selectMontage(montage.id)) ?? montage;
  }
  if (r.status === "failed") return (await failRender(montage.id, state, `HeyGen n'a pas pu rendre la vidéo : ${r.failure_message ?? r.failure_code ?? "raison inconnue"}`)) ?? montage;
  if (r.status !== "completed" || !r.video_url) return montage;
  if (!(await claimRenderCompletion(montage.id, state.jobId))) return (await selectMontage(montage.id)) ?? montage;
  try {
    const res = await fetch(r.video_url);
    if (!res.ok) throw new Error(`téléchargement de la vidéo impossible (HTTP ${res.status})`);
    const video = Buffer.from(await res.arrayBuffer());
    let poster = null;
    if (r.thumbnail_url) {
      const t = await fetch(r.thumbnail_url).catch(() => null);
      if (t?.ok) poster = await posterFromImage(Buffer.from(await t.arrayBuffer())).catch(() => null);
    }
    const done = await completeRender(montage.id, { ...state, message: "Enregistrement dans la médiathèque…" }, { buffer: video }, { actor: null, poster, durationS: r.duration ?? null });
    return done ?? (await selectMontage(montage.id)) ?? montage;
  } catch (err) {
    return (await failRender(montage.id, { ...state, finishedAt: nowIso() }, `Vidéo HeyGen non récupérée : ${err instanceof Error ? err.message : String(err)}`)) ?? montage;
  }
}

export async function cancelHeygenRender(montage: Montage): Promise<void> {
  if (!montage.render?.jobId || !env.hyperframes.heygenApiKey) return;
  await heygenClient().cancel(montage.render.jobId);
}
