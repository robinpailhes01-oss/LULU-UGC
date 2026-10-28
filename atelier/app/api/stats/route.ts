import { requestClientFilter } from "@/lib/server/client-scope";
import { route } from "@/lib/server/http";
import { getDashboardStats } from "@/lib/server/services/stats";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Chiffres et listes du tableau de bord (DashboardStats). */
export const GET = route(async (req) => getDashboardStats(await requestClientFilter(req)));
