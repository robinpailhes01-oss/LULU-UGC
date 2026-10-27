import "server-only";
import type { CleanupReport } from "@/lib/shared/types";

/**
 * CONTRAT (fondation) — implémenté par le module Pilotage (ménage).
 * Analyse toute la médiathèque (hors corbeille) à partir des mesures enregistrées à l'envoi
 * (sha256, dhash, netteté, exposition, résolution, durée) et propose des groupes à nettoyer.
 */
export async function buildCleanupReport(): Promise<CleanupReport> {
  throw new Error("buildCleanupReport : non implémenté");
}
