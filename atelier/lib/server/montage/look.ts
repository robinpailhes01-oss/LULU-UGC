/**
 * Look de retouche appliqué à tous les plans d'un montage.
 *
 * Le filtre SVG de lib/shared/look.ts (lookToSvgFilter : courbe de tons + matrice couleur, mêmes
 * mathématiques que la retouche, color-interpolation-filters="sRGB") est placé dans un <svg>
 * invisible et référencé en CSS par `filter: url(#atelier-look)` sur l'enveloppe de chaque plan
 * (jamais sur l'élément minuté lui-même). Le vignettage, qu'un filtre de couleur ne sait pas
 * faire, est un calque en dégradé radial au-dessus des plans. Le grain et la netteté ne sont pas
 * reproduits en vidéo.
 */
import { lookToSvgFilter } from "@/lib/shared/look";
import type { RetouchParams } from "@/lib/shared/types";

export const LOOK_FILTER_ID = "atelier-look";

export interface LookMarkup {
  /** Bloc <svg> invisible contenant le <filter>, ou null sans réglage de couleur. */
  svg: string | null;
  /** Valeur CSS de `filter` pour l'enveloppe des plans. */
  filterCss: string | null;
  /** Intensité du vignettage 0–1 (0 = aucun). */
  vignette: number;
  /** Raison pour laquelle le look n'a pas pu être appliqué (réglages illisibles). */
  error: string | null;
}

const COLOR_KEYS: (keyof RetouchParams)[] = ["exposure", "contrast", "highlights", "shadows", "whites", "blacks", "temperature", "tint", "saturation", "vibrance", "fade"];

export function hasColorAdjustments(p: Partial<RetouchParams> | null | undefined): boolean {
  if (!p) return false;
  return COLOR_KEYS.some((k) => typeof p[k] === "number" && Math.abs(p[k] as number) > 0.001);
}

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));

/** Balisage du look : filtre SVG des réglages de couleur, plus le vignettage. */
export function lookMarkup(params: Partial<RetouchParams> | null | undefined): LookMarkup {
  const vignette = params && typeof params.vignette === "number" && Number.isFinite(params.vignette) ? clamp(params.vignette / 100, 0, 1) : 0;
  if (!hasColorAdjustments(params)) return { svg: null, filterCss: null, vignette, error: null };
  try {
    const filter = lookToSvgFilter(LOOK_FILTER_ID, params);
    return {
      svg: `<svg width="0" height="0" style="position:absolute;width:0;height:0" aria-hidden="true" focusable="false"><defs>${filter}</defs></svg>`,
      filterCss: `url(#${LOOK_FILTER_ID})`,
      vignette,
      error: null,
    };
  } catch (err) {
    // Réglages inattendus (look abîmé) : le montage reste lisible, sans correction de couleur.
    return { svg: null, filterCss: null, vignette, error: err instanceof Error ? err.message : String(err) };
  }
}
