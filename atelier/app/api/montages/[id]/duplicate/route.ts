import { getActor } from "@/lib/server/auth";
import { route } from "@/lib/server/http";
import { duplicateMontage } from "@/lib/server/services/montages";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ id: string }> };

/** Copie du montage (sans son rendu). */
export const POST = route<Ctx>(async (_req, { params }) => duplicateMontage((await params).id, await getActor()));
