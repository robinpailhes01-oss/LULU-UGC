/**
 * Chargement de la photo pour l'aperçu : décodage dans le navigateur (orientation EXIF
 * appliquée, comme sharp.autoOrient() côté serveur), réduit à 2048 px pour l'aperçu courant,
 * en pleine définition (dans la limite du GPU) pour le zoom 100 %.
 */
import { RetouchRenderer } from "@/lib/client/retouch/renderer";
import { computeOutputGeometry } from "@/lib/shared/look";
import type { RetouchParams } from "@/lib/shared/types";

export const PREVIEW_MAX = 2048;

export interface PhotoSource {
  bitmap: ImageBitmap;
  /** Taille de la texture. */
  width: number;
  height: number;
  /** Taille réelle de la photo (orientation appliquée). */
  naturalWidth: number;
  naturalHeight: number;
}

export class SourceError extends Error {
  constructor(
    public reason: "network" | "decode",
    message: string,
  ) {
    super(message);
  }
}

/** Télécharge l'original une seule fois (réutilisé pour le zoom 100 %). */
export async function fetchOriginal(url: string, signal?: AbortSignal): Promise<Blob> {
  let res: Response;
  try {
    res = await fetch(url, { credentials: "same-origin", signal });
  } catch (err) {
    if ((err as Error).name === "AbortError") throw err;
    throw new SourceError("network", "La photo n'a pas pu être téléchargée. Vérifiez la connexion puis réessayez.");
  }
  if (!res.ok) throw new SourceError("network", `La photo n'a pas pu être téléchargée (erreur ${res.status}).`);
  return res.blob();
}

/**
 * Décode la photo à la taille voulue (plus grand côté ≤ maxSize). `hint` = dimensions connues
 * (base de données) pour choisir le côté à réduire sans décoder deux fois.
 */
export async function decodePhoto(blob: Blob, maxSize: number, hint?: { width: number | null; height: number | null }): Promise<PhotoSource> {
  let full: ImageBitmap;
  const landscape = hint?.width && hint?.height ? hint.width >= hint.height : true;
  const knownLong = hint?.width && hint?.height ? Math.max(hint.width, hint.height) : null;
  try {
    if (knownLong && knownLong > maxSize) {
      // Décodage directement réduit (évite d'allouer 24 Mpx en mémoire).
      full = await createImageBitmap(blob, { imageOrientation: "from-image", resizeQuality: "high", ...(landscape ? { resizeWidth: maxSize } : { resizeHeight: maxSize }) });
    } else {
      full = await createImageBitmap(blob, { imageOrientation: "from-image" });
    }
  } catch {
    throw new SourceError("decode", "Ce navigateur ne sait pas lire ce format de photo.");
  }
  let bitmap = full;
  if (Math.max(full.width, full.height) > maxSize) {
    const s = maxSize / Math.max(full.width, full.height);
    bitmap = await createImageBitmap(full, { resizeWidth: Math.max(1, Math.round(full.width * s)), resizeHeight: Math.max(1, Math.round(full.height * s)), resizeQuality: "high" });
    full.close();
  }
  // Taille réelle : celle de la base si elle a le même rapport, sinon inversée (orientation).
  let naturalWidth = bitmap.width;
  let naturalHeight = bitmap.height;
  if (hint?.width && hint?.height) {
    const r = bitmap.width / bitmap.height;
    if (Math.abs(hint.width / hint.height - r) < 0.02) {
      naturalWidth = hint.width;
      naturalHeight = hint.height;
    } else if (Math.abs(hint.height / hint.width - r) < 0.02) {
      naturalWidth = hint.height;
      naturalHeight = hint.width;
    }
  }
  if (Math.max(naturalWidth, naturalHeight) < Math.max(bitmap.width, bitmap.height)) {
    naturalWidth = bitmap.width;
    naturalHeight = bitmap.height;
  }
  return { bitmap, width: bitmap.width, height: bitmap.height, naturalWidth, naturalHeight };
}

/**
 * Vignettes d'une photo avec chaque look (même shader que l'aperçu), en carré centré.
 * Renvoie des URL data:image/jpeg ; un seul contexte WebGL, libéré à la fin.
 */
export async function renderLookThumbnails(
  source: ImageBitmap | HTMLImageElement,
  looks: { id: string; params: RetouchParams }[],
  size = 112,
): Promise<Record<string, string>> {
  const out: Record<string, string> = {};
  if (looks.length === 0) return out;
  const px = Math.round(size * Math.min(2, window.devicePixelRatio || 1));
  // Source réduite (2× la vignette) pour un rendu net sans crénelage.
  const sw = "naturalWidth" in source ? source.naturalWidth : source.width;
  const sh = "naturalHeight" in source ? source.naturalHeight : source.height;
  const scale = Math.min(1, (px * 2) / Math.min(sw, sh));
  const small = await createImageBitmap(source, { resizeWidth: Math.max(1, Math.round(sw * scale)), resizeHeight: Math.max(1, Math.round(sh * scale)), resizeQuality: "high" });
  const canvas = document.createElement("canvas");
  canvas.width = px;
  canvas.height = px;
  const renderer = RetouchRenderer.create(canvas, { preserveDrawingBuffer: true });
  if (!renderer) {
    small.close();
    return out;
  }
  try {
    renderer.setSource(small);
    for (const look of looks) {
      const params = { ...look.params, rotate: 0 as const, flipH: false, straighten: 0, aspect: "1:1" as const, crop: null };
      const geometry = computeOutputGeometry(small.width, small.height, params);
      renderer.render({ params, geometry, mode: "output", view: { x: 0, y: 0, w: px, h: px } });
      out[look.id] = canvas.toDataURL("image/jpeg", 0.86);
      // Laisse respirer le fil principal entre deux vignettes.
      await new Promise((r) => setTimeout(r, 0));
    }
  } finally {
    renderer.dispose({ loseContext: true });
    small.close();
  }
  return out;
}

/** Charge une image (vignette de la médiathèque) en élément <img> décodé. */
export function loadImageElement(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.decoding = "async";
    img.onload = () => resolve(img);
    img.onerror = () => reject(new SourceError("network", "La vignette n'a pas pu être chargée."));
    img.src = url;
  });
}
