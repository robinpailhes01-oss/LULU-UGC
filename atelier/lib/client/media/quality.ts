/**
 * Traduction des mesures techniques (calculées à l'envoi) en mots simples pour l'interface.
 * Seuils indicatifs, calibrés sur des vignettes de 256 px de large.
 */

export type Tone = "good" | "warn" | "bad" | "neutral";

export interface Verdict {
  label: string;
  detail: string;
  tone: Tone;
  /** Position 0–1 sur une jauge. */
  level: number;
}

export function sharpnessVerdict(blurScore: number | null, lumaMean: number | null = null): Verdict | null {
  if (blurScore === null) return null;
  const level = Math.max(0, Math.min(1, Math.log10(Math.max(1, blurScore)) / 3.3));
  // Une image très sombre a peu de contraste : la mesure de netteté n'y est pas fiable.
  if (lumaMean !== null && lumaMean < 0.12) return { label: "Difficile à dire", detail: "Image trop sombre pour juger la netteté.", tone: "neutral", level };
  if (blurScore < 40) return { label: "Floue", detail: "Les contours sont mous : flou de bougé ou mise au point manquée.", tone: "bad", level };
  if (blurScore < 120) return { label: "Un peu douce", detail: "Acceptable en petit format, moins en plein écran.", tone: "warn", level };
  return { label: "Nette", detail: "Les détails sont bien définis.", tone: "good", level };
}

export function exposureVerdict(lumaMean: number | null, clipHigh: number | null, clipLow: number | null): Verdict | null {
  if (lumaMean === null) return null;
  const hi = clipHigh ?? 0;
  const lo = clipLow ?? 0;
  const pct = (v: number) => `${Math.round(v * 100)} %`;
  if (hi > 0.12) return { label: "Hautes lumières brûlées", detail: `${pct(hi)} de l'image est blanche, sans détail récupérable.`, tone: "bad", level: lumaMean };
  if (lo > 0.25) return { label: "Ombres bouchées", detail: `${pct(lo)} de l'image est noire, sans détail.`, tone: "bad", level: lumaMean };
  if (lumaMean < 0.22) return { label: "Sombre", detail: "Image sous-exposée : à éclaircir en retouche.", tone: "warn", level: lumaMean };
  if (lumaMean > 0.78) return { label: "Très claire", detail: "Image surexposée : à assombrir en retouche.", tone: "warn", level: lumaMean };
  if (hi > 0.04) return { label: "Équilibrée", detail: `Quelques zones très claires (${pct(hi)}).`, tone: "good", level: lumaMean };
  return { label: "Équilibrée", detail: "Lumière bien répartie, ni trop sombre ni trop claire.", tone: "good", level: lumaMean };
}
