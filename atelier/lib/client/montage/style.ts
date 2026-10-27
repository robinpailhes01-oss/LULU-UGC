/**
 * Styles de montage : lecture tolérante des paramètres d'un skill « montage » (data.json).
 *
 * Module ISOMORPHE (pur, sans "use client" ni "server-only") : importé par l'éditeur ET par le
 * constructeur de composition côté serveur (lib/server/montage/compose.ts), pour que l'aperçu,
 * la timeline et le rendu appliquent exactement les mêmes valeurs par défaut.
 *
 * Rien de ce qui fait un style n'est écrit ici : seules des valeurs de repli neutres, utilisées
 * quand aucun style n'est choisi ou qu'un champ manque ou est invalide. Le style lui-même vit dans
 * atelier/skills/<slug>/data.json (dépôt) et se modifie dans l'Atelier (écran Skills).
 */
import type { MontageClip, MontageFormat, MontageStyleData, MontageTransition } from "@/lib/shared/types";

export type TextAnimation = NonNullable<MontageStyleData["textAnimation"]>;
export type TextPlacement = NonNullable<MontageStyleData["textPlacement"]>;
export type Pacing = NonNullable<MontageStyleData["pacing"]>;
export type ClipMotion = NonNullable<MontageClip["motion"]>;
export type StructureStep = NonNullable<MontageStyleData["structure"]>[number];

export const FORMATS: MontageFormat[] = ["9:16", "4:5", "1:1", "16:9"];
export const TRANSITIONS: MontageTransition[] = ["cut", "fade", "slide", "zoom"];
export const TEXT_ANIMATIONS: TextAnimation[] = ["rise", "fade", "words", "typewriter", "none"];
export const PLACEMENTS: TextPlacement[] = ["top", "center", "bottom"];
export const MOTIONS: ClipMotion[] = ["none", "zoom-in", "zoom-out", "pan-left", "pan-right"];
const FPS_VALUES = [24, 25, 30, 60] as const;

/** Style complet, chaque champ résolu (valeur du style, sinon repli). */
export interface ResolvedStyle {
  slug: string | null;
  name: string | null;
  format: MontageFormat;
  fps: 24 | 25 | 30 | 60;
  targetDurationS: { min: number; max: number } | null;
  photoDurationS: number;
  videoClipS: { min: number; max: number };
  transition: { type: MontageTransition; durationS: number };
  pacing: Pacing;
  /** Nom du look de retouche à appliquer à tous les plans. */
  look: string | null;
  fonts: { display: string; text: string };
  colors: { text: string; accent: string; plate: string; background: string };
  textAnimation: TextAnimation;
  textPlacement: TextPlacement;
  /** Textes « sous-titre » sur plaque (true) ou simplement ombrés (false). */
  captions: boolean;
  music: { mood: string | null; volume: number; fadeOutS: number };
  endCard: { title: string; subtitle: string | null; durationS: number } | null;
  structure: StructureStep[];
  // --- Champs facultatifs supplémentaires (documentés dans docs/montage.md) ---
  /** Volume par défaut du son des plans vidéo (0 = plans muets par défaut). */
  clipVolume: number;
  /** Mouvement par défaut des photos ; « auto » alterne zoom et panoramique. */
  photoMotion: ClipMotion | "auto";
  /** Amplitude du mouvement lent (0,02 = discret, 0,12 = marqué). */
  motionAmount: number;
  /** Multiplicateur de la taille des textes. */
  textScale: number;
  /** Petite signature de la carte de fin (null = aucune). */
  signature: string | null;
}

export interface StyleIssue {
  field: string;
  message: string;
}

/** Valeurs de repli quand le style ne précise rien (ou qu'aucun style n'est choisi). */
export const FALLBACK_STYLE: ResolvedStyle = {
  slug: null,
  name: null,
  format: "9:16",
  fps: 30,
  targetDurationS: null,
  photoDurationS: 3,
  videoClipS: { min: 1, max: 6 },
  transition: { type: "fade", durationS: 0.4 },
  pacing: "moyen",
  look: null,
  fonts: { display: "Fraunces", text: "Manrope" },
  colors: { text: "#FBF7F0", accent: "#C98A3C", plate: "#241D17", background: "#F4F0E8" },
  textAnimation: "rise",
  textPlacement: "center",
  captions: false,
  music: { mood: null, volume: 0.6, fadeOutS: 1.2 },
  endCard: null,
  structure: [],
  clipVolume: 0,
  photoMotion: "auto",
  motionAmount: 0.06,
  textScale: 1,
  signature: "June",
};

/** Rythme : valeurs de repli quand le style donne un rythme sans durées précises. */
const PACING_DEFAULTS: Record<Pacing, { photoDurationS: number; videoClipS: { min: number; max: number }; motionAmount: number }> = {
  lent: { photoDurationS: 3, videoClipS: { min: 2, max: 6 }, motionAmount: 0.08 },
  moyen: { photoDurationS: 2.2, videoClipS: { min: 1.5, max: 4 }, motionAmount: 0.06 },
  rapide: { photoDurationS: 1, videoClipS: { min: 0.6, max: 1.5 }, motionAmount: 0.035 },
};

export const PACING_LABEL: Record<Pacing, string> = { lent: "Lent", moyen: "Moyen", rapide: "Rapide" };
export const TRANSITION_LABEL: Record<MontageTransition, string> = { cut: "Coupe franche", fade: "Fondu", slide: "Glissé", zoom: "Zoom" };
export const FORMAT_LABEL: Record<MontageFormat, string> = { "9:16": "9:16 Reel", "4:5": "4:5", "1:1": "1:1", "16:9": "16:9" };
export const TEXT_STYLE_LABEL = { hook: "Accroche", title: "Titre", caption: "Sous-titre", label: "Étiquette" } as const;
export const PLACEMENT_LABEL: Record<TextPlacement, string> = { top: "En haut", center: "Au centre", bottom: "En bas" };
export const MOTION_LABEL: Record<ClipMotion, string> = { none: "Aucun", "zoom-in": "Zoom avant", "zoom-out": "Zoom arrière", "pan-left": "Vers la gauche", "pan-right": "Vers la droite" };
export const ANIMATION_LABEL: Record<TextAnimation, string> = { rise: "Montée douce", fade: "Fondu", words: "Mot à mot", typewriter: "Machine à écrire", none: "Aucune" };

// ---------------------------------------------------------------------------------------------
// Validation tolérante (le data.json est modifié à la main, dans le dépôt ou dans l'Atelier)

const isObj = (v: unknown): v is Record<string, unknown> => typeof v === "object" && v !== null && !Array.isArray(v);
const isNum = (v: unknown, min: number, max: number): v is number => typeof v === "number" && Number.isFinite(v) && v >= min && v <= max;

/** Couleur CSS sûre (pas d'injection) : #rgb, #rrggbb, #rrggbbaa, rgb()/rgba()/hsl()/hsla(). */
export function isSafeColor(v: unknown): v is string {
  if (typeof v !== "string") return false;
  const s = v.trim();
  return /^#(?:[0-9a-f]{3}|[0-9a-f]{4}|[0-9a-f]{6}|[0-9a-f]{8})$/i.test(s) || /^(?:rgb|rgba|hsl|hsla)\(\s*[0-9.,%\s/]+\)$/i.test(s);
}

/** Nom de famille Google Fonts plausible (lettres, chiffres, espaces, tirets). */
export function isSafeFontFamily(v: unknown): v is string {
  return typeof v === "string" && /^[A-Za-z0-9][A-Za-z0-9 \-]{0,60}$/.test(v.trim());
}

function pick<T>(issues: StyleIssue[], field: string, raw: unknown, ok: (v: unknown) => v is T, fallback: T, label: string): T {
  if (raw === undefined) return fallback;
  if (ok(raw)) return raw;
  issues.push({ field, message: `Paramètre « ${field} » du style ignoré : ${label}.` });
  return fallback;
}

const oneOf =
  <T extends string | number>(values: readonly T[]) =>
  (v: unknown): v is T =>
    values.includes(v as T);

function resolveLook(issues: StyleIssue[], raw: unknown): string | null {
  if (raw === undefined || raw === null) return FALLBACK_STYLE.look;
  if (typeof raw === "string" && raw.trim()) return raw.trim();
  issues.push({ field: "look", message: "Paramètre « look » du style ignoré : nom d'un look attendu." });
  return FALLBACK_STYLE.look;
}

function range(issues: StyleIssue[], field: string, raw: unknown, fallback: { min: number; max: number } | null, lo: number, hi: number) {
  if (raw === undefined) return fallback;
  if (isObj(raw) && isNum(raw.min, lo, hi) && isNum(raw.max, lo, hi) && raw.min <= raw.max) return { min: raw.min, max: raw.max };
  issues.push({ field, message: `Paramètre « ${field} » du style ignoré : { "min": …, "max": … } attendu (secondes, min ≤ max).` });
  return fallback;
}

/**
 * Résout les paramètres d'un style (MontageStyleData + champs facultatifs) en valeurs complètes.
 * Les champs invalides sont ignorés (repli) et signalés dans `issues`.
 */
export function resolveStyle(data: Record<string, unknown> | MontageStyleData | null | undefined, meta: { slug?: string | null; name?: string | null } = {}): { style: ResolvedStyle; issues: StyleIssue[] } {
  const d = (isObj(data) ? data : {}) as Record<string, unknown>;
  const issues: StyleIssue[] = [];
  const F = FALLBACK_STYLE;

  const pacing = pick(issues, "pacing", d.pacing, oneOf(["lent", "moyen", "rapide"] as const), F.pacing, "lent, moyen ou rapide");
  const pacingDefaults = d.pacing !== undefined ? PACING_DEFAULTS[pacing] : { photoDurationS: F.photoDurationS, videoClipS: F.videoClipS, motionAmount: F.motionAmount };

  let transition = F.transition;
  if (d.transition !== undefined) {
    const t = d.transition;
    if (isObj(t) && oneOf(TRANSITIONS)(t.type) && (t.durationS === undefined || isNum(t.durationS, 0, 3))) {
      transition = { type: t.type, durationS: t.type === "cut" ? 0 : typeof t.durationS === "number" ? t.durationS : F.transition.durationS };
    } else issues.push({ field: "transition", message: "Paramètre « transition » du style ignoré : { \"type\": cut|fade|slide|zoom, \"durationS\": 0–3 } attendu." });
  }

  let fonts = F.fonts;
  if (d.fonts !== undefined) {
    const f = d.fonts;
    if (isObj(f) && isSafeFontFamily(f.display) && isSafeFontFamily(f.text)) fonts = { display: f.display.trim(), text: f.text.trim() };
    else issues.push({ field: "fonts", message: "Paramètre « fonts » du style ignoré : { \"display\": \"Famille Google Fonts\", \"text\": \"…\" } attendu." });
  }

  let colors = F.colors;
  if (d.colors !== undefined) {
    const c = d.colors;
    if (isObj(c)) {
      colors = { ...F.colors };
      for (const k of ["text", "accent", "plate", "background"] as const) {
        if (c[k] === undefined) continue;
        if (isSafeColor(c[k])) colors[k] = (c[k] as string).trim();
        else issues.push({ field: `colors.${k}`, message: `Couleur « ${String(c[k])} » du style ignorée (format #RRGGBB attendu).` });
      }
    } else issues.push({ field: "colors", message: "Paramètre « colors » du style ignoré : objet attendu." });
  }

  let music = F.music;
  if (d.music !== undefined && d.music !== null) {
    const m = d.music;
    if (isObj(m)) {
      music = {
        mood: typeof m.mood === "string" ? m.mood : null,
        volume: isNum(m.volume, 0, 1) ? m.volume : F.music.volume,
        fadeOutS: isNum(m.fadeOutS, 0, 10) ? m.fadeOutS : F.music.fadeOutS,
      };
    } else issues.push({ field: "music", message: "Paramètre « music » du style ignoré : objet attendu." });
  }

  let endCard = F.endCard;
  if (d.endCard !== undefined) {
    const e = d.endCard;
    if (e === null) endCard = null;
    else if (isObj(e) && typeof e.title === "string" && isNum(e.durationS, 0.5, 10)) endCard = { title: e.title, subtitle: typeof e.subtitle === "string" ? e.subtitle : null, durationS: e.durationS };
    else issues.push({ field: "endCard", message: "Paramètre « endCard » du style ignoré : { \"title\", \"subtitle\", \"durationS\" } ou null attendu." });
  }

  let structure: StructureStep[] = [];
  if (Array.isArray(d.structure)) {
    structure = d.structure
      .filter((s): s is Record<string, unknown> => isObj(s) && typeof s.role === "string")
      .map((s) => ({
        role: String(s.role),
        shot: typeof s.shot === "string" ? s.shot : "",
        ...(isNum(s.durationS, 0, 600) ? { durationS: s.durationS } : {}),
        ...(typeof s.text === "string" ? { text: s.text } : {}),
      }));
  } else if (d.structure !== undefined) issues.push({ field: "structure", message: "Paramètre « structure » du style ignoré : liste attendue." });

  const style: ResolvedStyle = {
    slug: meta.slug ?? null,
    name: meta.name ?? null,
    format: pick(issues, "format", d.format, oneOf(FORMATS), F.format, "9:16, 4:5, 1:1 ou 16:9"),
    fps: pick(issues, "fps", d.fps, oneOf(FPS_VALUES), F.fps, "24, 25, 30 ou 60"),
    targetDurationS: range(issues, "targetDurationS", d.targetDurationS, F.targetDurationS, 0, 600),
    photoDurationS: pick(issues, "photoDurationS", d.photoDurationS, (v): v is number => isNum(v, 0.3, 30), pacingDefaults.photoDurationS, "nombre de secondes (0,3 à 30)"),
    videoClipS: range(issues, "videoClipS", d.videoClipS, pacingDefaults.videoClipS, 0.2, 120) ?? pacingDefaults.videoClipS,
    transition,
    pacing,
    look: resolveLook(issues, d.look),
    fonts,
    colors,
    textAnimation: pick(issues, "textAnimation", d.textAnimation, oneOf(TEXT_ANIMATIONS), F.textAnimation, "rise, fade, words, typewriter ou none"),
    textPlacement: pick(issues, "textPlacement", d.textPlacement, oneOf(PLACEMENTS), F.textPlacement, "top, center ou bottom"),
    captions: pick(issues, "captions", d.captions, (v): v is boolean => typeof v === "boolean", F.captions, "true ou false"),
    music,
    endCard,
    structure,
    clipVolume: pick(issues, "clipVolume", d.clipVolume, (v): v is number => isNum(v, 0, 2), F.clipVolume, "nombre de 0 à 2"),
    photoMotion: pick(issues, "photoMotion", d.photoMotion, oneOf([...MOTIONS, "auto"] as const), F.photoMotion, "auto, none, zoom-in, zoom-out, pan-left ou pan-right"),
    motionAmount: pick(issues, "motionAmount", d.motionAmount, (v): v is number => isNum(v, 0, 0.3), pacingDefaults.motionAmount, "nombre de 0 à 0,3"),
    textScale: pick(issues, "textScale", d.textScale, (v): v is number => isNum(v, 0.5, 2), F.textScale, "nombre de 0,5 à 2"),
    signature: d.signature === null ? null : pick(issues, "signature", d.signature, (v): v is string => typeof v === "string" && v.length <= 40, F.signature ?? "", "texte court") || null,
  };
  return { style, issues };
}

// ---------------------------------------------------------------------------------------------
// Valeurs par défaut des plans

const AUTO_MOTIONS: ClipMotion[] = ["zoom-in", "pan-left", "zoom-out", "pan-right"];

/** Identifiant court pour un plan ou un texte (pas besoin d'un UUID). */
export function shortId(prefix: string): string {
  const rand = Math.random().toString(36).slice(2, 10).padEnd(8, "0");
  return `${prefix}_${rand}`;
}

export const round = (n: number, digits = 3) => Number(n.toFixed(digits));

/** Plan par défaut pour un média, selon le rythme du style. */
export function defaultClip(asset: { id: string; kind: string; durationS: number | null }, style: ResolvedStyle, index: number): MontageClip {
  if (asset.kind === "video") {
    const len = asset.durationS && asset.durationS > 0 ? Math.min(asset.durationS, style.videoClipS.max) : style.videoClipS.max;
    return { id: shortId("c"), assetId: asset.id, inS: 0, outS: round(Math.max(0.2, len)), motion: "none", muted: style.clipVolume <= 0 };
  }
  const motion = style.photoMotion === "auto" ? AUTO_MOTIONS[index % AUTO_MOTIONS.length] : style.photoMotion;
  return { id: shortId("c"), assetId: asset.id, inS: 0, outS: round(style.photoDurationS), motion };
}

/**
 * Applique le rythme d'un style à un plan existant : longueur par défaut du style (comme à la
 * création), en gardant le point d'entrée des vidéos, leur son et le mouvement des photos.
 */
export function refitClip(clip: MontageClip, asset: { kind: string; durationS: number | null } | undefined, style: ResolvedStyle): MontageClip {
  if (!asset) return clip;
  if (asset.kind === "video") {
    const available = asset.durationS && asset.durationS > 0 ? Math.max(0.2, asset.durationS - clip.inS) : style.videoClipS.max;
    const len = Math.min(available, style.videoClipS.max);
    return { ...clip, outS: round(clip.inS + Math.max(0.2, len)) };
  }
  return { ...clip, inS: 0, outS: round(style.photoDurationS) };
}

/** Résumé court d'un style pour les cartes : « Lent · 15–20 s · Fondu ». */
export function styleSummary(style: ResolvedStyle): string {
  const parts = [PACING_LABEL[style.pacing]];
  if (style.targetDurationS) parts.push(`${fmtS(style.targetDurationS.min)}–${fmtS(style.targetDurationS.max)} s`);
  parts.push(TRANSITION_LABEL[style.transition.type]);
  return parts.join(" · ");
}

/** Texte à l'écran sans le balisage d'accent (*mot*), pour les listes. */
export function plainText(t: string): string {
  return t.replace(/\*([^*]+)\*/g, "$1");
}

export function fmtS(n: number): string {
  return n.toLocaleString("fr-FR", { maximumFractionDigits: 1 });
}
