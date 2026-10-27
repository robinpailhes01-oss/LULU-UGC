import { route } from "@/lib/server/http";
import { suggestAutoParams } from "@/lib/server/services/retouch";

export const runtime = "nodejs";
export const maxDuration = 60;

type Ctx = { params: Promise<{ id: string }> };

/** Réglages proposés d'après l'histogramme de la photo (exposition, contraste, blancs, noirs, balance). */
export const POST = route<Ctx>(async (_req, { params }) => ({ params: await suggestAutoParams((await params).id) }));
