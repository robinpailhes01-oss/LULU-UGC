import "server-only";
import type { Asset, RetouchParams } from "@/lib/shared/types";

/**
 * CONTRAT (fondation) — implémenté par le module Retouche.
 * Exporte une version retouchée d'une photo (rendu pleine résolution côté serveur avec les mêmes
 * calculs que l'aperçu WebGL, lib/shared/look.ts). Crée un nouveau média (source « retouch »,
 * parentAssetId = original) dans le même dossier, sauf si `replace` est demandé.
 */
export interface RetouchExportOptions {
  /** Nom du fichier produit (par défaut « <nom> (retouche).jpg »). */
  name?: string;
  format?: "jpeg" | "webp" | "png";
  quality?: number; // 1–100, défaut 90
  /** Taille maximale du plus grand côté (ex. 2160) ; défaut : pleine résolution. */
  maxSize?: number | null;
  folderId?: string | null;
}

export async function exportRetouch(assetId: string, params: Partial<RetouchParams>, opts: RetouchExportOptions, actor: string | null): Promise<Asset> {
  void assetId;
  void params;
  void opts;
  void actor;
  throw new Error("exportRetouch : non implémenté");
}

/** Propose des réglages pour une photo (analyse d'histogramme côté serveur, sans IA). */
export async function suggestAutoParams(assetId: string): Promise<Partial<RetouchParams>> {
  void assetId;
  throw new Error("suggestAutoParams : non implémenté");
}
