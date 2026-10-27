import { getActor } from "@/lib/server/auth";
import { route } from "@/lib/server/http";
import { cancelRender, refreshRender, startRender } from "@/lib/server/services/montages";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
/** Le démarrage d'une Sandbox ou l'envoi à HeyGen peut prendre quelques secondes. */
export const maxDuration = 120;

type Ctx = { params: Promise<{ id: string }> };

/** Lance le rendu MP4 (répond tout de suite ; suivre l'avancement avec GET). */
export const POST = route<Ctx>(async (_req, { params }) => ({ render: await startRender((await params).id, await getActor()) }));

/** État à jour du rendu : interroge le moteur et, à la fin, ajoute la vidéo à la médiathèque. */
export const GET = route<Ctx>(async (_req, { params }) => refreshRender((await params).id));

/** Annule le rendu en cours. */
export const DELETE = route<Ctx>(async (_req, { params }) => cancelRender((await params).id, await getActor()));
