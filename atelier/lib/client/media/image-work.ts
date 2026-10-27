import { decodeHeif, looksLikeHeif } from "@/lib/client/media/heic";
import { thumbnailAndMetrics, type Drawable } from "@/lib/client/media/pixels";
import type { ImageWorkResult } from "@/lib/client/media/protocol";

/** Erreur de décodage : le navigateur (et libheif) ne savent pas lire ce fichier. */
export class DecodeError extends Error {}

/**
 * Décode une photo (orientation EXIF appliquée), produit la vignette et les mesures.
 * Utilisé dans le Worker, et sur le fil principal quand les Workers/OffscreenCanvas manquent.
 */
export async function processImage(file: Blob, name: string, maxSide: number): Promise<ImageWorkResult> {
  let bitmap: ImageBitmap | null = null;
  let viaHeif = false;
  try {
    bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
  } catch {
    bitmap = null;
  }
  if (!bitmap && typeof document !== "undefined") {
    // Vieux navigateurs sans createImageBitmap(Blob) : passage par <img> (orientation respectée).
    const img = await loadImageElement(file).catch(() => null);
    if (img) return finish(img, img.naturalWidth, img.naturalHeight, false, maxSide);
  }
  if (!bitmap && (await looksLikeHeif(file, name))) {
    try {
      const data = await decodeHeif(file);
      bitmap = await createImageBitmap(data);
      viaHeif = true;
    } catch (err) {
      throw new DecodeError(err instanceof Error ? err.message : "HEIC illisible");
    }
  }
  if (!bitmap) throw new DecodeError("Format d'image non lu par le navigateur");
  try {
    return await finish(bitmap, bitmap.width, bitmap.height, viaHeif, maxSide);
  } finally {
    bitmap.close();
  }
}

async function finish(src: Drawable, width: number, height: number, viaHeif: boolean, maxSide: number): Promise<ImageWorkResult> {
  const r = await thumbnailAndMetrics(src, maxSide);
  return { width, height, thumb: r.thumb, metrics: r.metrics, viaHeif };
}

function loadImageElement(file: Blob): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.decoding = "async";
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Image illisible"));
    };
    img.src = url;
  });
}
