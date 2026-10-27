import { getActor } from "@/lib/server/auth";
import { route } from "@/lib/server/http";
import { listThreads } from "@/lib/server/agent/store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Conversations récentes (les miennes d'abord). */
export const GET = route(async () => ({ threads: await listThreads(await getActor()) }));
