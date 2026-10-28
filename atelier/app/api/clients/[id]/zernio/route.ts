import { route } from "@/lib/server/http";
import { ensureZernioProfile } from "@/lib/server/services/clients";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ id: string }> };

/** Crée le profil Zernio du client s'il n'en a pas encore (Zernio branché après la création du client). */
export const POST = route<Ctx>(async (_req, { params }) => ensureZernioProfile((await params).id));
