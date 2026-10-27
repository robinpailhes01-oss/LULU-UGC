import type { RetouchParams } from "@/lib/shared/types";

/**
 * CONTRAT (fondation) — implémenté par le module Retouche.
 * Mathématiques de couleur communes à l'aperçu WebGL, à l'export serveur et aux montages.
 */
export const NEUTRAL_PARAMS: RetouchParams = {
  exposure: 0,
  contrast: 0,
  highlights: 0,
  shadows: 0,
  whites: 0,
  blacks: 0,
  temperature: 0,
  tint: 0,
  saturation: 0,
  vibrance: 0,
  fade: 0,
  vignette: 0,
  grain: 0,
  sharpen: 0,
  rotate: 0,
  flipH: false,
  straighten: 0,
  aspect: "original",
  crop: null,
};

export function withDefaults(p: Partial<RetouchParams> | null | undefined): RetouchParams {
  return { ...NEUTRAL_PARAMS, ...(p ?? {}) };
}

/**
 * Filtre SVG (feColorMatrix + feComponentTransfer) approchant le look, pour l'appliquer à des
 * vidéos/images dans une composition HTML (HyperFrames). Renvoie le markup <filter id=...>…</filter>.
 */
export function lookToSvgFilter(id: string, p: Partial<RetouchParams> | null | undefined): string {
  void id;
  void p;
  throw new Error("lookToSvgFilter : non implémenté");
}
