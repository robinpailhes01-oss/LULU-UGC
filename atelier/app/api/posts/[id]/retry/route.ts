import { getActor } from "@/lib/server/auth";
import { route } from "@/lib/server/http";
import { retryPost } from "@/lib/server/services/posts";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 120;

type Ctx = { params: Promise<{ id: string }> };

/** Relance chez Zernio les comptes en échec. */
export const POST = route<Ctx>(async (_req, { params }) => retryPost((await params).id, await getActor()));
