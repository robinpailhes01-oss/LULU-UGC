import { getActor } from "@/lib/server/auth";
import { env } from "@/lib/server/env";
import { route } from "@/lib/server/http";
import { getStore } from "@/lib/server/storage";
import { setupRenderSandbox } from "@/lib/server/services/montages";
import { getSnapshotInfo } from "@/lib/server/montage/render/sandbox";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
/** La préparation de l'instantané (Chrome, FFmpeg, HyperFrames) prend plusieurs minutes. */
export const maxDuration = 800;

/** Moteur de rendu configuré et état de préparation (pour l'éditeur et les réglages). */
export const GET = route(async () => {
  const provider = env.hyperframes.render;
  const storage = getStore().kind;
  const snapshot = provider === "sandbox" ? await getSnapshotInfo().catch(() => null) : null;
  const ready = provider === "local" || (provider === "heygen" && Boolean(env.hyperframes.heygenApiKey) && storage === "s3") || (provider === "sandbox" && Boolean(snapshot) && storage === "s3");
  return { provider, storage, ready, snapshot };
});

/** Rendu Sandbox seulement : crée l'instantané de rendu (à refaire après une mise à jour de HyperFrames). */
export const POST = route(async () => setupRenderSandbox(await getActor()));
