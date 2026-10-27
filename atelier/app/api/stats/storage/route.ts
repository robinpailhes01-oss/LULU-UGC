import { route } from "@/lib/server/http";
import { storageTotals } from "@/lib/server/repo/assets";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export const GET = route(async () => storageTotals());
