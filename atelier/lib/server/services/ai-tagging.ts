import "server-only";
import type { Asset } from "@/lib/shared/types";

/**
 * CONTRAT (fondation) — implémenté par le module Agent.
 * Analyse des médias avec Claude (vision) : titre, description, mots-clés, univers, qualité,
 * texte alternatif, idée de légende, dossier suggéré. Écrit `ai` et fusionne les mots-clés.
 */
export async function analyzeAssets(assetIds: string[], actor: string | null, opts?: { force?: boolean }): Promise<{ analyzed: Asset[]; skipped: string[]; errors: { id: string; message: string }[] }> {
  void assetIds;
  void actor;
  void opts;
  throw new Error("analyzeAssets : non implémenté");
}

/** Propose 3 légendes Instagram dans la voix June pour des médias donnés. */
export async function suggestCaptions(input: { assetIds: string[]; brief?: string; platform?: string }): Promise<string[]> {
  void input;
  throw new Error("suggestCaptions : non implémenté");
}
