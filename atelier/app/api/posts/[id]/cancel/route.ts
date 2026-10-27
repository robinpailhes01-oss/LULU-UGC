import { getActor } from "@/lib/server/auth";
import { route } from "@/lib/server/http";
import { cancelPost } from "@/lib/server/services/posts";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ id: string }> };

/** Retire la publication de Zernio et la garde en brouillon (date conservée). */
export const POST = route<Ctx>(async (_req, { params }) => cancelPost((await params).id, await getActor()));
