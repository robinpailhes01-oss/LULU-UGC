import { getActor } from "@/lib/server/auth";
import { requestClientFilter } from "@/lib/server/client-scope";
import { route } from "@/lib/server/http";
import { listThreads } from "@/lib/server/agent/store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Conversations récentes du client courant (les miennes d'abord) ; ?client=all|<id>. */
export const GET = route(async (req) => ({ threads: await listThreads(await getActor(), 60, await requestClientFilter(req)) }));
