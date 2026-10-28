import { requestClientFilter } from "@/lib/server/client-scope";
import { route, searchParams } from "@/lib/server/http";
import { listActivity } from "@/lib/server/repo/activity";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export const GET = route(async (req) => ({ items: await listActivity(Math.min(Number(searchParams(req).get("limit") ?? 30), 200), await requestClientFilter(req)) }));
