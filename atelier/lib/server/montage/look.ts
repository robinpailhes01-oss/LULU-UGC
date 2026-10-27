/**
 * Look de retouche appliqué à tous les plans d'un montage.
 *
 * Voie principale : le filtre SVG de lib/shared/look.ts (lookToSvgFilter, mêmes mathématiques que
 * la retouche), référencé en CSS par `filter: url(#atelier-look)` sur l'enveloppe de chaque plan.
 * Si ce filtre n'est pas disponible (ou échoue), on retombe sur un filtre CSS équivalent
 * (luminosité, contraste, saturation, sépia) dérivé des mêmes réglages. Le vignettage, qu'un
 * filtre de couleur ne sait pas faire, est un calque en dégradé radial au-dessus des plans.
 */
import { lookToSvgFilter, withDefaults } from "@/lib/shared/look";
import type { RetouchParams } from "@/lib/shared/types";

export const LOOK_FILTER_ID = "atelier-look";

export interface LookMarkup {
  mode: "svg" | "css" | "none";
  /** Bloc <svg> invisible contenant le <filter> (mode svg). */
  svg: string | null;
  /** Valeur CSS de `filter` pour l'enveloppe des plans. */
  filterCss: string | null;
  /** Intensité du vignettage 0–1 (0 = aucun). */
  vignette: number;
}

const COLOR_KEYS: (keyof RetouchParams)[] = ["exposure", "contrast", "highlights", "shadows", "whites", "blacks", "temperature", "tint", "saturation", "vibrance", "fade"];

export function hasColorAdjustments(p: Partial<RetouchParams> | null | undefined): boolean {
  if (!p) return false;
  return COLOR_KEYS.some((k) => typeof p[k] === "number" && Math.abs(p[k] as number) > 0.001);
}

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));
const f3 = (n: number) => Number(n.toFixed(3));

/** Approximation CSS du look (repli quand le filtre SVG n'est pas disponible). */
export function cssFilterFromLook(input: Partial<RetouchParams> | null | undefined): string | null {
  if (!hasColorAdjustments(input)) return null;
  const p = withDefaults(input);
  let brightness = 1 + p.exposure * 0.32 + (p.shadows + p.highlights) / 900 + (p.whites + p.blacks) / 1200 + p.fade / 600;
  let contrast = 1 + p.contrast / 200 + (p.highlights - p.shadows) / 1000 + (p.whites - p.blacks) / 900 - p.fade / 260;
  let saturate = 1 + p.saturation / 100 + p.vibrance / 220;
  const warm = p.temperature > 0 ? p.temperature / 100 : 0;
  const sepia = clamp(warm * 0.35 + Math.max(0, p.tint) / 1000, 0, 0.6);
  // Le sépia désature : on compense un peu pour garder la couleur.
  saturate += sepia * 0.4;
  if (p.temperature < 0) {
    // Pas de vraie balance froide en CSS : on éclaircit et on désature légèrement.
    brightness += -p.temperature / 1500;
    saturate -= -p.temperature / 600;
  }
  brightness = clamp(brightness, 0.4, 1.8);
  contrast = clamp(contrast, 0.4, 1.8);
  saturate = clamp(saturate, 0, 2.5);
  const parts: string[] = [];
  if (Math.abs(brightness - 1) > 0.004) parts.push(`brightness(${f3(brightness)})`);
  if (Math.abs(contrast - 1) > 0.004) parts.push(`contrast(${f3(contrast)})`);
  if (Math.abs(saturate - 1) > 0.004) parts.push(`saturate(${f3(saturate)})`);
  if (sepia > 0.004) parts.push(`sepia(${f3(sepia)})`);
  return parts.length ? parts.join(" ") : null;
}

/** Balisage du look : filtre SVG si disponible, sinon filtre CSS ; plus le vignettage. */
export function lookMarkup(params: Partial<RetouchParams> | null | undefined): LookMarkup {
  const vignette = params && typeof params.vignette === "number" ? clamp(params.vignette / 100, 0, 1) : 0;
  if (!hasColorAdjustments(params)) return { mode: "none", svg: null, filterCss: null, vignette };
  try {
    const filter = lookToSvgFilter(LOOK_FILTER_ID, params);
    if (typeof filter === "string" && filter.includes("<filter")) {
      return {
        mode: "svg",
        svg: `<svg width="0" height="0" style="position:absolute;width:0;height:0" aria-hidden="true" focusable="false"><defs>${filter}</defs></svg>`,
        filterCss: `url(#${LOOK_FILTER_ID})`,
        vignette,
      };
    }
  } catch {
    // Filtre SVG indisponible : repli CSS ci-dessous.
  }
  const css = cssFilterFromLook(params);
  return { mode: css ? "css" : "none", svg: null, filterCss: css, vignette };
}
