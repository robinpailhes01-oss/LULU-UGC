/**
 * Travail sur les pixels, utilisable dans le navigateur ET dans un Web Worker (OffscreenCanvas) :
 * réduction en vignette, encodage WebP, mesures de netteté, d'exposition et empreinte dHash.
 * Aucune dépendance au DOM quand OffscreenCanvas est disponible.
 */

export type AnyCanvas = OffscreenCanvas | HTMLCanvasElement;
type Ctx2D = OffscreenCanvasRenderingContext2D | CanvasRenderingContext2D;
/** Sources dessinables (ImageBitmap partout ; <video>/<img> seulement sur le fil principal). */
export type Drawable = ImageBitmap | AnyCanvas | HTMLVideoElement | HTMLImageElement;

export interface PixelMetrics {
  /** Empreinte perceptuelle 64 bits, 16 caractères hexadécimaux. */
  dhash: string;
  /** Variance du laplacien sur une version 256 px de large en niveaux de gris (0–255). */
  blurScore: number;
  /** Luminance moyenne 0–1. */
  lumaMean: number;
  /** Part des pixels de luminance > 0,97 et < 0,03. */
  clipHigh: number;
  clipLow: number;
}

export interface ThumbResult {
  thumb: Blob;
  thumbWidth: number;
  thumbHeight: number;
  metrics: PixelMetrics;
}

export const THUMB_MAX_SIDE = 640;
const METRICS_WIDTH = 256;

export function makeCanvas(w: number, h: number): AnyCanvas {
  const width = Math.max(1, Math.round(w));
  const height = Math.max(1, Math.round(h));
  if (typeof OffscreenCanvas !== "undefined") {
    try {
      return new OffscreenCanvas(width, height);
    } catch {
      /* repli sur un canvas classique */
    }
  }
  if (typeof document === "undefined") throw new Error("Aucun canvas disponible");
  const c = document.createElement("canvas");
  c.width = width;
  c.height = height;
  return c;
}

function context(c: AnyCanvas, readback = false): Ctx2D {
  const ctx = (c as HTMLCanvasElement).getContext("2d", readback ? { willReadFrequently: true } : { alpha: true }) as Ctx2D | null;
  if (!ctx) throw new Error("Canvas 2D indisponible");
  return ctx;
}

export function sourceSize(src: Drawable): { width: number; height: number } {
  if (typeof HTMLVideoElement !== "undefined" && src instanceof HTMLVideoElement) return { width: src.videoWidth, height: src.videoHeight };
  if (typeof HTMLImageElement !== "undefined" && src instanceof HTMLImageElement) return { width: src.naturalWidth, height: src.naturalHeight };
  return { width: (src as ImageBitmap).width, height: (src as ImageBitmap).height };
}

/** Taille cible : grand côté ≤ maxSide, jamais d'agrandissement. */
export function fitWithin(width: number, height: number, maxSide: number): { width: number; height: number } {
  const scale = Math.min(1, maxSide / Math.max(width, height));
  return { width: Math.max(1, Math.round(width * scale)), height: Math.max(1, Math.round(height * scale)) };
}

/**
 * Réduit une image avec un rendu propre : réductions successives par moitié tant que l'écart est
 * grand (évite l'aliasing des grosses réductions en une passe), puis une dernière passe lissée.
 */
export function downscale(src: Drawable, maxSide: number): AnyCanvas {
  const { width: sw, height: sh } = sourceSize(src);
  if (!sw || !sh) throw new Error("Image vide");
  const target = fitWithin(sw, sh, maxSide);
  let current: Drawable = src;
  let cw = sw;
  let ch = sh;
  while (cw / 2 >= target.width * 1.5 && ch / 2 >= target.height * 1.5) {
    const nw = Math.round(cw / 2);
    const nh = Math.round(ch / 2);
    const step = makeCanvas(nw, nh);
    const ctx = context(step);
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = "high";
    ctx.drawImage(current as CanvasImageSource, 0, 0, nw, nh);
    current = step;
    cw = nw;
    ch = nh;
  }
  const out = makeCanvas(target.width, target.height);
  const ctx = context(out);
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(current as CanvasImageSource, 0, 0, target.width, target.height);
  return out;
}

/** Encode en WebP (repli JPEG pour les navigateurs sans encodeur WebP, comme Safari). */
export async function encodeImage(c: AnyCanvas, quality = 0.8): Promise<Blob> {
  const toBlob = async (type: string): Promise<Blob | null> => {
    if ("convertToBlob" in c) return (c as OffscreenCanvas).convertToBlob({ type, quality });
    return new Promise<Blob | null>((resolve) => (c as HTMLCanvasElement).toBlob(resolve, type, quality));
  };
  const webp = await toBlob("image/webp");
  if (webp && webp.type === "image/webp" && webp.size > 0) return webp;
  const jpeg = await toBlob("image/jpeg");
  if (jpeg && jpeg.size > 0) return jpeg;
  throw new Error("Encodage de la vignette impossible");
}

/** Niveaux de gris (0–255) d'une image réduite à 256 px de large, sur fond blanc (transparence). */
export function grayscale(src: Drawable, width = METRICS_WIDTH): { gray: Float32Array; width: number; height: number } {
  const { width: sw, height: sh } = sourceSize(src);
  const w = Math.max(1, Math.min(width, sw));
  const h = Math.max(1, Math.round((sh * w) / sw));
  const c = makeCanvas(w, h);
  const ctx = context(c, true);
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, w, h);
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(src as CanvasImageSource, 0, 0, w, h);
  const data = ctx.getImageData(0, 0, w, h).data;
  const gray = new Float32Array(w * h);
  for (let i = 0, p = 0; i < gray.length; i++, p += 4) gray[i] = 0.299 * data[p] + 0.587 * data[p + 1] + 0.114 * data[p + 2];
  return { gray, width: w, height: h };
}

/** Mesures calculées sur les niveaux de gris : netteté, exposition, dHash. */
export function measure(gray: Float32Array, w: number, h: number): PixelMetrics {
  // Exposition
  let sum = 0;
  let high = 0;
  let low = 0;
  const hi = 0.97 * 255;
  const lo = 0.03 * 255;
  for (let i = 0; i < gray.length; i++) {
    const v = gray[i];
    sum += v;
    if (v > hi) high++;
    else if (v < lo) low++;
  }
  const n = gray.length || 1;

  // Netteté : variance du laplacien 4-voisins
  let lsum = 0;
  let lsq = 0;
  let count = 0;
  for (let y = 1; y < h - 1; y++) {
    const row = y * w;
    for (let x = 1; x < w - 1; x++) {
      const i = row + x;
      const l = gray[i - w] + gray[i + w] + gray[i - 1] + gray[i + 1] - 4 * gray[i];
      lsum += l;
      lsq += l * l;
      count++;
    }
  }
  const mean = count ? lsum / count : 0;
  const variance = count ? Math.max(0, lsq / count - mean * mean) : 0;

  return {
    dhash: dhash(gray, w, h),
    blurScore: round(variance, 2),
    lumaMean: round(sum / n / 255, 4),
    clipHigh: round(high / n, 4),
    clipLow: round(low / n, 4),
  };
}

/** dHash : moyenne par zones sur une grille 9 × 8, puis comparaison de chaque pixel à son voisin de droite. */
export function dhash(gray: Float32Array, w: number, h: number): string {
  const cols = 9;
  const rows = 8;
  const cells = new Float32Array(cols * rows);
  for (let r = 0; r < rows; r++) {
    const y0 = Math.floor((r * h) / rows);
    const y1 = Math.max(y0 + 1, Math.floor(((r + 1) * h) / rows));
    for (let c = 0; c < cols; c++) {
      const x0 = Math.floor((c * w) / cols);
      const x1 = Math.max(x0 + 1, Math.floor(((c + 1) * w) / cols));
      let s = 0;
      let k = 0;
      for (let y = y0; y < Math.min(y1, h); y++) {
        for (let x = x0; x < Math.min(x1, w); x++) {
          s += gray[y * w + x];
          k++;
        }
      }
      cells[r * cols + c] = k ? s / k : 0;
    }
  }
  let hex = "";
  let nibble = 0;
  let bits = 0;
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols - 1; c++) {
      nibble = (nibble << 1) | (cells[r * cols + c] > cells[r * cols + c + 1] ? 1 : 0);
      bits++;
      if (bits === 4) {
        hex += nibble.toString(16);
        nibble = 0;
        bits = 0;
      }
    }
  }
  return hex;
}

/** Vignette WebP (640 px max) + mesures, depuis n'importe quelle source dessinable. */
export async function thumbnailAndMetrics(src: Drawable, maxSide = THUMB_MAX_SIDE): Promise<ThumbResult> {
  const small = downscale(src, maxSide);
  const thumb = await encodeImage(small, 0.8);
  const g = grayscale(small);
  return { thumb, thumbWidth: small.width, thumbHeight: small.height, metrics: measure(g.gray, g.width, g.height) };
}

function round(v: number, digits: number): number {
  const f = 10 ** digits;
  return Math.round(v * f) / f;
}
