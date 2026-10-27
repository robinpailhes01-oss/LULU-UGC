import { route, searchParams } from "@/lib/server/http";
import { getCleanupReport } from "@/lib/server/services/cleanup";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Rapport de ménage (doublons, quasi-doublons, photos floues, sombres…). ?fresh=1 relance l'analyse. */
export const GET = route(async (req) => {
  const fresh = searchParams(req).get("fresh");
  return getCleanupReport({ fresh: fresh === "1" || fresh === "true", maxAgeMs: 10_000 });
});
