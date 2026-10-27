import type { MontageFormat, MontageStyleData, MontageTransition } from "@/lib/shared/types";

/**
 * Aides pour le formulaire d'un style de montage (MontageStyleData) : bornes, libellés,
 * validation avec des messages en français clair, résumé d'une ligne pour les cartes.
 */

export const LIMITS = {
  /** Durées de plans, de montage, de carton final. */
  duration: { min: 0.2, max: 120 },
  transition: { min: 0, max: 3 },
  fadeOut: { min: 0, max: 10 },
  volume: { min: 0, max: 1 },
} as const;

export const FORMATS: { id: MontageFormat; label: string; hint: string }[] = [
  { id: "9:16", label: "9:16", hint: "Reel, story" },
  { id: "4:5", label: "4:5", hint: "Fil Instagram" },
  { id: "1:1", label: "1:1", hint: "Carré" },
  { id: "16:9", label: "16:9", hint: "Paysage" },
];

export const FPS_OPTIONS = [24, 25, 30, 60] as const;

export const TRANSITIONS: { id: MontageTransition; label: string }[] = [
  { id: "cut", label: "Coupe franche" },
  { id: "fade", label: "Fondu" },
  { id: "slide", label: "Glissé" },
  { id: "zoom", label: "Zoom" },
];

export const PACINGS: { id: NonNullable<MontageStyleData["pacing"]>; label: string }[] = [
  { id: "lent", label: "Lent" },
  { id: "moyen", label: "Moyen" },
  { id: "rapide", label: "Rapide" },
];

export const TEXT_ANIMATIONS: { id: NonNullable<MontageStyleData["textAnimation"]>; label: string; hint: string }[] = [
  { id: "rise", label: "Montée douce", hint: "le texte monte en apparaissant" },
  { id: "fade", label: "Fondu", hint: "le texte apparaît en fondu" },
  { id: "words", label: "Mot à mot", hint: "les mots arrivent un par un" },
  { id: "typewriter", label: "Machine à écrire", hint: "lettre par lettre" },
  { id: "none", label: "Aucune", hint: "le texte est simplement posé" },
];

export const PLACEMENTS: { id: NonNullable<MontageStyleData["textPlacement"]>; label: string }[] = [
  { id: "top", label: "En haut" },
  { id: "center", label: "Au centre" },
  { id: "bottom", label: "En bas" },
];

export const COLOR_FIELDS: { id: keyof NonNullable<MontageStyleData["colors"]>; label: string; hint: string }[] = [
  { id: "text", label: "Texte", hint: "couleur des mots à l'écran" },
  { id: "accent", label: "Accent", hint: "un mot mis en valeur" },
  { id: "plate", label: "Bandeau", hint: "fond derrière le texte" },
  { id: "background", label: "Fond", hint: "carton final, fonds unis" },
];

/** Rôles proposés pour le déroulé (texte libre accepté). */
export const ROLE_SUGGESTIONS = ["accroche", "hook", "arrivée", "découverte", "détails", "moment fort", "respiration", "enchaînement", "ressenti", "chute", "fin"];

const HEX = /^#[0-9a-fA-F]{6}$/;
const HEX_SHORT = /^#?[0-9a-fA-F]{3}$/;

/** « c98a3c », « #C98A3C », « #c8a » → « #C98A3C » ; null si invalide. */
export function normalizeHex(input: string): string | null {
  const v = input.trim();
  if (HEX.test(v)) return v.toUpperCase();
  if (/^[0-9a-fA-F]{6}$/.test(v)) return `#${v.toUpperCase()}`;
  if (HEX_SHORT.test(v)) {
    const h = v.replace("#", "");
    return `#${h
      .split("")
      .map((c) => c + c)
      .join("")
      .toUpperCase()}`;
  }
  return null;
}

/** « 2,5 » ou « 2.5 » → 2.5 ; null si ce n'est pas un nombre. */
export function parseDecimal(input: string): number | null {
  const v = input.trim().replace(",", ".");
  if (!/^-?\d*\.?\d+$/.test(v) && !/^-?\d+\.$/.test(v)) return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

export function formatSeconds(n: number | null | undefined): string {
  if (n === null || n === undefined || !Number.isFinite(n)) return "";
  return `${n.toLocaleString("fr-FR", { maximumFractionDigits: 2 })} s`;
}

export function formatNumber(n: number | null | undefined): string {
  if (n === null || n === undefined || !Number.isFinite(n)) return "";
  return n.toLocaleString("fr-FR", { maximumFractionDigits: 2, useGrouping: false });
}

// ---------------------------------------------------------------------------------------------
// Validation

export interface Issue {
  /** Chemin dans les données (« targetDurationS.min », « structure.2.durationS »). */
  path: string;
  message: string;
}

const FIELD_LABEL: Record<string, string> = {
  format: "Format",
  fps: "Images par seconde",
  targetDurationS: "Durée visée",
  photoDurationS: "Durée d'une photo",
  videoClipS: "Longueur d'un plan vidéo",
  transition: "Transition",
  pacing: "Rythme",
  look: "Look",
  fonts: "Typographies",
  colors: "Couleurs",
  textAnimation: "Animation du texte",
  textPlacement: "Place du texte",
  captions: "Sous-titres",
  music: "Musique",
  endCard: "Carton final",
  structure: "Déroulé",
};

export function fieldLabel(path: string): string {
  const [head, ...rest] = path.split(".");
  const base = FIELD_LABEL[head] ?? head;
  if (head === "structure" && rest.length) return `${base}, plan ${Number(rest[0]) + 1}`;
  return base;
}

const isObj = (v: unknown): v is Record<string, unknown> => Boolean(v) && typeof v === "object" && !Array.isArray(v);
const isNum = (v: unknown): v is number => typeof v === "number" && Number.isFinite(v);
const fr = (n: number) => n.toLocaleString("fr-FR");

function checkNumber(issues: Issue[], path: string, v: unknown, min: number, max: number, unit = "s") {
  if (!isNum(v)) {
    issues.push({ path, message: "Indiquez un nombre." });
    return;
  }
  if (v < min || v > max) issues.push({ path, message: `Entre ${fr(min)} et ${fr(max)}${unit ? ` ${unit}` : ""}.` });
}

function checkRange(issues: Issue[], path: string, v: unknown) {
  if (!isObj(v)) {
    issues.push({ path, message: "Indiquez un minimum et un maximum." });
    return;
  }
  const before = issues.length;
  if (v.min === undefined || v.min === null) issues.push({ path: `${path}.min`, message: "Indiquez aussi le minimum." });
  else checkNumber(issues, `${path}.min`, v.min, LIMITS.duration.min, LIMITS.duration.max);
  if (v.max === undefined || v.max === null) issues.push({ path: `${path}.max`, message: "Indiquez aussi le maximum." });
  else checkNumber(issues, `${path}.max`, v.max, LIMITS.duration.min, LIMITS.duration.max);
  if (issues.length === before && isNum(v.min) && isNum(v.max) && v.min > v.max) issues.push({ path: `${path}.max`, message: "Le maximum doit être supérieur ou égal au minimum." });
}

function checkEnum(issues: Issue[], path: string, v: unknown, allowed: readonly unknown[], label: string) {
  if (!allowed.includes(v)) issues.push({ path, message: `Valeur inconnue. Choix possibles : ${label}.` });
}

/** Vérifie les paramètres d'un style ; renvoie la liste des problèmes (vide si tout va bien). */
export function validateMontageData(data: unknown): Issue[] {
  const issues: Issue[] = [];
  if (data === null || data === undefined) return issues;
  if (!isObj(data)) return [{ path: "", message: "Les paramètres doivent être un objet JSON { … }." }];
  const d = data;

  if (d.format !== undefined) checkEnum(issues, "format", d.format, FORMATS.map((f) => f.id), "9:16, 4:5, 1:1, 16:9");
  if (d.fps !== undefined) checkEnum(issues, "fps", d.fps, FPS_OPTIONS, "24, 25, 30, 60");
  if (d.targetDurationS !== undefined) checkRange(issues, "targetDurationS", d.targetDurationS);
  if (d.photoDurationS !== undefined) checkNumber(issues, "photoDurationS", d.photoDurationS, LIMITS.duration.min, LIMITS.duration.max);
  if (d.videoClipS !== undefined) checkRange(issues, "videoClipS", d.videoClipS);

  if (d.transition !== undefined) {
    if (!isObj(d.transition)) issues.push({ path: "transition", message: "Indiquez un type et une durée." });
    else {
      checkEnum(issues, "transition.type", d.transition.type, TRANSITIONS.map((t) => t.id), "cut, fade, slide, zoom");
      checkNumber(issues, "transition.durationS", d.transition.durationS, LIMITS.transition.min, LIMITS.transition.max);
    }
  }
  if (d.pacing !== undefined) checkEnum(issues, "pacing", d.pacing, PACINGS.map((p) => p.id), "lent, moyen, rapide");
  if (d.look !== undefined && d.look !== null && typeof d.look !== "string") issues.push({ path: "look", message: "Le look est un nom (texte)." });

  if (d.fonts !== undefined) {
    if (!isObj(d.fonts)) issues.push({ path: "fonts", message: "Indiquez une police de titre et une police de texte." });
    else
      for (const k of ["display", "text"] as const) {
        const v = d.fonts[k];
        if (typeof v !== "string" || !v.trim()) issues.push({ path: `fonts.${k}`, message: "Indiquez le nom d'une police Google Fonts." });
      }
  }

  if (d.colors !== undefined) {
    if (!isObj(d.colors)) issues.push({ path: "colors", message: "Indiquez les quatre couleurs." });
    else
      for (const f of COLOR_FIELDS) {
        const v = d.colors[f.id];
        if (typeof v !== "string" || !HEX.test(v)) issues.push({ path: `colors.${f.id}`, message: "Couleur au format #RRVVBB, par exemple #C98A3C." });
      }
  }

  if (d.textAnimation !== undefined) checkEnum(issues, "textAnimation", d.textAnimation, TEXT_ANIMATIONS.map((t) => t.id), "rise, fade, words, typewriter, none");
  if (d.textPlacement !== undefined) checkEnum(issues, "textPlacement", d.textPlacement, PLACEMENTS.map((p) => p.id), "top, center, bottom");
  if (d.captions !== undefined && typeof d.captions !== "boolean") issues.push({ path: "captions", message: "Oui (true) ou non (false)." });

  if (d.music !== undefined && d.music !== null) {
    if (!isObj(d.music)) issues.push({ path: "music", message: "Indiquez l'ambiance, le volume et le fondu de fin." });
    else {
      if (typeof d.music.mood !== "string") issues.push({ path: "music.mood", message: "Décrivez l'ambiance en quelques mots." });
      checkNumber(issues, "music.volume", d.music.volume, LIMITS.volume.min, LIMITS.volume.max, "");
      checkNumber(issues, "music.fadeOutS", d.music.fadeOutS, LIMITS.fadeOut.min, LIMITS.fadeOut.max);
    }
  }

  if (d.endCard !== undefined && d.endCard !== null) {
    if (!isObj(d.endCard)) issues.push({ path: "endCard", message: "Indiquez un titre et une durée." });
    else {
      if (typeof d.endCard.title !== "string" || !d.endCard.title.trim()) issues.push({ path: "endCard.title", message: "Indiquez le titre du carton final." });
      if (d.endCard.subtitle !== null && d.endCard.subtitle !== undefined && typeof d.endCard.subtitle !== "string") issues.push({ path: "endCard.subtitle", message: "Le sous-titre est un texte." });
      checkNumber(issues, "endCard.durationS", d.endCard.durationS, LIMITS.duration.min, LIMITS.duration.max);
    }
  }

  if (d.structure !== undefined) {
    if (!Array.isArray(d.structure)) issues.push({ path: "structure", message: "Le déroulé est une liste de plans [ … ]." });
    else
      d.structure.forEach((row, i) => {
        const p = `structure.${i}`;
        if (!isObj(row)) {
          issues.push({ path: p, message: "Chaque plan est un objet { role, shot, … }." });
          return;
        }
        if (typeof row.role !== "string" || !row.role.trim()) issues.push({ path: `${p}.role`, message: "Donnez un rôle à ce plan (accroche, détail, fin…)." });
        if (row.durationS !== undefined && row.durationS !== null) checkNumber(issues, `${p}.durationS`, row.durationS, LIMITS.duration.min, LIMITS.duration.max);
        if (typeof row.shot !== "string") issues.push({ path: `${p}.shot`, message: "Décrivez le plan à chercher." });
        if (row.text !== undefined && row.text !== null && typeof row.text !== "string") issues.push({ path: `${p}.text`, message: "Le texte à l'écran est un texte." });
      });
  }
  return issues;
}

/** Problèmes d'un chemin donné (et de ses sous-chemins si `deep`). */
export function issuesAt(issues: Issue[], path: string, deep = false): Issue[] {
  return issues.filter((i) => i.path === path || (deep && i.path.startsWith(`${path}.`)));
}

// ---------------------------------------------------------------------------------------------
// Résumés

export function structureTotal(structure: MontageStyleData["structure"]): { total: number; unknown: number } {
  let total = 0;
  let unknown = 0;
  for (const row of structure ?? []) {
    if (isNum(row?.durationS)) total += row.durationS;
    else unknown++;
  }
  return { total: Math.round(total * 100) / 100, unknown };
}

function rangeLabel(r: { min: number; max: number } | undefined): string | null {
  if (!r || !isNum(r.min) || !isNum(r.max)) return null;
  return r.min === r.max ? formatSeconds(r.min) : `${fr(r.min)}–${fr(r.max)} s`;
}

export interface SummaryPart {
  kind: "pacing" | "duration" | "transition" | "look";
  title: string;
  text: string;
}

/** « Lent · 15–20 s · Fondu · June doré » */
export function montageSummary(data: Record<string, unknown> | null): SummaryPart[] {
  if (!data) return [];
  const d = data as MontageStyleData;
  const parts: SummaryPart[] = [];
  const pacing = PACINGS.find((p) => p.id === d.pacing)?.label;
  if (pacing) parts.push({ kind: "pacing", title: "Rythme", text: pacing });
  const target = rangeLabel(d.targetDurationS);
  if (target) parts.push({ kind: "duration", title: "Durée visée", text: target });
  const tr = TRANSITIONS.find((t) => t.id === d.transition?.type)?.label;
  if (tr) parts.push({ kind: "transition", title: "Transition", text: tr });
  if (typeof d.look === "string" && d.look.trim()) parts.push({ kind: "look", title: "Look", text: d.look.trim() });
  return parts;
}
