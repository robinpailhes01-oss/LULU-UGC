import type { AspectPreset, CropRect, RetouchParams } from "@/lib/shared/types";

/**
 * Mathématiques de la retouche « à l'image de June », partagées par l'aperçu WebGL du
 * navigateur, l'export pleine résolution du serveur (sharp) et les montages vidéo (filtre SVG).
 * Une seule définition : l'aperçu et le fichier exporté sont identiques.
 *
 * Espace de travail : valeurs sRGB ENCODÉES (0–1), comme les pixels d'un JPEG. Seule l'exposition
 * passe par la lumière linéaire (×2^EV), à l'intérieur de la courbe de tons. Ce choix permet
 * d'appliquer exactement la même chose dans un filtre SVG (color-interpolation-filters="sRGB").
 *
 * Ordre par pixel (identique en JS et en GLSL) :
 *   1. courbe de tons 1D par canal (LUT de 1024 points, interpolation linéaire) :
 *      exposition → contraste → hautes lumières / ombres → blancs / noirs → fondu ;
 *   2. vibrance (saturation pondérée par 1 − saturation actuelle, peau protégée) ;
 *   3. matrice couleur 3×3 + décalage : saturation (poids Rec.709) PUIS balance des blancs
 *      (gains par canal). Conséquence voulue : en noir et blanc, température et teinte virent
 *      l'image (« Noir & blanc chaud ») ;
 *   4. vignettage (assombrissement radial, multiplicatif) ;
 *   5. grain (bruit de valeur déterministe, hachage entier, monochrome) ;
 *   6. limitation à 0–1.
 * La netteté n'est appliquée qu'à l'export (sharp.sharpen).
 */

// ---------------------------------------------------------------------------------------------
// Réglages

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

/** Réglages de lumière, de couleur et d'effets : ce qu'un look peut contenir. */
export const LOOK_KEYS = [
  "exposure",
  "contrast",
  "highlights",
  "shadows",
  "whites",
  "blacks",
  "temperature",
  "tint",
  "saturation",
  "vibrance",
  "fade",
  "vignette",
  "grain",
  "sharpen",
] as const;

export type LookKey = (typeof LOOK_KEYS)[number];

export const GEOMETRY_KEYS = ["rotate", "flipH", "straighten", "aspect", "crop"] as const;

/** Bornes de chaque curseur (le pas sert à l'interface). */
export const PARAM_RANGES: Record<LookKey | "straighten", { min: number; max: number; step: number }> = {
  exposure: { min: -2, max: 2, step: 0.05 },
  contrast: { min: -100, max: 100, step: 1 },
  highlights: { min: -100, max: 100, step: 1 },
  shadows: { min: -100, max: 100, step: 1 },
  whites: { min: -100, max: 100, step: 1 },
  blacks: { min: -100, max: 100, step: 1 },
  temperature: { min: -100, max: 100, step: 1 },
  tint: { min: -100, max: 100, step: 1 },
  saturation: { min: -100, max: 100, step: 1 },
  vibrance: { min: -100, max: 100, step: 1 },
  fade: { min: 0, max: 100, step: 1 },
  vignette: { min: 0, max: 100, step: 1 },
  grain: { min: 0, max: 100, step: 1 },
  sharpen: { min: 0, max: 100, step: 1 },
  straighten: { min: -15, max: 15, step: 0.1 },
};

export const ASPECT_PRESETS: AspectPreset[] = ["original", "free", "1:1", "4:5", "9:16", "16:9", "3:2"];

const clamp = (v: number, lo: number, hi: number) => (v < lo ? lo : v > hi ? hi : v);
const finite = (v: unknown, fallback: number) => (typeof v === "number" && Number.isFinite(v) ? v : fallback);

/** Valide et borne des réglages venus de l'extérieur (API, agent, base). */
export function sanitizeParams(input: Partial<RetouchParams> | null | undefined): RetouchParams {
  const p = withDefaults(input);
  const out = { ...NEUTRAL_PARAMS };
  for (const k of LOOK_KEYS) {
    const r = PARAM_RANGES[k];
    out[k] = clamp(finite(p[k], 0), r.min, r.max);
  }
  const rot = ((Math.round(finite(p.rotate, 0) / 90) * 90) % 360 + 360) % 360;
  out.rotate = rot as RetouchParams["rotate"];
  out.flipH = p.flipH === true;
  out.straighten = clamp(finite(p.straighten, 0), PARAM_RANGES.straighten.min, PARAM_RANGES.straighten.max);
  out.aspect = ASPECT_PRESETS.includes(p.aspect) ? p.aspect : "original";
  out.crop = sanitizeCrop(p.crop);
  return out;
}

function sanitizeCrop(c: CropRect | null | undefined): CropRect | null {
  if (!c || typeof c !== "object") return null;
  const w = clamp(finite(c.w, 1), MIN_CROP, 1);
  const h = clamp(finite(c.h, 1), MIN_CROP, 1);
  const x = clamp(finite(c.x, 0), 0, 1 - w);
  const y = clamp(finite(c.y, 0), 0, 1 - h);
  if (w >= 0.9999 && h >= 0.9999) return null;
  return { x, y, w, h };
}

/** Garde uniquement les réglages de look (sans recadrage ni rotation). */
export function lookParamsOf(p: Partial<RetouchParams> | null | undefined): Partial<RetouchParams> {
  const full = sanitizeParams(p);
  const out: Partial<RetouchParams> = {};
  for (const k of LOOK_KEYS) out[k] = full[k];
  return out;
}

/**
 * Applique un look à des réglages existants avec une intensité 0–1 (0 = neutre, 1 = look complet).
 * Les clés du look remplacent celles de `base` ; les clés absentes repassent au neutre, sauf
 * l'exposition, propre à chaque photo, qui est conservée si le look ne la fixe pas.
 * Le recadrage et la rotation de `base` sont toujours conservés.
 */
export function applyLook(base: RetouchParams, look: Partial<RetouchParams>, intensity = 1): RetouchParams {
  const t = clamp(intensity, 0, 1);
  const out = { ...base };
  for (const k of LOOK_KEYS) {
    const v = look[k];
    if (typeof v === "number" && Number.isFinite(v)) out[k] = NEUTRAL_PARAMS[k] + (v - NEUTRAL_PARAMS[k]) * t;
    else if (k !== "exposure") out[k] = NEUTRAL_PARAMS[k];
  }
  return sanitizeParams(out);
}

/** Vrai si les réglages ne changent rien aux couleurs ni à la lumière. */
export function isColourNeutral(p: Partial<RetouchParams> | null | undefined): boolean {
  const full = withDefaults(p);
  return LOOK_KEYS.every((k) => Math.abs(full[k] - NEUTRAL_PARAMS[k]) < 1e-9);
}

export function isGeometryNeutral(p: Partial<RetouchParams> | null | undefined): boolean {
  const full = withDefaults(p);
  return full.rotate === 0 && !full.flipH && Math.abs(full.straighten) < 1e-9 && (full.aspect === "original" || full.aspect === "free") && !full.crop;
}

export function paramsEqual(a: RetouchParams, b: RetouchParams): boolean {
  for (const k of LOOK_KEYS) if (Math.abs(a[k] - b[k]) > 1e-9) return false;
  if (a.rotate !== b.rotate || a.flipH !== b.flipH || Math.abs(a.straighten - b.straighten) > 1e-9 || a.aspect !== b.aspect) return false;
  const ca = a.crop;
  const cb = b.crop;
  if (!ca || !cb) return !ca && !cb;
  return Math.abs(ca.x - cb.x) < 1e-6 && Math.abs(ca.y - cb.y) < 1e-6 && Math.abs(ca.w - cb.w) < 1e-6 && Math.abs(ca.h - cb.h) < 1e-6;
}

// ---------------------------------------------------------------------------------------------
// Courbe de tons

export const LUT_SIZE = 1024;

export function srgbToLinear(v: number): number {
  return v <= 0.04045 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
}

export function linearToSrgb(v: number): number {
  if (v <= 0) return 0;
  return v <= 0.0031308 ? v * 12.92 : 1.055 * Math.pow(v, 1 / 2.4) - 0.055;
}

export function smoothstep(e0: number, e1: number, x: number): number {
  const t = clamp((x - e0) / (e1 - e0), 0, 1);
  return t * t * (3 - 2 * t);
}

/** Genou (linéaire) au-delà duquel une exposition positive est compressée au lieu d'être écrêtée. */
const EXPOSURE_KNEE = 0.75;

/**
 * Courbe de tons 1D (entrée et sortie 0–1, valeurs sRGB encodées), échantillonnée sur `size`
 * points réguliers. Monotone par construction (croissance forcée en dernier recours).
 */
export function buildToneLut(params: Partial<RetouchParams>, size = LUT_SIZE): Float32Array {
  const p = withDefaults(params);
  const lut = new Float32Array(size);
  const gain = Math.pow(2, clamp(finite(p.exposure, 0), -4, 4));
  // Épaule douce pour l'exposition positive : pente 1 au genou, la valeur maximale reste 1.
  const k = EXPOSURE_KNEE;
  const alpha = gain > 1 ? (gain - 1) / ((1 - k) * (gain - k)) : 0;
  const a = 0.6 * clamp(p.contrast / 100, -1, 1);
  const hl = 0.9 * clamp(p.highlights / 100, -1, 1);
  const sh = 0.9 * clamp(p.shadows / 100, -1, 1);
  const wh = 0.2 * clamp(p.whites / 100, -1, 1);
  const bl = 0.2 * clamp(p.blacks / 100, -1, 1);
  const fd = clamp(p.fade / 100, 0, 1);
  const fadeBlack = 0.12 * fd;
  const fadeWhite = 1 - 0.05 * fd;
  const TWO_PI = Math.PI * 2;
  let prev = 0;
  for (let i = 0; i < size; i++) {
    const x = i / (size - 1);
    // 1. Exposition en lumière linéaire.
    let lin = srgbToLinear(x) * gain;
    if (alpha > 0 && lin > k) lin = k + (lin - k) / (1 + alpha * (lin - k));
    let y = linearToSrgb(Math.min(lin, 1));
    // 2. Contraste : courbe en S autour du gris moyen (extrémités fixes).
    if (a !== 0) y = y - (a * Math.sin(TWO_PI * y)) / TWO_PI;
    // 3. Hautes lumières et ombres : relèvements/abaissements masqués, nuls aux extrémités.
    if (hl !== 0) y = y + hl * (1 - y) * smoothstep(0.4, 1, y);
    if (sh !== 0) y = y + sh * y * (1 - smoothstep(0, 0.6, y));
    // 4. Blancs et noirs : déplacent les extrémités (écrêtage ou relèvement).
    if (wh !== 0) y = y + wh * smoothstep(0.5, 1, y);
    if (bl !== 0) y = y + bl * (1 - smoothstep(0, 0.5, y));
    // 5. Fondu : noirs relevés, blancs légèrement abaissés.
    y = fadeBlack + y * (fadeWhite - fadeBlack);
    y = clamp(y, 0, 1);
    if (y < prev) y = prev;
    prev = y;
    lut[i] = y;
  }
  return lut;
}

/** Lecture de la LUT avec interpolation linéaire, exactement comme le shader. */
export function sampleLut(lut: Float32Array, x: number): number {
  const n = lut.length;
  const f = clamp(x, 0, 1) * (n - 1);
  const i = Math.floor(f);
  const j = Math.min(i + 1, n - 1);
  const t = f - i;
  return lut[i] + (lut[j] - lut[i]) * t;
}

// ---------------------------------------------------------------------------------------------
// Couleur

export const REC709: readonly [number, number, number] = [0.2126, 0.7152, 0.0722];

/**
 * Gains de balance des blancs par canal (espace encodé), normalisés pour garder la luminance.
 * Chaud = rouge (et un peu de vert) vers le haut, bleu vers le bas. Teinte + = magenta = vert vers le bas.
 */
export function whiteBalanceGains(temperature: number, tint: number): [number, number, number] {
  const k = clamp(temperature / 100, -1, 1);
  const m = clamp(tint / 100, -1, 1);
  let r = 1 + 0.28 * k;
  let g = 1 + 0.04 * k;
  let b = 1 - 0.42 * k;
  g *= 1 - 0.25 * m;
  r *= 1 + 0.05 * m;
  b *= 1 + 0.08 * m;
  const l = REC709[0] * r + REC709[1] * g + REC709[2] * b;
  return [r / l, g / l, b / l];
}

export interface ColourMatrix {
  /** Matrice 3×3 rangée par lignes : out = m · in + offset. */
  m: [number, number, number, number, number, number, number, number, number];
  offset: [number, number, number];
}

/** Matrice couleur : saturation (préserve la luminance Rec.709) puis gains de balance des blancs. */
export function colourMatrix(params: Partial<RetouchParams>, extraSaturation = 0): ColourMatrix {
  const p = withDefaults(params);
  const s = Math.max(0, 1 + clamp(p.saturation / 100, -1, 1) + extraSaturation);
  const [wr, wg, wb] = REC709;
  const sat = [
    (1 - s) * wr + s, (1 - s) * wg, (1 - s) * wb,
    (1 - s) * wr, (1 - s) * wg + s, (1 - s) * wb,
    (1 - s) * wr, (1 - s) * wg, (1 - s) * wb + s,
  ];
  const [gr, gg, gb] = whiteBalanceGains(p.temperature, p.tint);
  return {
    m: [sat[0] * gr, sat[1] * gr, sat[2] * gr, sat[3] * gg, sat[4] * gg, sat[5] * gg, sat[6] * gb, sat[7] * gb, sat[8] * gb],
    offset: [0, 0, 0],
  };
}

/** Poids « peau » (0–1) : teintes orangées (R > V > B) de saturation modérée, moins poussées par la vibrance. */
export function skinWeight(r: number, g: number, b: number, sat: number): number {
  if (!(r > g && g > b)) return 0;
  const t = (g - b) / (r - b);
  const hue = smoothstep(0.08, 0.25, t) * (1 - smoothstep(0.55, 0.8, t));
  const s = smoothstep(0.04, 0.12, sat) * (1 - smoothstep(0.45, 0.7, sat));
  return hue * s;
}

// ---------------------------------------------------------------------------------------------
// Effets

/** Intensité maximale du vignettage (à 100) et zone de transition (distance normalisée, coins = 1). */
export const VIGNETTE_STRENGTH = 0.7;
export const VIGNETTE_START = 0.3;
export const VIGNETTE_END = 1.15;
/** Nombre de cellules de grain sur le grand côté de l'image (grain proportionnel au cadre). */
export const GRAIN_CELLS = 1800;
export const GRAIN_STRENGTH = 0.28;
export const GRAIN_SEED = 20240611;

/** Facteurs d'aspect du vignettage : à mi-chemin entre ellipse (suit le cadre) et cercle. */
export function vignetteAxes(w: number, h: number): [number, number] {
  const m = Math.max(w, h, 1);
  return [Math.sqrt(w / m), Math.sqrt(h / m)];
}

/** Facteur multiplicatif du vignettage pour une position normalisée (qx, qy) ∈ [0, 1]². */
export function vignetteFactor(qx: number, qy: number, ax: number, ay: number, amount: number): number {
  if (amount <= 0) return 1;
  const dx = (qx - 0.5) * ax;
  const dy = (qy - 0.5) * ay;
  const d = (Math.sqrt(dx * dx + dy * dy) * 2) / Math.sqrt(ax * ax + ay * ay);
  return 1 - amount * VIGNETTE_STRENGTH * smoothstep(VIGNETTE_START, VIGNETTE_END, d);
}

/** Hachage entier 32 bits (identique en GLSL avec des uint) → 0–1. */
export function hash2(x: number, y: number, seed: number): number {
  let h = (Math.imul(x | 0, 0x8da6b343) ^ Math.imul(y | 0, 0xd8163841) ^ Math.imul(seed | 0, 0xcb1ab31f)) >>> 0;
  h ^= h >>> 16;
  h = Math.imul(h, 0x7feb352d) >>> 0;
  h ^= h >>> 15;
  h = Math.imul(h, 0x846ca68b) >>> 0;
  h ^= h >>> 16;
  return (h >>> 0) / 4294967295;
}

/** Bruit de valeur lissé (−0.5…0.5) aux coordonnées de grille (gx, gy). */
export function grainNoise(gx: number, gy: number, seed: number): number {
  const ix = Math.floor(gx);
  const iy = Math.floor(gy);
  let fx = gx - ix;
  let fy = gy - iy;
  fx = fx * fx * (3 - 2 * fx);
  fy = fy * fy * (3 - 2 * fy);
  const n00 = hash2(ix, iy, seed);
  const n10 = hash2(ix + 1, iy, seed);
  const n01 = hash2(ix, iy + 1, seed);
  const n11 = hash2(ix + 1, iy + 1, seed);
  const a = n00 + (n10 - n00) * fx;
  const b = n01 + (n11 - n01) * fx;
  return a + (b - a) * fy - 0.5;
}

/** Sigma du masque de netteté sharp pour un curseur 0–100 (0 = pas de netteté). */
export function sharpenOptions(amount: number, outLongSide: number): { sigma: number; m1: number; m2: number } | null {
  const a = clamp(amount / 100, 0, 1);
  if (a <= 0) return null;
  // Rayon un peu plus grand sur les très grandes images, pour un effet visible à l'écran.
  const scale = clamp(outLongSide / 3000, 0.6, 1.6);
  return { sigma: (0.5 + 1.1 * a) * scale, m1: 0.4 * a, m2: 0.6 + 2.6 * a };
}

// ---------------------------------------------------------------------------------------------
// Pixel par pixel (serveur, tests)

export interface PreparedLook {
  lut: Float32Array;
  /** LUT 8 bits → 0–1 (entrées entières d'un JPEG), mêmes valeurs que sampleLut(lut, i/255). */
  lut8: Float32Array;
  m: ColourMatrix["m"];
  offset: ColourMatrix["offset"];
  vibrance: number;
  vignette: number;
  vigAx: number;
  vigAy: number;
  grain: number;
  grainGridX: number;
  grainGridY: number;
  seed: number;
  /** Rien à faire sur la couleur (copie directe). */
  identity: boolean;
}

/**
 * Prépare les constantes d'un rendu pour une image de sortie w × h. L'amplitude du grain est
 * atténuée (grainAttenuation) quand un pixel de sortie couvre plusieurs cellules de grain : une
 * petite image ressemble ainsi à la grande réduite. L'aperçu applique la même règle avec la taille
 * affichée.
 */
export function prepareLook(params: Partial<RetouchParams>, w: number, h: number, lut?: Float32Array): PreparedLook {
  const p = sanitizeParams(params);
  const table = lut ?? buildToneLut(p);
  const lut8 = new Float32Array(256);
  for (let i = 0; i < 256; i++) lut8[i] = sampleLut(table, i / 255);
  const cm = colourMatrix(p);
  const [vigAx, vigAy] = vignetteAxes(w, h);
  const m = Math.max(w, h, 1);
  const atten = grainAttenuation(m);
  return {
    lut: table,
    lut8,
    m: cm.m,
    offset: cm.offset,
    vibrance: p.vibrance / 100,
    vignette: p.vignette / 100,
    vigAx,
    vigAy,
    grain: (p.grain / 100) * atten,
    grainGridX: (GRAIN_CELLS * w) / m,
    grainGridY: (GRAIN_CELLS * h) / m,
    seed: GRAIN_SEED,
    identity: isColourNeutral({ ...p, sharpen: 0 }),
  };
}

/** Atténuation du grain quand l'image affichée/exportée a moins de pixels que de cellules. */
export function grainAttenuation(longSidePx: number): number {
  return clamp(longSidePx / GRAIN_CELLS, 0.15, 1);
}

/**
 * Cœur du rendu d'un pixel : (r, g, b) déjà passés par la courbe de tons, position normalisée
 * (qx, qy) du centre du pixel dans l'image de sortie. Écrit le résultat (0–1) dans `out`.
 */
export function shadeToned(prep: PreparedLook, r: number, g: number, b: number, qx: number, qy: number, out: Float32Array | number[]): void {
  const vig = prep.vignette > 0 ? vignetteFactor(qx, qy, prep.vigAx, prep.vigAy, prep.vignette) : 1;
  const noise = prep.grain > 0 ? grainNoise(qx * prep.grainGridX, qy * prep.grainGridY, prep.seed) : 0;
  shadeCore(prep, r, g, b, vig, noise, out);
}

/** Étapes 2 à 6 avec le facteur de vignettage et le bruit déjà calculés pour ce pixel. */
function shadeCore(prep: PreparedLook, r: number, g: number, b: number, vig: number, noise: number, out: Float32Array | number[]): void {
  // 2. Vibrance.
  const v = prep.vibrance;
  if (v !== 0) {
    const mx = r > g ? (r > b ? r : b) : g > b ? g : b;
    const mn = r < g ? (r < b ? r : b) : g < b ? g : b;
    const sat = mx - mn;
    let w = 1 - sat;
    if (v > 0) w *= 1 - 0.5 * skinWeight(r, g, b, sat);
    let f = 1 + v * w;
    if (f < 0) f = 0;
    const y = REC709[0] * r + REC709[1] * g + REC709[2] * b;
    r = y + (r - y) * f;
    g = y + (g - y) * f;
    b = y + (b - y) * f;
  }
  // 3. Matrice couleur.
  const m = prep.m;
  let R = m[0] * r + m[1] * g + m[2] * b + prep.offset[0];
  let G = m[3] * r + m[4] * g + m[5] * b + prep.offset[1];
  let B = m[6] * r + m[7] * g + m[8] * b + prep.offset[2];
  // 4. Vignettage.
  if (vig !== 1) {
    R *= vig;
    G *= vig;
    B *= vig;
  }
  // 5. Grain.
  if (prep.grain > 0) {
    let y = REC709[0] * R + REC709[1] * G + REC709[2] * B;
    y = y < 0 ? 0 : y > 1 ? 1 : y;
    const n = noise * prep.grain * GRAIN_STRENGTH * (0.4 + 2.4 * y * (1 - y));
    R += n;
    G += n;
    B += n;
  }
  out[0] = R < 0 ? 0 : R > 1 ? 1 : R;
  out[1] = G < 0 ? 0 : G > 1 ? 1 : G;
  out[2] = B < 0 ? 0 : B > 1 ? 1 : B;
}

let cached: { params: Partial<RetouchParams>; lut: Float32Array; w: number; h: number; prep: PreparedLook } | null = null;

/**
 * Rendu d'un pixel (r, g, b ∈ 0–1) à la position (x, y) d'une image de sortie w × h.
 * Utilisé par les tests ; le serveur emploie `processRgbRows`, qui fait exactement la même chose.
 */
export function applyPixel(r: number, g: number, b: number, x: number, y: number, w: number, h: number, params: Partial<RetouchParams>, lut?: Float32Array): [number, number, number] {
  if (!cached || cached.params !== params || cached.w !== w || cached.h !== h || (lut && cached.lut !== lut)) {
    const prep = prepareLook(params, w, h, lut);
    cached = { params, lut: prep.lut, w, h, prep };
  }
  const prep = cached.prep;
  const out = [0, 0, 0];
  shadeToned(prep, sampleLut(prep.lut, r), sampleLut(prep.lut, g), sampleLut(prep.lut, b), (x + 0.5) / w, (y + 0.5) / h, out);
  return [out[0], out[1], out[2]];
}

/**
 * Applique le rendu sur des lignes [y0, y1) d'un tampon RGB(A) 8 bits, en place.
 * `channels` = 3 ou 4 (l'alpha est laissé tel quel).
 */
export function processRgbRows(prep: PreparedLook, data: Uint8Array | Uint8ClampedArray, w: number, h: number, channels: number, y0: number, y1: number): void {
  if (prep.identity) return;
  const lut8 = prep.lut8;
  const [m0, m1, m2, m3, m4, m5, m6, m7, m8] = prep.m;
  const [o0, o1, o2] = prep.offset;
  const fast = prep.vibrance === 0 && prep.vignette <= 0 && prep.grain <= 0;
  if (fast) {
    for (let y = y0; y < y1; y++) {
      for (let x = 0, i = y * w * channels; x < w; x++, i += channels) {
        const r = lut8[data[i]];
        const g = lut8[data[i + 1]];
        const b = lut8[data[i + 2]];
        data[i] = to8(m0 * r + m1 * g + m2 * b + o0);
        data[i + 1] = to8(m3 * r + m4 * g + m5 * b + o1);
        data[i + 2] = to8(m6 * r + m7 * g + m8 * b + o2);
      }
    }
    return;
  }
  // Mêmes formules que shadeToned (vérifié pixel à pixel par les tests), déroulées pour la vitesse.
  const vib = prep.vibrance;
  const hasVig = prep.vignette > 0;
  const grain = prep.grain;
  const hasGrain = grain > 0;
  const ax = prep.vigAx;
  const ay = prep.vigAy;
  const vigNorm = 2 / Math.sqrt(ax * ax + ay * ay);
  const vigAmount = prep.vignette * VIGNETTE_STRENGTH;
  const vigSpan = VIGNETTE_END - VIGNETTE_START;
  const seed = prep.seed;
  // Termes ne dépendant que de la colonne.
  const dx2 = new Float64Array(w);
  const cellX = new Int32Array(w);
  const fxs = new Float64Array(w);
  let maxCell = 0;
  for (let x = 0; x < w; x++) {
    const qx = (x + 0.5) / w;
    const dx = (qx - 0.5) * ax;
    dx2[x] = dx * dx;
    const gx = qx * prep.grainGridX;
    const ix = Math.floor(gx);
    let fx = gx - ix;
    fx = fx * fx * (3 - 2 * fx);
    cellX[x] = ix;
    fxs[x] = fx;
    if (ix > maxCell) maxCell = ix;
  }
  const rowA = new Float64Array(maxCell + 2);
  const rowB = new Float64Array(maxCell + 2);
  const ctx: RowContext = { lut8, m: prep.m, o: prep.offset, vib, hasVig, vigAmount, vigNorm, vigSpan, hasGrain, grain, dx2, cellX, fxs, rowA, rowB };
  for (let y = y0; y < y1; y++) {
    const qy = (y + 0.5) / h;
    const dy = (qy - 0.5) * ay;
    let fy = 0;
    if (hasGrain) {
      const gy = qy * prep.grainGridY;
      const iy = Math.floor(gy);
      fy = gy - iy;
      fy = fy * fy * (3 - 2 * fy);
      for (let c = 0; c <= maxCell + 1; c++) {
        rowA[c] = hash2(c, iy, seed);
        rowB[c] = hash2(c, iy + 1, seed);
      }
    }
    shadeRow(ctx, data, y * w * channels, w, channels, dy * dy, fy);
  }
}

interface RowContext {
  lut8: Float32Array;
  m: ColourMatrix["m"];
  o: ColourMatrix["offset"];
  vib: number;
  hasVig: boolean;
  vigAmount: number;
  vigNorm: number;
  vigSpan: number;
  hasGrain: boolean;
  grain: number;
  dx2: Float64Array;
  cellX: Int32Array;
  fxs: Float64Array;
  rowA: Float64Array;
  rowB: Float64Array;
}

/** Une ligne de pixels (fonction séparée : le JIT l'optimise comme une fonction chaude). */
function shadeRow(c: RowContext, data: Uint8Array | Uint8ClampedArray, start: number, w: number, channels: number, dy2: number, fy: number): void {
  const { lut8, vib, hasVig, vigAmount, vigNorm, vigSpan, hasGrain, grain, dx2, cellX, fxs, rowA, rowB } = c;
  const [m0, m1, m2, m3, m4, m5, m6, m7, m8] = c.m;
  const [o0, o1, o2] = c.o;
  const wr = REC709[0];
  const wg = REC709[1];
  const wb = REC709[2];
  for (let x = 0, i = start; x < w; x++, i += channels) {
    let r = lut8[data[i]];
    let g = lut8[data[i + 1]];
    let b = lut8[data[i + 2]];
    // 2. Vibrance.
    if (vib !== 0) {
      const mx = r > g ? (r > b ? r : b) : g > b ? g : b;
      const mn = r < g ? (r < b ? r : b) : g < b ? g : b;
      const sat = mx - mn;
      let wv = 1 - sat;
      if (vib > 0 && r > g && g > b) wv *= 1 - 0.5 * skinWeight(r, g, b, sat);
      let f = 1 + vib * wv;
      if (f < 0) f = 0;
      const yl = wr * r + wg * g + wb * b;
      r = yl + (r - yl) * f;
      g = yl + (g - yl) * f;
      b = yl + (b - yl) * f;
    }
    // 3. Matrice couleur.
    let R = m0 * r + m1 * g + m2 * b + o0;
    let G = m3 * r + m4 * g + m5 * b + o1;
    let B = m6 * r + m7 * g + m8 * b + o2;
    // 4. Vignettage.
    if (hasVig) {
      let t = (Math.sqrt(dx2[x] + dy2) * vigNorm - VIGNETTE_START) / vigSpan;
      t = t < 0 ? 0 : t > 1 ? 1 : t;
      const v = 1 - vigAmount * (t * t * (3 - 2 * t));
      if (v !== 1) {
        R *= v;
        G *= v;
        B *= v;
      }
    }
    // 5. Grain.
    if (hasGrain) {
      const cx = cellX[x];
      const fx = fxs[x];
      const a = rowA[cx] + (rowA[cx + 1] - rowA[cx]) * fx;
      const bb = rowB[cx] + (rowB[cx + 1] - rowB[cx]) * fx;
      let yl = wr * R + wg * G + wb * B;
      yl = yl < 0 ? 0 : yl > 1 ? 1 : yl;
      const n = (a + (bb - a) * fy - 0.5) * grain * GRAIN_STRENGTH * (0.4 + 2.4 * yl * (1 - yl));
      R += n;
      G += n;
      B += n;
    }
    data[i] = R <= 0 ? 0 : R >= 1 ? 255 : (R * 255 + 0.5) | 0;
    data[i + 1] = G <= 0 ? 0 : G >= 1 ? 255 : (G * 255 + 0.5) | 0;
    data[i + 2] = B <= 0 ? 0 : B >= 1 ? 255 : (B * 255 + 0.5) | 0;
  }
}

function to8(v: number): number {
  return v <= 0 ? 0 : v >= 1 ? 255 : Math.round(v * 255);
}

// ---------------------------------------------------------------------------------------------
// Géométrie

/** Transformation affine : x' = a·x + b·y + c ; y' = d·x + e·y + f. */
export type Affine = [number, number, number, number, number, number];

const MIN_CROP = 0.02;

function mul(A: Affine, B: Affine): Affine {
  return [
    A[0] * B[0] + A[1] * B[3],
    A[0] * B[1] + A[1] * B[4],
    A[0] * B[2] + A[1] * B[5] + A[2],
    A[3] * B[0] + A[4] * B[3],
    A[3] * B[1] + A[4] * B[4],
    A[3] * B[2] + A[4] * B[5] + A[5],
  ];
}

export function applyAffine(m: Affine, x: number, y: number): [number, number] {
  return [m[0] * x + m[1] * y + m[2], m[3] * x + m[4] * y + m[5]];
}

/** Rapport largeur/hauteur (en pixels) d'un format, ou null pour « libre ». */
export function aspectRatioOf(preset: AspectPreset, frameW: number, frameH: number): number | null {
  switch (preset) {
    case "original":
      return frameW / frameH;
    case "free":
      return null;
    case "1:1":
      return 1;
    case "4:5":
      return 4 / 5;
    case "9:16":
      return 9 / 16;
    case "16:9":
      return 16 / 9;
    case "3:2":
      return 3 / 2;
  }
}

/** Zoom automatique du redressement : l'image tournée couvre tout le cadre (pas de coins vides). */
export function straightenZoom(angleDeg: number, frameW: number, frameH: number): number {
  const t = (Math.abs(angleDeg) * Math.PI) / 180;
  if (t === 0) return 1;
  // Petite marge (0,3 %) pour ne jamais voir le bord de l'image une fois les pixels arrondis.
  return (Math.cos(t) + Math.max(frameW / frameH, frameH / frameW) * Math.sin(t)) * 1.003;
}

/**
 * Ajuste un cadre (normalisé dans le cadre redressé) au rapport demandé, en gardant son centre,
 * en le réduisant si besoin, et en le gardant dans l'image.
 */
export function fitCropToAspect(crop: CropRect | null, ratio: number | null, frameW: number, frameH: number): CropRect {
  let { x, y, w, h } = crop ?? { x: 0, y: 0, w: 1, h: 1 };
  w = clamp(w, MIN_CROP, 1);
  h = clamp(h, MIN_CROP, 1);
  if (ratio) {
    const cx = x + w / 2;
    const cy = y + h / 2;
    const current = (w * frameW) / (h * frameH);
    if (Math.abs(current - ratio) > 1e-6) {
      if (current > ratio) w = (h * frameH * ratio) / frameW;
      else h = (w * frameW) / ratio / frameH;
    }
    // Si l'ajustement sort du cadre (cas extrêmes), on réduit encore les deux côtés.
    const over = Math.max(w, h);
    if (over > 1) {
      w /= over;
      h /= over;
    }
    x = cx - w / 2;
    y = cy - h / 2;
  }
  x = clamp(x, 0, 1 - w);
  y = clamp(y, 0, 1 - h);
  return { x, y, w, h };
}

export interface OutputGeometry {
  /** Taille de l'image source (orientation EXIF appliquée). */
  srcW: number;
  srcH: number;
  /** Taille du cadre après rotation de 90° (avant redressement). */
  rotW: number;
  rotH: number;
  /** Angle de redressement (degrés, positif = horaire) et zoom automatique. */
  angle: number;
  zoom: number;
  /** Cadre effectif (normalisé dans le cadre redressé, rapport appliqué). */
  crop: CropRect;
  /** Taille naturelle du cadre entier redressé, en pixels de la source. */
  frameWidth: number;
  frameHeight: number;
  /** Taille naturelle de l'image de sortie (cadre recadré), en pixels de la source. */
  width: number;
  height: number;
  /** Coordonnées normalisées de sortie (u, v) → coordonnées normalisées dans la source (s, t). */
  toSource: Affine;
  /** Idem pour le cadre entier (mode recadrage). */
  frameToSource: Affine;
}

/**
 * Géométrie commune à l'aperçu et à l'export. Ordre : rotation de 90° (horaire), miroir
 * horizontal (dans l'image tournée), redressement autour du centre avec zoom automatique, recadrage.
 */
export function computeOutputGeometry(srcW: number, srcH: number, params: Partial<RetouchParams>): OutputGeometry {
  const p = sanitizeParams(params);
  const quarter = p.rotate === 90 || p.rotate === 270;
  const rotW = quarter ? srcH : srcW;
  const rotH = quarter ? srcW : srcH;
  const angle = p.straighten;
  const zoom = straightenZoom(angle, rotW, rotH);
  const crop = fitCropToAspect(p.crop, aspectRatioOf(p.aspect, rotW, rotH), rotW, rotH);

  const t = (angle * Math.PI) / 180;
  const cos = Math.cos(t);
  const sin = Math.sin(t);
  const cx = rotW / 2;
  const cy = rotH / 2;
  // Cadre (uv) → pixels du cadre.
  const F: Affine = [rotW, 0, 0, 0, rotH, 0];
  // Annule le redressement : P = C + R(−θ)·(X − C) / zoom.
  const iz = 1 / zoom;
  const U: Affine = [cos * iz, sin * iz, 0, -sin * iz, cos * iz, 0];
  const Uc = mul([1, 0, cx, 0, 1, cy], mul(U, [1, 0, -cx, 0, 1, -cy]));
  const Flip: Affine = p.flipH ? [-1, 0, rotW, 0, 1, 0] : [1, 0, 0, 0, 1, 0];
  const N: Affine = [1 / rotW, 0, 0, 0, 1 / rotH, 0];
  const Rinv: Affine =
    p.rotate === 90 ? [0, 1, 0, -1, 0, 1] : p.rotate === 180 ? [-1, 0, 1, 0, -1, 1] : p.rotate === 270 ? [0, -1, 1, 1, 0, 0] : [1, 0, 0, 0, 1, 0];
  const frameToSource = mul(Rinv, mul(N, mul(Flip, mul(Uc, F))));
  const toSource = mul(frameToSource, [crop.w, 0, crop.x, 0, crop.h, crop.y]);
  const frameWidth = rotW / zoom;
  const frameHeight = rotH / zoom;
  return {
    srcW,
    srcH,
    rotW,
    rotH,
    angle,
    zoom,
    crop,
    frameWidth,
    frameHeight,
    width: Math.max(1, Math.round(crop.w * frameWidth)),
    height: Math.max(1, Math.round(crop.h * frameHeight)),
    toSource,
    frameToSource,
  };
}

/** Taille d'export bornée par `maxSize` (plus grand côté), sans agrandir. */
export function scaleToMax(w: number, h: number, maxSize: number | null | undefined): { width: number; height: number; scale: number } {
  const long = Math.max(w, h);
  const scale = maxSize && long > maxSize ? maxSize / long : 1;
  return { width: Math.max(1, Math.round(w * scale)), height: Math.max(1, Math.round(h * scale)), scale };
}

// ---------------------------------------------------------------------------------------------
// WebGL2

export const RETOUCH_VERTEX_SHADER = `#version 300 es
in vec2 aPos;
void main() { gl_Position = vec4(aPos, 0.0, 1.0); }
`;

const glf = (v: number) => (Number.isInteger(v) ? `${v}.0` : String(v));

/**
 * Fragment shader de l'aperçu : mêmes formules que shadeToned() ci-dessus. La courbe de tons
 * est la LUT calculée en JS (buildToneLut), envoyée en texture R32F 1024×1 et lue par texelFetch
 * avec la même interpolation linéaire que sampleLut().
 */
export const RETOUCH_FRAGMENT_SHADER = `#version 300 es
precision highp float;
precision highp int;
precision highp sampler2D;

uniform sampler2D uSrc;
uniform sampler2D uLut;
uniform int uLutSize;
uniform vec3 uToS0;
uniform vec3 uToS1;
uniform vec4 uView;
uniform float uCanvasH;
uniform vec4 uFx;
uniform vec2 uVigAxes;
uniform vec2 uGrainGrid;
uniform mat3 uMatrix;
uniform vec3 uOffset;
uniform float uVibrance;
uniform float uVignette;
uniform float uGrain;
uniform uint uSeed;
uniform bool uBypass;

out vec4 fragColor;

const vec3 REC709 = vec3(${glf(REC709[0])}, ${glf(REC709[1])}, ${glf(REC709[2])});

float lut(float x) {
  float f = clamp(x, 0.0, 1.0) * float(uLutSize - 1);
  int i = int(floor(f));
  int j = min(i + 1, uLutSize - 1);
  float t = f - float(i);
  float a = texelFetch(uLut, ivec2(i, 0), 0).r;
  float b = texelFetch(uLut, ivec2(j, 0), 0).r;
  return a + (b - a) * t;
}

float skinWeight(vec3 c, float sat) {
  if (!(c.r > c.g && c.g > c.b)) return 0.0;
  float t = (c.g - c.b) / (c.r - c.b);
  float hue = smoothstep(0.08, 0.25, t) * (1.0 - smoothstep(0.55, 0.8, t));
  float s = smoothstep(0.04, 0.12, sat) * (1.0 - smoothstep(0.45, 0.7, sat));
  return hue * s;
}

float hash2(uint x, uint y) {
  uint h = (x * 0x8da6b343u) ^ (y * 0xd8163841u) ^ (uSeed * 0xcb1ab31fu);
  h ^= h >> 16u;
  h *= 0x7feb352du;
  h ^= h >> 15u;
  h *= 0x846ca68bu;
  h ^= h >> 16u;
  return float(h) / 4294967295.0;
}

float grainNoise(vec2 g) {
  vec2 i = floor(g);
  vec2 f = g - i;
  f = f * f * (3.0 - 2.0 * f);
  ivec2 ii = ivec2(i);
  uint x0 = uint(ii.x);
  uint y0 = uint(ii.y);
  float n00 = hash2(x0, y0);
  float n10 = hash2(x0 + 1u, y0);
  float n01 = hash2(x0, y0 + 1u);
  float n11 = hash2(x0 + 1u, y0 + 1u);
  float a = n00 + (n10 - n00) * f.x;
  float b = n01 + (n11 - n01) * f.x;
  return a + (b - a) * f.y - 0.5;
}

vec3 shade(vec3 c, vec2 q) {
  c = vec3(lut(c.r), lut(c.g), lut(c.b));
  if (uVibrance != 0.0) {
    float mx = max(c.r, max(c.g, c.b));
    float mn = min(c.r, min(c.g, c.b));
    float sat = mx - mn;
    float w = 1.0 - sat;
    if (uVibrance > 0.0) w *= 1.0 - 0.5 * skinWeight(c, sat);
    float f = max(0.0, 1.0 + uVibrance * w);
    float y = dot(c, REC709);
    c = vec3(y) + (c - vec3(y)) * f;
  }
  c = uMatrix * c + uOffset;
  if (uVignette > 0.0) {
    vec2 d2 = (q - 0.5) * uVigAxes;
    float d = length(d2) * 2.0 / length(uVigAxes);
    c *= 1.0 - uVignette * ${glf(VIGNETTE_STRENGTH)} * smoothstep(${glf(VIGNETTE_START)}, ${glf(VIGNETTE_END)}, d);
  }
  if (uGrain > 0.0) {
    float y = clamp(dot(c, REC709), 0.0, 1.0);
    float n = grainNoise(q * uGrainGrid) * uGrain * ${glf(GRAIN_STRENGTH)} * (0.4 + 2.4 * y * (1.0 - y));
    c += vec3(n);
  }
  return clamp(c, 0.0, 1.0);
}

void main() {
  vec2 p = vec2(gl_FragCoord.x, uCanvasH - gl_FragCoord.y);
  vec2 uv = (p - uView.xy) / uView.zw;
  if (uv.x < 0.0 || uv.y < 0.0 || uv.x > 1.0 || uv.y > 1.0) {
    fragColor = vec4(0.0);
    return;
  }
  vec3 st = vec3(uv, 1.0);
  vec3 c = texture(uSrc, vec2(dot(uToS0, st), dot(uToS1, st))).rgb;
  if (!uBypass) c = shade(c, (uv - uFx.xy) / uFx.zw);
  fragColor = vec4(c, 1.0);
}
`;

// ---------------------------------------------------------------------------------------------
// Filtre SVG (vidéo et images dans une composition HTML)

const fmt = (v: number) => {
  const s = v.toFixed(4);
  return s.replace(/\.?0+$/, "") || "0";
};

/**
 * Filtre SVG (feComponentTransfer + feColorMatrix) approchant le look, pour l'appliquer à des
 * vidéos/images dans une composition HTML (HyperFrames). Renvoie le markup <filter id=...>…</filter>.
 *
 * Approximation documentée : la courbe de tons est échantillonnée sur 33 points (interpolation
 * linéaire du navigateur), la vibrance est remplacée par un supplément de saturation (moitié de
 * sa valeur), le vignettage et le grain sont omis (ils dépendent de la position du pixel) — à
 * recréer en CSS si besoin (dégradé radial par-dessus la vidéo).
 * S'utilise avec style="filter:url(#id)" ; color-interpolation-filters="sRGB" garantit le même
 * espace de travail que l'aperçu et l'export.
 */
export function lookToSvgFilter(id: string, p: Partial<RetouchParams> | null | undefined): string {
  const params = sanitizeParams(p);
  const lut = buildToneLut(params, 256);
  const table: string[] = [];
  for (let i = 0; i <= 32; i++) table.push(fmt(sampleLut(lut, i / 32)));
  const values = table.join(" ");
  const cm = colourMatrix(params, (params.vibrance / 100) * 0.5);
  const m = cm.m;
  const o = cm.offset;
  const matrix = [m[0], m[1], m[2], 0, o[0], m[3], m[4], m[5], 0, o[1], m[6], m[7], m[8], 0, o[2], 0, 0, 0, 1, 0].map(fmt).join(" ");
  const safeId = String(id).replace(/[^A-Za-z0-9_-]/g, "-");
  return (
    `<filter id="${safeId}" color-interpolation-filters="sRGB" x="0" y="0" width="100%" height="100%">` +
    `<feComponentTransfer><feFuncR type="table" tableValues="${values}"/><feFuncG type="table" tableValues="${values}"/><feFuncB type="table" tableValues="${values}"/></feComponentTransfer>` +
    `<feColorMatrix type="matrix" values="${matrix}"/>` +
    `</filter>`
  );
}
