import "server-only";
import { getStorageKeys } from "@/lib/server/repo/assets";
import { getStore } from "@/lib/server/storage";
import type { Asset } from "@/lib/shared/types";

/**
 * Aperçus d'images envoyés à Claude (analyse IA, outil view_images).
 *
 * On lit la vignette WebP calculée dans le navigateur à l'envoi (≈ 640 px), l'affiche pour une
 * vidéo, ou à défaut l'original redimensionné avec sharp. Les octets voyagent en base64 dans la
 * requête : jamais d'URL signée dans l'historique (elle expirerait et casserait la relecture).
 */
export type PreviewMediaType = "image/jpeg" | "image/png" | "image/webp" | "image/gif";

export interface Preview {
  mediaType: PreviewMediaType;
  data: string; // base64
  source: "thumb" | "poster" | "original";
}

/** Plus grand côté envoyé au modèle. 1024 px suffit pour juger cadrage, lumière et contenu. */
const MAX_EDGE = 1024;
/** Au-delà, on redimensionne même une vignette ou un original dans un format accepté. */
const MAX_DIRECT_BYTES = 1_500_000;

function sniff(buf: Buffer): PreviewMediaType | null {
  if (buf.length < 12) return null;
  if (buf[0] === 0xff && buf[1] === 0xd8) return "image/jpeg";
  if (buf[0] === 0x89 && buf[1] === 0x50 && buf[2] === 0x4e && buf[3] === 0x47) return "image/png";
  if (buf.toString("ascii", 0, 4) === "RIFF" && buf.toString("ascii", 8, 12) === "WEBP") return "image/webp";
  if (buf.toString("ascii", 0, 3) === "GIF") return "image/gif";
  return null;
}

async function downscale(buf: Buffer): Promise<Buffer> {
  const sharp = (await import("sharp")).default;
  return sharp(buf, { failOn: "none" }).rotate().resize(MAX_EDGE, MAX_EDGE, { fit: "inside", withoutEnlargement: true }).jpeg({ quality: 82 }).toBuffer();
}

async function prepare(buf: Buffer, source: Preview["source"]): Promise<Preview> {
  const type = sniff(buf);
  if (type && type !== "image/gif" && buf.length <= MAX_DIRECT_BYTES && source !== "original") return { mediaType: type, data: buf.toString("base64"), source };
  const out = await downscale(buf);
  return { mediaType: "image/jpeg", data: out.toString("base64"), source };
}

/** Aperçu d'un média visuel, ou une erreur en français si aucun aperçu n'est disponible. */
export async function loadPreview(asset: Pick<Asset, "id" | "kind" | "mime" | "sizeBytes" | "name">): Promise<Preview> {
  if (asset.kind === "audio") throw new Error(`« ${asset.name} » est un fichier audio : rien à regarder.`);
  const k = await getStorageKeys(asset.id);
  if (!k) throw new Error(`« ${asset.name} » est introuvable dans le stockage.`);
  const store = getStore();
  if (k.thumb) {
    try {
      return await prepare(await store.getBuffer(k.thumb), "thumb");
    } catch {
      /* vignette illisible : on essaie la suite */
    }
  }
  if (asset.kind === "video") {
    if (k.poster) return prepare(await store.getBuffer(k.poster), "poster");
    throw new Error(`« ${asset.name} » n'a pas d'image d'affiche : impossible de la regarder.`);
  }
  if (asset.sizeBytes > 60 * 1024 * 1024) throw new Error(`« ${asset.name} » est trop lourde pour un aperçu et n'a pas de vignette.`);
  try {
    return await prepare(await store.getBuffer(k.original), "original");
  } catch {
    throw new Error(`Aperçu impossible pour « ${asset.name} » (format non lu : ${asset.mime}).`);
  }
}

/** Exécute des tâches avec un nombre limité en parallèle, en gardant l'ordre des résultats. */
export async function mapLimit<T, R>(items: T[], limit: number, fn: (item: T, index: number) => Promise<R>): Promise<R[]> {
  const out: R[] = new Array(items.length);
  let next = 0;
  const workers = Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (next < items.length) {
      const i = next++;
      out[i] = await fn(items[i], i);
    }
  });
  await Promise.all(workers);
  return out;
}
