import "server-only";
import { env } from "@/lib/server/env";
import { badRequest, HttpError } from "@/lib/server/http";
import { getStorageKeys } from "@/lib/server/repo/assets";
import { getStore } from "@/lib/server/storage";
import type { ZernioClient } from "@/lib/server/zernio/client";
import { zernioAcceptsMime } from "@/lib/server/zernio/rules";
import type { ZMediaItem, ZPresignContentType } from "@/lib/server/zernio/types";
import type { Asset } from "@/lib/shared/types";

/**
 * Recopie des médias chez Zernio (POST /v1/media/presign puis PUT des octets).
 * On n'envoie jamais nos URLs signées à Zernio : elles expirent (7 jours au plus en S3) alors que
 * Zernio récupère les médias au moment de publier. Un fichier recopié chez Zernio devient
 * permanent dès qu'une publication le référence.
 *
 * Cache : l'URL Zernio de chaque média est gardée dans posts.result.media pour ne pas renvoyer le
 * fichier à chaque modification. Elle est oubliée si le média change ou si la publication est
 * supprimée chez Zernio (Zernio efface alors les fichiers qu'aucune autre publication n'utilise).
 */

export interface RehostedMedia {
  url: string;
  posterUrl: string | null;
  /** updatedAt du média recopié : un média modifié depuis est renvoyé. */
  assetUpdatedAt: string;
  uploadedAt: string;
}

export type MediaCache = Record<string, RehostedMedia>;

const EXT: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/jpg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/gif": "gif",
  "video/mp4": "mp4",
  "video/mpeg": "mpeg",
  "video/quicktime": "mov",
  "video/avi": "avi",
  "video/x-msvideo": "avi",
  "video/webm": "webm",
  "video/x-m4v": "m4v",
};

function fileName(name: string, mime: string): string {
  const base = name.replace(/\.[a-z0-9]{1,8}$/i, "").normalize("NFD").replace(/\p{M}/gu, "").replace(/[^a-zA-Z0-9_-]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 60) || "media";
  return `${base}.${EXT[mime] ?? "bin"}`;
}

export function assertPublishable(asset: Asset): ZPresignContentType {
  const mime = asset.mime.toLowerCase();
  if (asset.kind === "audio") throw badRequest(`« ${asset.name} » est un fichier audio : seuls les photos et les vidéos se publient.`);
  if (/hei[cf]/.test(mime)) {
    throw badRequest(`« ${asset.name} » est au format HEIC, refusé par Zernio. Ouvrez-la dans Retouche et exportez une copie JPEG, puis utilisez cette copie.`);
  }
  if (!zernioAcceptsMime(mime)) throw badRequest(`« ${asset.name} » (${asset.mime}) n'est pas un format accepté par Zernio.`);
  if (asset.trashedAt) throw badRequest(`« ${asset.name} » est dans la corbeille : restaurez-le pour le publier.`);
  if (asset.status !== "ready") throw badRequest(`« ${asset.name} » n'est pas encore prêt (envoi en cours).`);
  return mime as ZPresignContentType;
}

/** Lit un fichier de notre stockage : flux depuis une URL signée (S3) ou tampon (disque local). */
async function readBlob(key: string, fallbackSize: number): Promise<{ body: Buffer | ReadableStream<Uint8Array>; size: number }> {
  const store = getStore();
  if (env.storage.kind === "s3") {
    const url = await store.presignGet(key, { ttlS: 3600 });
    const res = await fetch(url, { cache: "no-store" });
    if (!res.ok || !res.body) throw new HttpError(502, "storage_read_failed", `Lecture du média impossible dans le stockage (HTTP ${res.status}).`);
    const size = Number(res.headers.get("content-length")) || fallbackSize;
    if (!size) {
      const buf = Buffer.from(await res.arrayBuffer());
      return { body: buf, size: buf.byteLength };
    }
    return { body: res.body, size };
  }
  const buf = await store.getBuffer(key);
  return { body: buf, size: buf.byteLength };
}

async function uploadOne(z: ZernioClient, name: string, contentType: ZPresignContentType, body: Buffer | ReadableStream<Uint8Array>, size: number): Promise<string> {
  const p = await z.presign({ filename: fileName(name, contentType), contentType, size });
  await z.upload(p.uploadUrl, body, contentType, size);
  return p.publicUrl;
}

/** Couverture d'un Reel (JPG/PNG exigé par Instagram) : l'affiche de la vidéo, convertie si besoin. */
async function uploadPoster(z: ZernioClient, asset: Asset, posterKey: string): Promise<string | null> {
  try {
    let buf = await getStore().getBuffer(posterKey);
    const isJpeg = buf[0] === 0xff && buf[1] === 0xd8;
    const isPng = buf[0] === 0x89 && buf[1] === 0x50;
    if (!isJpeg && !isPng) {
      const sharp = (await import("sharp")).default;
      buf = await sharp(buf).jpeg({ quality: 90 }).toBuffer();
    }
    const type: ZPresignContentType = isPng ? "image/png" : "image/jpeg";
    return await uploadOne(z, `${asset.name}-couverture`, type, buf, buf.byteLength);
  } catch (err) {
    // Couverture facultative : Zernio prend alors la première image de la vidéo.
    console.warn("[atelier] couverture du Reel non envoyée à Zernio", err instanceof Error ? err.message : err);
    return null;
  }
}

/**
 * Recopie (ou reprend du cache) chaque média et renvoie les mediaItems de Zernio, dans l'ordre.
 * withPoster : envoie aussi l'affiche des vidéos comme couverture Instagram (instagramThumbnail).
 */
export async function rehostAssets(z: ZernioClient, assets: Asset[], cache: MediaCache, opts: { withPoster: boolean }): Promise<{ items: ZMediaItem[]; cache: MediaCache }> {
  const next: MediaCache = {};
  const items: ZMediaItem[] = [];
  for (const asset of assets) {
    const contentType = assertPublishable(asset);
    let entry: RehostedMedia | undefined = cache[asset.id];
    if (entry && entry.assetUpdatedAt !== asset.updatedAt) entry = undefined;
    const keys = await getStorageKeys(asset.id);
    if (!keys) throw badRequest(`« ${asset.name} » est introuvable dans le stockage.`);
    if (!entry) {
      const { body, size } = await readBlob(keys.original, asset.sizeBytes);
      const url = await uploadOne(z, asset.name, contentType, body, size);
      entry = { url, posterUrl: null, assetUpdatedAt: asset.updatedAt, uploadedAt: new Date().toISOString() };
    }
    if (opts.withPoster && asset.kind === "video" && !entry.posterUrl && keys.poster) {
      entry = { ...entry, posterUrl: await uploadPoster(z, asset, keys.poster) };
    }
    next[asset.id] = entry;
    const item: ZMediaItem = { type: asset.kind === "video" ? "video" : contentType === "image/gif" ? "gif" : "image", url: entry.url, filename: fileName(asset.name, contentType), mimeType: contentType };
    if (asset.sizeBytes) item.size = asset.sizeBytes;
    if (asset.kind === "photo" && asset.ai?.alt) item.altText = asset.ai.alt.slice(0, 1000);
    if (asset.kind === "video" && opts.withPoster && entry.posterUrl) item.instagramThumbnail = entry.posterUrl;
    items.push(item);
  }
  return { items, cache: next };
}
