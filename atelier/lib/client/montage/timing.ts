/**
 * Calcul du déroulé d'un montage : position de chaque plan, chevauchement des transitions,
 * carte de fin, durée totale, et correspondance avec la structure type du style.
 *
 * Module ISOMORPHE (pur, sans "use client" ni "server-only") : la timeline de l'éditeur et la
 * composition HyperFrames générée côté serveur utilisent exactement ces mêmes calculs.
 */
import type { MontageClip, MontageFormat, MontageSpec, MontageText } from "@/lib/shared/types";
import type { StructureStep } from "@/lib/client/montage/style";

export const FORMAT_SIZE: Record<MontageFormat, { width: number; height: number }> = {
  "9:16": { width: 1080, height: 1920 },
  "4:5": { width: 1080, height: 1350 },
  "1:1": { width: 1080, height: 1080 },
  "16:9": { width: 1920, height: 1080 },
};

/** Zones sûres (px) : rien d'important hors de ce cadre (interface Instagram/TikTok). */
export const SAFE_AREA: Record<MontageFormat, { top: number; bottom: number; x: number }> = {
  "9:16": { top: 220, bottom: 380, x: 96 },
  "4:5": { top: 108, bottom: 108, x: 90 },
  "1:1": { top: 90, bottom: 90, x: 90 },
  "16:9": { top: 80, bottom: 90, x: 160 },
};

export const MIN_CLIP_S = 0.2;
const r3 = (n: number) => Math.round(n * 1000) / 1000;

export function clipDuration(c: Pick<MontageClip, "inS" | "outS">): number {
  return r3(Math.max(MIN_CLIP_S, c.outS - c.inS));
}

export interface ClipTiming {
  id: string;
  index: number;
  startS: number;
  durationS: number;
  endS: number;
  /** Chevauchement avec le plan précédent (durée de la transition d'entrée). */
  overlapS: number;
}

export interface MontageTiming {
  clips: ClipTiming[];
  clipsEndS: number;
  endCard: { startS: number; durationS: number; overlapS: number } | null;
  durationS: number;
  /** Durée de transition demandée (0 pour une coupe franche). */
  transitionS: number;
}

/**
 * Les plans se suivent ; avec une transition (fondu, glissé, zoom), chaque plan commence
 * `transitionS` avant la fin du précédent (limité à la moitié du plus court des deux).
 * Durée totale = somme des plans − chevauchements + carte de fin (qui chevauche aussi).
 */
export function computeTiming(spec: Pick<MontageSpec, "clips" | "transition" | "transitionS" | "endCard" | "texts">): MontageTiming {
  const tr = spec.transition === "cut" ? 0 : Math.max(0, Number(spec.transitionS) || 0);
  const clips: ClipTiming[] = [];
  let prev: ClipTiming | null = null;
  spec.clips.forEach((c, index) => {
    const durationS = clipDuration(c);
    const overlapS = prev && tr > 0 ? r3(Math.min(tr, prev.durationS / 2, durationS / 2)) : 0;
    const startS = prev ? r3(prev.endS - overlapS) : 0;
    const t: ClipTiming = { id: c.id, index, startS, durationS, endS: r3(startS + durationS), overlapS };
    clips.push(t);
    prev = t;
  });
  const clipsEndS = clips.length ? clips[clips.length - 1].endS : 0;
  let endCard: MontageTiming["endCard"] = null;
  if (spec.endCard && spec.endCard.durationS > 0) {
    const ec = Math.max(0.5, spec.endCard.durationS);
    const last = clips[clips.length - 1];
    const overlapS = last && tr > 0 ? r3(Math.min(tr, last.durationS / 2, ec / 2)) : 0;
    endCard = { startS: r3(clipsEndS - overlapS), durationS: r3(ec), overlapS };
  }
  let durationS = endCard ? r3(endCard.startS + endCard.durationS) : clipsEndS;
  if (durationS <= 0) {
    // Montage vide : une durée minimale pour que l'aperçu affiche quand même les textes.
    const textsEnd = Math.max(0, ...spec.texts.map((t) => t.endS));
    durationS = r3(Math.max(3, textsEnd));
  }
  return { clips, clipsEndS, endCard, durationS, transitionS: tr };
}

/** Fenêtre d'affichage d'un texte, ramenée dans la durée du montage. */
export function textWindow(t: Pick<MontageText, "startS" | "endS">, durationS: number): { startS: number; durationS: number } | null {
  const start = Math.max(0, Math.min(t.startS, durationS - 0.1));
  const end = Math.min(durationS, Math.max(t.endS, start + 0.1));
  if (!(end > start) || t.startS >= durationS) return null;
  return { startS: r3(start), durationS: r3(end - start) };
}

/** Plan visible à un instant donné (le plus récent en cas de chevauchement). */
export function clipAt(timing: MontageTiming, t: number): ClipTiming | null {
  let found: ClipTiming | null = null;
  for (const c of timing.clips) if (t >= c.startS && t < c.endS) found = c;
  return found;
}

export interface RoleAssignment extends StructureStep {
  index: number;
  /** Fenêtre de la timeline où ce rôle est attendu (structure ramenée à la durée des plans). */
  fromS: number;
  toS: number;
  clipIds: string[];
}

/**
 * Associe les plans aux rôles de la structure type du style (accroche, arrivée, détails…) :
 * la structure est étirée sur la durée réelle des plans ; un plan remplit un rôle s'il en couvre
 * une part suffisante (un plan long peut en remplir deux). Sert de guide (liste à cocher) dans
 * l'éditeur et pour l'agent.
 */
export function assignRoles(structure: StructureStep[], timing: MontageTiming): RoleAssignment[] {
  if (structure.length === 0) return [];
  const known = structure.filter((s) => typeof s.durationS === "number" && s.durationS > 0);
  const avg = known.length ? known.reduce((a, s) => a + (s.durationS as number), 0) / known.length : 1;
  const weights = structure.map((s) => (typeof s.durationS === "number" && s.durationS > 0 ? s.durationS : avg));
  const total = weights.reduce((a, b) => a + b, 0) || 1;
  const span = timing.clipsEndS > 0 ? timing.clipsEndS : total;
  let acc = 0;
  const roles: RoleAssignment[] = structure.map((s, index) => {
    const fromS = r3((acc / total) * span);
    acc += weights[index];
    const toS = r3((acc / total) * span);
    return { ...s, index, fromS, toS, clipIds: [] };
  });
  for (const r of roles) {
    const need = Math.min(0.6, 0.4 * (r.toS - r.fromS));
    for (const c of timing.clips) {
      const overlap = Math.min(c.endS, r.toS) - Math.max(c.startS, r.fromS);
      if (overlap >= need && overlap > 0) r.clipIds.push(c.id);
    }
  }
  return roles;
}
