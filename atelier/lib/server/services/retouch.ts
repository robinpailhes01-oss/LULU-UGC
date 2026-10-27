import "server-only";
import { createHash } from "node:crypto";
import sharp, { type Exif as SharpExif, type Metadata as SharpMetadata } from "sharp";
import { z } from "zod";
import { HttpError, badRequest, notFound } from "@/lib/server/http";
import { logActivity } from "@/lib/server/repo/activity";
import { getAsset, getStorageKeys, requireAsset, updateAsset } from "@/lib/server/repo/assets";
import { getFolder } from "@/lib/server/repo/folders";
import { getStore } from "@/lib/server/storage";
import { getLook } from "@/lib/server/services/looks";
import { addServerAsset } from "@/lib/server/services/uploads";
import {
  ASPECT_PRESETS,
  NEUTRAL_PARAMS,
  applyLook,
  computeOutputGeometry,
  prepareLook,
  processRgbRows,
  sanitizeParams,
  scaleToMax,
  sharpenOptions,
  srgbToLinear,
} from "@/lib/shared/look";
import type { Asset, AspectPreset, RetouchParams } from "@/lib/shared/types";

/**
 * CONTRAT (fondation) — implémenté par le module Retouche.
 * Exporte une version retouchée d'une photo (rendu pleine résolution côté serveur avec les mêmes
 * calculs que l'aperçu WebGL, lib/shared/look.ts). Crée un nouveau média (source « retouch »,
 * parentAssetId = original) dans le même dossier que l'original, ou dans `opts.folderId`.
 * L'original n'est jamais modifié.
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

// ---------------------------------------------------------------------------------------------
// Validation partagée (routes et agent)

const num = z.number();

/** Réglages de retouche reçus de l'extérieur ; les valeurs sont ensuite bornées par sanitizeParams. */
export const RetouchParamsSchema = z
  .object({
    exposure: num,
    contrast: num,
    highlights: num,
    shadows: num,
    whites: num,
    blacks: num,
    temperature: num,
    tint: num,
    saturation: num,
    vibrance: num,
    fade: num,
    vignette: num,
    grain: num,
    sharpen: num,
    rotate: z.union([z.literal(0), z.literal(90), z.literal(180), z.literal(270)]),
    flipH: z.boolean(),
    straighten: num,
    aspect: z.enum(ASPECT_PRESETS as [AspectPreset, ...AspectPreset[]]),
    crop: z.object({ x: num.min(0).max(1), y: num.min(0).max(1), w: num.min(0).max(1), h: num.min(0).max(1) }).nullable(),
  })
  .partial();

export const RetouchExportOptionsSchema = z
  .object({
    name: z.string().trim().min(1).max(200),
    format: z.enum(["jpeg", "webp", "png"]),
    quality: z.number().int().min(1).max(100),
    maxSize: z.number().int().min(64).max(20000).nullable(),
    folderId: z.string().uuid().nullable(),
  })
  .partial();

// ---------------------------------------------------------------------------------------------
// Erreurs lisibles

const HEIC_MESSAGE =
  "Les photos HEIC ne peuvent pas encore être retouchées ici. Convertissez-la en JPEG (sur iPhone : Réglages › Appareil photo › Formats › « Le plus compatible ») puis importez-la à nouveau.";

function isHeic(mime: string, name: string): boolean {
  return /image\/hei[cf]/i.test(mime) || /\.(heic|heif)$/i.test(name);
}

function assertRetouchable(asset: Asset) {
  if (asset.kind !== "photo") {
    throw badRequest(asset.kind === "video" ? "Les vidéos se retouchent dans le montage : seules les photos passent par la retouche." : "Seules les photos peuvent être retouchées.");
  }
  if (asset.status !== "ready") throw badRequest("Cette photo n'est pas encore entièrement importée.");
  if (asset.trashedAt) throw badRequest("Cette photo est dans la corbeille : restaurez-la avant de la retoucher.");
}

async function readOriginal(asset: Asset): Promise<Buffer> {
  const k = await getStorageKeys(asset.id);
  if (!k) throw notFound("Média");
  try {
    return await getStore().getBuffer(k.original);
  } catch {
    throw new HttpError(404, "not_found", "Le fichier d'origine est introuvable dans le stockage.");
  }
}

/** Ouvre la photo avec sharp ; erreur française claire si le format n'est pas décodable. */
async function openImage(input: Buffer, asset: Asset): Promise<{ width: number; height: number }> {
  let meta: SharpMetadata;
  try {
    meta = await sharp(input, { failOn: "none" }).metadata();
  } catch {
    throw badRequest(isHeic(asset.mime, asset.name) ? HEIC_MESSAGE : "Impossible de lire cette photo : le fichier semble endommagé ou dans un format non pris en charge.");
  }
  if (meta.format === "heif" && meta.compression !== "av1") throw badRequest(HEIC_MESSAGE);
  const width = meta.autoOrient?.width ?? meta.width;
  const height = meta.autoOrient?.height ?? meta.height;
  if (!width || !height) throw badRequest("Impossible de lire les dimensions de cette photo.");
  return { width, height };
}

// ---------------------------------------------------------------------------------------------
// Rendu

export interface RenderedRetouch {
  data: Buffer;
  mime: string;
  ext: string;
  width: number;
  height: number;
  /** Pixels RGB 8 bits du rendu (avant encodage), pour la vignette et les mesures. */
  rgb: Buffer;
}

const LIMIT_PIXELS = 400_000_000;
/** Pixels traités entre deux pauses de la boucle d'événements. */
const CHUNK_PIXELS = 1_500_000;

/**
 * Rendu pleine résolution : orientation EXIF → miroir / rotation / redressement → recadrage →
 * réduction éventuelle → couleur (processRgbRows, mêmes formules que le shader) → netteté →
 * encodage. Les miroirs de sharp s'appliquent toujours avant la rotation : un miroir horizontal
 * après un quart de tour devient donc un miroir vertical avant ce quart de tour.
 */
export async function renderRetouch(input: Buffer, params: RetouchParams, opts: { maxSize?: number | null; format?: RetouchExportOptions["format"]; quality?: number } = {}): Promise<RenderedRetouch> {
  const p = sanitizeParams(params);
  const oriented = await sharp(input, { failOn: "none", limitInputPixels: LIMIT_PIXELS })
    .autoOrient()
    .flatten({ background: "#ffffff" })
    .toColourspace("srgb")
    .raw({ depth: "uchar" })
    .toBuffer({ resolveWithObject: true });
  const W0 = oriented.info.width;
  const H0 = oriented.info.height;
  const src = { raw: { width: W0, height: H0, channels: oriented.info.channels as 3 } };

  const g = computeOutputGeometry(W0, H0, p);
  const out = scaleToMax(g.width, g.height, opts.maxSize ?? null);
  const quarter = p.rotate === 90 || p.rotate === 270;

  let geo = sharp(oriented.data, src);
  if (p.flipH) geo = quarter ? geo.flip() : geo.flop();
  let region: { left: number; top: number; width: number; height: number };
  let canvas: { data: Buffer; width: number; height: number; channels: 1 | 2 | 3 | 4 };
  if (p.straighten === 0) {
    if (p.rotate) geo = geo.rotate(p.rotate);
    const rotated = await geo.raw().toBuffer({ resolveWithObject: true });
    canvas = { data: rotated.data, width: rotated.info.width, height: rotated.info.height, channels: rotated.info.channels };
    region = { left: g.crop.x * g.rotW, top: g.crop.y * g.rotH, width: g.width, height: g.height };
  } else {
    // Une seule rotation par pipeline : quart de tour et redressement s'additionnent.
    const rotated = await geo.rotate(p.rotate + p.straighten, { background: "#000000" }).raw().toBuffer({ resolveWithObject: true });
    canvas = { data: rotated.data, width: rotated.info.width, height: rotated.info.height, channels: rotated.info.channels };
    // Le cadre redressé (zoomé) est centré dans la toile agrandie par la rotation.
    region = {
      left: canvas.width / 2 + (g.crop.x - 0.5) * g.frameWidth,
      top: canvas.height / 2 + (g.crop.y - 0.5) * g.frameHeight,
      width: g.width,
      height: g.height,
    };
  }
  const width = Math.min(region.width, canvas.width);
  const height = Math.min(region.height, canvas.height);
  const left = Math.max(0, Math.min(canvas.width - width, Math.round(region.left)));
  const top = Math.max(0, Math.min(canvas.height - height, Math.round(region.top)));

  let crop = sharp(canvas.data, { raw: { width: canvas.width, height: canvas.height, channels: canvas.channels } });
  if (left !== 0 || top !== 0 || width !== canvas.width || height !== canvas.height) crop = crop.extract({ left, top, width, height });
  if (out.width !== width || out.height !== height) crop = crop.resize(out.width, out.height, { fit: "fill", kernel: "lanczos3" });
  const pixels = await crop.removeAlpha().raw().toBuffer({ resolveWithObject: true });
  if (pixels.info.channels !== 3) throw new Error("Rendu inattendu : la photo n'est pas en RVB.");
  const rgb = pixels.data;
  const W = pixels.info.width;
  const H = pixels.info.height;

  // Couleur, par tranches pour ne pas bloquer le serveur trop longtemps.
  const prep = prepareLook(p, W, H);
  const rowsPerChunk = Math.max(1, Math.floor(CHUNK_PIXELS / W));
  for (let y = 0; y < H; y += rowsPerChunk) {
    processRgbRows(prep, rgb, W, H, 3, y, Math.min(H, y + rowsPerChunk));
    if (y + rowsPerChunk < H) await new Promise<void>((resolve) => setImmediate(resolve));
  }

  let enc = sharp(rgb, { raw: { width: W, height: H, channels: 3 } });
  const sh = sharpenOptions(p.sharpen, Math.max(W, H));
  if (sh) enc = enc.sharpen(sh);
  enc = enc.withIccProfile("srgb");
  const exif = await exifToKeep(input);
  if (exif) enc = enc.withExif(exif);
  const format = opts.format ?? "jpeg";
  const quality = Math.round(Math.min(100, Math.max(1, opts.quality ?? 90)));
  if (format === "webp") enc = enc.webp({ quality });
  else if (format === "png") enc = enc.png({ compressionLevel: 8 });
  // mozjpeg ; au-delà de 12 Mpx on saute l'optimisation des passes progressives (2× plus rapide, +10 % de poids).
  else enc = enc.jpeg({ quality, mozjpeg: true, optimiseScans: W * H <= 12_000_000 });
  const data = await enc.toBuffer();
  return {
    data,
    mime: format === "webp" ? "image/webp" : format === "png" ? "image/png" : "image/jpeg",
    ext: format === "webp" ? "webp" : format === "png" ? "png" : "jpg",
    width: W,
    height: H,
    rgb,
  };
}

/** Date de prise de vue et appareil conservés ; GPS et le reste retirés. */
async function exifToKeep(input: Buffer): Promise<SharpExif | null> {
  try {
    const exifr = (await import("exifr")).default;
    const ex = (await exifr.parse(input, {
      pick: ["Make", "Model", "DateTimeOriginal", "CreateDate", "OffsetTimeOriginal", "LensModel"],
      reviveValues: false,
      gps: false,
    })) as Record<string, unknown> | undefined;
    const ifd0: Record<string, string> = { Software: "Atelier June" };
    const ifd2: Record<string, string> = {};
    const str = (v: unknown) => (typeof v === "string" && v.trim() ? v.trim().slice(0, 120) : null);
    if (str(ex?.Make)) ifd0.Make = str(ex?.Make)!;
    if (str(ex?.Model)) ifd0.Model = str(ex?.Model)!;
    const date = str(ex?.DateTimeOriginal) ?? str(ex?.CreateDate);
    if (date && /^\d{4}:\d{2}:\d{2} \d{2}:\d{2}:\d{2}/.test(date)) ifd2.DateTimeOriginal = date.slice(0, 19);
    if (str(ex?.OffsetTimeOriginal)) ifd2.OffsetTimeOriginal = str(ex?.OffsetTimeOriginal)!;
    if (str(ex?.LensModel)) ifd2.LensModel = str(ex?.LensModel)!;
    return Object.keys(ifd2).length ? { IFD0: ifd0, IFD2: ifd2 } : { IFD0: ifd0 };
  } catch {
    return { IFD0: { Software: "Atelier June" } };
  }
}

// ---------------------------------------------------------------------------------------------
// Mesures (mêmes que celles calculées à l'envoi dans le navigateur)

export interface ImageFacts {
  dhash: string;
  blurScore: number;
  lumaMean: number;
  clipHigh: number;
  clipLow: number;
}

/**
 * dHash 64 bits (luminance 9×8, bit = pixel gauche plus clair que son voisin de droite, lecture
 * ligne par ligne, bit de poids fort en premier), netteté = variance du laplacien sur 256 px,
 * luminance moyenne et parts de pixels ≥ 250 / ≤ 5 (sur 255).
 */
export async function measureImage(image: Buffer): Promise<ImageFacts> {
  const small = await sharp(image).resize(256, 256, { fit: "inside" }).greyscale().raw().toBuffer({ resolveWithObject: true });
  const { data, info } = small;
  const w = info.width;
  const h = info.height;
  const ch = info.channels;
  let sum = 0;
  let hi = 0;
  let lo = 0;
  const n = w * h;
  for (let i = 0; i < n; i++) {
    const v = data[i * ch];
    sum += v;
    if (v >= 250) hi++;
    if (v <= 5) lo++;
  }
  let lsum = 0;
  let lsum2 = 0;
  let ln = 0;
  for (let y = 1; y < h - 1; y++) {
    for (let x = 1; x < w - 1; x++) {
      const i = (y * w + x) * ch;
      const lap = data[i - ch] + data[i + ch] + data[i - w * ch] + data[i + w * ch] - 4 * data[i];
      lsum += lap;
      lsum2 += lap * lap;
      ln++;
    }
  }
  const mean = ln ? lsum / ln : 0;
  const blurScore = ln ? lsum2 / ln - mean * mean : 0;

  const tiny = await sharp(image).resize(9, 8, { fit: "fill" }).greyscale().raw().toBuffer({ resolveWithObject: true });
  let hash = BigInt(0);
  for (let y = 0; y < 8; y++) {
    for (let x = 0; x < 8; x++) {
      const i = (y * 9 + x) * tiny.info.channels;
      hash = (hash << BigInt(1)) | (tiny.data[i] > tiny.data[i + tiny.info.channels] ? BigInt(1) : BigInt(0));
    }
  }
  return {
    dhash: hash.toString(16).padStart(16, "0"),
    blurScore: Math.round(blurScore * 100) / 100,
    lumaMean: Math.round((sum / n / 255) * 10000) / 10000,
    clipHigh: Math.round((hi / n) * 10000) / 10000,
    clipLow: Math.round((lo / n) * 10000) / 10000,
  };
}

// ---------------------------------------------------------------------------------------------
// Export

function baseName(name: string): string {
  return name.replace(/\.[a-z0-9]{1,8}$/i, "").trim() || "Photo";
}

function withExt(name: string, ext: string): string {
  const clean = name.replace(/[\\/]/g, "-").trim();
  return /\.[a-z0-9]{1,8}$/i.test(clean) ? clean.replace(/\.[a-z0-9]{1,8}$/i, `.${ext}`) : `${clean}.${ext}`;
}

async function exportInternal(asset: Asset, params: Partial<RetouchParams>, opts: RetouchExportOptions, actor: string | null, log: boolean): Promise<Asset> {
  assertRetouchable(asset);
  const input = await readOriginal(asset);
  await openImage(input, asset);
  const p = sanitizeParams(params);
  const folderId = opts.folderId !== undefined ? opts.folderId : asset.folderId;
  if (folderId && !(await getFolder(folderId))) throw notFound("Dossier");
  const rendered = await renderRetouch(input, p, { maxSize: opts.maxSize, format: opts.format, quality: opts.quality });
  const thumb = await sharp(rendered.rgb, { raw: { width: rendered.width, height: rendered.height, channels: 3 } })
    .resize(640, 640, { fit: "inside", withoutEnlargement: true })
    .webp({ quality: 80 })
    .toBuffer();
  const facts = await measureImage(thumb);
  const name = withExt(opts.name?.trim() ? opts.name : `${baseName(asset.name)} (retouche)`, rendered.ext);
  const created = await addServerAsset(
    {
      name,
      mime: rendered.mime,
      data: rendered.data,
      folderId,
      source: "retouch",
      parentAssetId: asset.id,
      edit: p,
      tags: asset.tags,
      thumb,
      facts: {
        width: rendered.width,
        height: rendered.height,
        durationS: null,
        takenAt: asset.takenAt,
        camera: asset.camera,
        gps: null,
        sha256: createHash("sha256").update(rendered.data).digest("hex"),
        ...facts,
        hasThumb: true,
        hasPoster: false,
      },
    },
    actor,
  );
  // L'analyse IA (titre, description, mots-clés) reste valable pour la version retouchée.
  const final = asset.ai ? await updateAsset(created.id, { ai: asset.ai }, actor) : created;
  if (log) await logActivity({ actor, verb: "a retouché", objectType: "asset", objectId: final.id, summary: `${asset.name} → ${final.name}`, meta: { parentAssetId: asset.id } });
  return final;
}

export async function exportRetouch(assetId: string, params: Partial<RetouchParams>, opts: RetouchExportOptions, actor: string | null): Promise<Asset> {
  return exportInternal(await requireAsset(assetId), params, opts, actor, true);
}

// ---------------------------------------------------------------------------------------------
// Réglages automatiques

const round = (v: number, step = 1) => Number((Math.round(v / step) * step).toFixed(2));
const clampN = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));

/** Propose des réglages pour une photo (analyse d'histogramme côté serveur, sans IA). */
export async function suggestAutoParams(assetId: string): Promise<Partial<RetouchParams>> {
  const asset = await requireAsset(assetId);
  assertRetouchable(asset);
  const input = await readOriginal(asset);
  await openImage(input, asset);
  const { data, info } = await sharp(input, { failOn: "none", limitInputPixels: LIMIT_PIXELS })
    .autoOrient()
    .flatten({ background: "#ffffff" })
    .toColourspace("srgb")
    .resize(512, 512, { fit: "inside" })
    .raw({ depth: "uchar" })
    .toBuffer({ resolveWithObject: true });
  return suggestFromPixels(data, info.width * info.height, info.channels);
}

/** Règles simples et prudentes, jamais extrêmes (exportées pour les tests). */
export function suggestFromPixels(data: Uint8Array, n: number, ch: number): Partial<RetouchParams> {
  const hist = new Uint32Array(256);
  let sum = 0;
  let sum2 = 0;
  let mr = 0;
  let mg = 0;
  let mb = 0;
  let mid = 0;
  let satSum = 0;
  for (let i = 0; i < n; i++) {
    const r = data[i * ch] / 255;
    const g = data[i * ch + 1] / 255;
    const b = data[i * ch + 2] / 255;
    const y = 0.2126 * r + 0.7152 * g + 0.0722 * b;
    hist[Math.min(255, Math.round(y * 255))]++;
    sum += y;
    sum2 += y * y;
    const mx = Math.max(r, g, b);
    const mn = Math.min(r, g, b);
    satSum += mx - mn;
    // Monde gris sur les tons moyens peu saturés (on ignore ciels brûlés, noirs et couleurs vives).
    if (y > 0.12 && y < 0.88 && mx - mn < 0.45) {
      mr += r;
      mg += g;
      mb += b;
      mid++;
    }
  }
  const pct = (q: number) => {
    const target = q * n;
    let acc = 0;
    for (let v = 0; v < 256; v++) {
      acc += hist[v];
      if (acc >= target) return v / 255;
    }
    return 1;
  };
  const mean = sum / n;
  const std = Math.sqrt(Math.max(0, sum2 / n - mean * mean));
  const p005 = pct(0.005);
  const p05 = pct(0.05);
  const p50 = pct(0.5);
  const p995 = pct(0.995);
  const clipHigh = (hist[254] + hist[255]) / n;

  const out: Partial<RetouchParams> = {};
  // Exposition : ramène la médiane vers un gris moyen, amortie (les scènes claires restent claires).
  let ev = Math.log2(srgbToLinear(0.46) / Math.max(srgbToLinear(Math.max(p50, 0.02)), 1e-4)) * 0.55;
  if (p50 > 0.55) ev = Math.max(ev, -0.4);
  // Scènes sombres voulues (intérieurs du soir) : on éclaircit sans aplatir l'ambiance.
  ev = clampN(ev, -0.6, p50 < 0.2 ? 0.7 : 0.8);
  if (Math.abs(ev) >= 0.1) out.exposure = round(ev, 0.05);
  // Points blanc et noir.
  if (p995 < 0.92) out.whites = round(clampN((0.97 - p995) * 220, 0, 25));
  if (p005 > 0.07) out.blacks = -round(clampN((p005 - 0.03) * 220, 0, 25));
  // Hautes lumières brûlées, ombres bouchées.
  if (clipHigh > 0.01) out.highlights = -round(clampN(clipHigh * 700, 10, 40));
  if (p05 < 0.06 && p50 < 0.38) out.shadows = round(clampN((0.4 - p50) * 90, 5, 30));
  // Contraste selon l'étendue des tons.
  if (std < 0.16) out.contrast = round(clampN((0.2 - std) * 220, 4, 20));
  else if (std > 0.29) out.contrast = -round(clampN((std - 0.27) * 160, 4, 15));
  // Balance des blancs : correction partielle, on refroidit moins qu'on ne réchauffe (lumière June).
  if (mid > n * 0.05) {
    mr /= mid;
    mg /= mid;
    mb /= mid;
    const avg = (mr + mg + mb) / 3;
    let temp = ((mb - mr) / Math.max(avg, 0.05)) * 90;
    // Le monde gris se trompe sur les lumières chaudes voulues (heure dorée, bougies) : refroidir peu.
    temp = temp < 0 ? temp * 0.3 : temp * 0.7;
    temp = clampN(temp, -8, 20);
    if (Math.abs(temp) >= 3) out.temperature = round(temp);
    const tint = clampN(((mg - (mr + mb) / 2) / Math.max(avg, 0.05)) * 90 * 0.5, -10, 10);
    if (Math.abs(tint) >= 3) out.tint = round(tint);
  }
  // Couleurs ternes : un peu de vibrance.
  const meanSat = satSum / n;
  if (meanSat < 0.12) out.vibrance = 12;
  else if (meanSat < 0.2) out.vibrance = 6;
  return out;
}

// ---------------------------------------------------------------------------------------------
// Application d'un look à plusieurs photos

export interface BatchLookInput {
  assetIds: string[];
  lookId?: string | null;
  /** Réglages explicites (si pas de look). */
  params?: Partial<RetouchParams> | null;
  /** Intensité 0–1 (défaut 1). */
  intensity?: number;
  options?: Pick<RetouchExportOptions, "maxSize" | "quality" | "folderId">;
}

export interface BatchLookResult {
  created: Asset[];
  errors: { id: string; name: string | null; message: string }[];
  lookName: string | null;
}

/**
 * Crée une nouvelle version de chaque photo avec le look (à côté de l'original). Si une photo
 * est elle-même une retouche, on repart de son original en gardant son recadrage.
 */
export async function applyLookToAssets(input: BatchLookInput, actor: string | null): Promise<BatchLookResult> {
  const ids = [...new Set(input.assetIds)];
  if (ids.length === 0) throw badRequest("Choisissez au moins une photo.");
  let lookParams: Partial<RetouchParams>;
  let lookName: string | null = null;
  if (input.lookId) {
    const look = await getLook(input.lookId);
    if (!look) throw notFound("Look");
    lookParams = look.params;
    lookName = look.name;
  } else if (input.params) {
    lookParams = input.params;
  } else {
    throw badRequest("Indiquez un look ou des réglages.");
  }
  const intensity = clampN(input.intensity ?? 1, 0, 1);
  const created: Asset[] = [];
  const errors: BatchLookResult["errors"] = [];
  for (const id of ids) {
    const asset = await getAsset(id);
    if (!asset) {
      errors.push({ id, name: null, message: "Média introuvable." });
      continue;
    }
    try {
      let base = asset;
      let baseParams: RetouchParams = { ...NEUTRAL_PARAMS };
      if (asset.source === "retouch" && asset.parentAssetId && asset.edit) {
        const parent = await getAsset(asset.parentAssetId);
        if (parent && parent.kind === "photo" && parent.status === "ready" && !parent.trashedAt) {
          base = parent;
          baseParams = sanitizeParams(asset.edit);
        }
      }
      const params = input.lookId || !input.params ? applyLook(baseParams, lookParams, intensity) : { ...sanitizeParams(lookParams), ...geometryOf(baseParams) };
      const name = lookName ? `${baseName(base.name)} – ${lookName}` : `${baseName(base.name)} (retouche)`;
      const folderId = input.options?.folderId !== undefined ? input.options.folderId : asset.folderId;
      created.push(await exportInternal(base, params, { name, folderId, maxSize: input.options?.maxSize, quality: input.options?.quality }, actor, false));
    } catch (err) {
      errors.push({ id, name: asset.name, message: err instanceof Error ? err.message : "Erreur inattendue." });
    }
  }
  if (created.length > 0) {
    await logActivity({
      actor,
      verb: lookName ? `a appliqué le look « ${lookName} » à` : "a retouché",
      objectType: "asset",
      objectId: created.length === 1 ? created[0].id : null,
      summary: `${created.length} photo${created.length > 1 ? "s" : ""}`,
      meta: { ids: created.map((a) => a.id), parents: created.map((a) => a.parentAssetId) },
    });
  }
  return { created, errors, lookName };
}

function geometryOf(p: RetouchParams): Pick<RetouchParams, "rotate" | "flipH" | "straighten" | "aspect" | "crop"> {
  return { rotate: p.rotate, flipH: p.flipH, straighten: p.straighten, aspect: p.aspect, crop: p.crop };
}
