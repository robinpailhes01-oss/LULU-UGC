/**
 * Manipulation du cadre de recadrage (coordonnées normalisées 0–1 dans le cadre redressé).
 * Les rapports sont exprimés en pixels (largeur / hauteur) : on convertit avec la taille du cadre.
 */
import type { CropRect } from "@/lib/shared/types";

export type CropHandle = "move" | "n" | "s" | "e" | "w" | "ne" | "nw" | "se" | "sw";

const MIN = 0.05;
const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));

/**
 * Nouveau cadre après un glissement (dx, dy normalisés) depuis `start` avec la poignée `handle`.
 * `ratio` (px) verrouille les proportions ; null = libre.
 */
export function dragCrop(start: CropRect, handle: CropHandle, dx: number, dy: number, ratio: number | null, frameW: number, frameH: number): CropRect {
  if (handle === "move") {
    return { ...start, x: clamp(start.x + dx, 0, 1 - start.w), y: clamp(start.y + dy, 0, 1 - start.h) };
  }
  // Rapport en unités normalisées : w_n / h_n = ratio * frameH / frameW.
  const rn = ratio ? (ratio * frameH) / frameW : null;
  let left = start.x;
  let top = start.y;
  let right = start.x + start.w;
  let bottom = start.y + start.h;
  const hasW = handle.includes("w");
  const hasE = handle.includes("e");
  const hasN = handle.includes("n");
  const hasS = handle.includes("s");
  if (hasW) left = clamp(left + dx, 0, right - MIN);
  if (hasE) right = clamp(right + dx, left + MIN, 1);
  if (hasN) top = clamp(top + dy, 0, bottom - MIN);
  if (hasS) bottom = clamp(bottom + dy, top + MIN, 1);
  if (!rn) return { x: left, y: top, w: right - left, h: bottom - top };

  // Proportions verrouillées : la dimension « tirée » pilote l'autre, ancrée sur le côté opposé
  // (ou le centre pour une poignée de bord).
  let w = right - left;
  let h = bottom - top;
  const corner = (hasW || hasE) && (hasN || hasS);
  if (corner) {
    // Garde la plus grande des deux propositions pour suivre le pointeur naturellement.
    if (w / rn >= h) h = w / rn;
    else w = h * rn;
  } else if (hasW || hasE) h = w / rn;
  else w = h * rn;

  // Ancrage.
  const ax = hasW ? start.x + start.w : hasE ? start.x : start.x + start.w / 2;
  const ay = hasN ? start.y + start.h : hasS ? start.y : start.y + start.h / 2;
  // Limites disponibles depuis l'ancre.
  const maxW = hasW ? ax : hasE ? 1 - ax : 2 * Math.min(ax, 1 - ax);
  const maxH = hasN ? ay : hasS ? 1 - ay : 2 * Math.min(ay, 1 - ay);
  const k = Math.min(1, maxW / w, maxH / h);
  w *= k;
  h *= k;
  if (w < MIN || h < MIN) {
    const g = Math.max(MIN / w, MIN / h);
    w *= g;
    h *= g;
  }
  const x = hasW ? ax - w : hasE ? ax : ax - w / 2;
  const y = hasN ? ay - h : hasS ? ay : ay - h / 2;
  return { x: clamp(x, 0, 1 - w), y: clamp(y, 0, 1 - h), w: Math.min(w, 1), h: Math.min(h, 1) };
}

/** Déplacement / redimensionnement au clavier (pas en fraction du cadre). */
export function nudgeCrop(start: CropRect, key: string, resize: boolean, step: number, ratio: number | null, frameW: number, frameH: number): CropRect | null {
  const dx = key === "ArrowLeft" ? -step : key === "ArrowRight" ? step : 0;
  const dy = key === "ArrowUp" ? -step : key === "ArrowDown" ? step : 0;
  if (!dx && !dy) return null;
  if (!resize) return dragCrop(start, "move", dx, dy, ratio, frameW, frameH);
  return dragCrop(start, dx ? "e" : "s", dx, dy, ratio, frameW, frameH);
}
