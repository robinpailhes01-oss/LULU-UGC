import "server-only";
import { randomUUID } from "node:crypto";
import { getDb } from "@/lib/server/db";
import { badRequest, notFound } from "@/lib/server/http";
import { inferAssetClient, insertAsset, kindFromMime, markAssetReady, toAsset } from "@/lib/server/repo/assets";
import { resolveRootFolder } from "@/lib/server/repo/folders";
import { logActivity } from "@/lib/server/repo/activity";
import { extFromName, getStore, keys } from "@/lib/server/storage";
import type { Asset, UploadCompleteRequest, UploadInitRequest, UploadInitResponse } from "@/lib/shared/types";

/** Au-delà de cette taille, envoi en plusieurs parties (reprise possible, pas de limite pratique). */
export const MULTIPART_THRESHOLD = 64 * 1024 * 1024;
const MIN_PART = 16 * 1024 * 1024;
const MAX_PARTS = 9000;
export const MAX_UPLOAD_BYTES = 20 * 1024 * 1024 * 1024; // 20 Go

const MIME_FALLBACK: Record<string, string> = {
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
  heic: "image/heic",
  heif: "image/heif",
  gif: "image/gif",
  avif: "image/avif",
  mp4: "video/mp4",
  mov: "video/quicktime",
  m4v: "video/x-m4v",
  webm: "video/webm",
  mp3: "audio/mpeg",
  m4a: "audio/mp4",
  wav: "audio/wav",
  aac: "audio/aac",
};

export function resolveMime(name: string, mime: string): string {
  if (mime && mime !== "application/octet-stream") return mime;
  return MIME_FALLBACK[extFromName(name)] ?? mime ?? "application/octet-stream";
}

/** Crée l'enregistrement du média (statut « uploading ») et renvoie les URLs d'envoi direct. */
export async function initUpload(req: UploadInitRequest, actor: string | null): Promise<UploadInitResponse> {
  const mime = resolveMime(req.name, req.mime);
  const kind = kindFromMime(mime);
  if (!kind) throw badRequest(`Type de fichier non pris en charge : ${req.name}`);
  if (!(req.size > 0)) throw badRequest("Fichier vide.");
  if (req.size > MAX_UPLOAD_BYTES) throw badRequest("Fichier trop volumineux (20 Go maximum).");

  const db = await getDb();
  // À la racine avec un client courant : dans le dossier racine du client.
  const folderId = await resolveRootFolder(req.folderId);
  if (folderId && !(await db.one(`select 1 from atelier.folders where id = $1`, [folderId]))) throw notFound("Dossier");
  const clientId = await inferAssetClient({ folderId });

  // Doublon exact chez le même client (deux clients peuvent avoir le même fichier).
  const duplicate = req.sha256
    ? await db.one<{ id: string }>(
        `select id from atelier.assets where sha256 = $1 and trashed_at is null and status = 'ready' and client_id is not distinct from $2::uuid limit 1`,
        [req.sha256, clientId],
      )
    : null;

  const id = randomUUID();
  const storageKey = keys.original(id, extFromName(req.name));
  const thumbMime = req.thumbMime === "image/jpeg" ? "image/jpeg" : "image/webp";
  const posterMime = req.posterMime === "image/jpeg" ? "image/jpeg" : "image/webp";
  const thumbKey = req.withThumb ? keys.thumb(id, thumbMime) : null;
  const posterKey = req.withPoster ? keys.poster(id, posterMime) : null;
  await insertAsset(
    { id, clientId, folderId, kind, name: req.name, mime, sizeBytes: req.size, storageKey, thumbKey, posterKey, status: "uploading", source: "upload", sha256: req.sha256 ?? null },
    actor,
    db,
  );

  const store = getStore();
  let original: UploadInitResponse["original"];
  if (req.size > MULTIPART_THRESHOLD) {
    const partSize = Math.max(MIN_PART, Math.ceil(req.size / MAX_PARTS));
    const { uploadId } = await store.createMultipart(storageKey, mime);
    original = { mode: "multipart", uploadId, partSize, partCount: Math.ceil(req.size / partSize) };
  } else {
    const put = await store.presignPut(storageKey, mime);
    original = { mode: "single", url: put.url, headers: put.headers };
  }
  const thumb = thumbKey ? await store.presignPut(thumbKey, thumbMime) : null;
  const poster = posterKey ? await store.presignPut(posterKey, posterMime) : null;

  return {
    assetId: id,
    duplicateOf: duplicate?.id ?? null,
    original,
    thumb: thumb ? { url: thumb.url, headers: thumb.headers } : null,
    poster: poster ? { url: poster.url, headers: poster.headers } : null,
  };
}

/** URLs signées pour une série de parties d'un envoi multipart. */
export async function partUrls(assetId: string, uploadId: string, partNumbers: number[]): Promise<Record<number, string>> {
  const db = await getDb();
  const r = await db.one<{ storage_key: string; status: string }>(`select storage_key, status from atelier.assets where id = $1`, [assetId]);
  if (!r || r.status !== "uploading") throw notFound("Envoi");
  const store = getStore();
  const out: Record<number, string> = {};
  for (const n of partNumbers.slice(0, 500)) {
    if (!Number.isInteger(n) || n < 1 || n > 10000) throw badRequest("Numéro de partie invalide.");
    out[n] = await store.presignPart(r.storage_key, uploadId, n);
  }
  return out;
}

/** Finalise l'envoi : assemble les parties, vérifie la présence du fichier, enregistre les mesures. */
export async function completeUpload(req: UploadCompleteRequest, actor: string | null): Promise<Asset> {
  const db = await getDb();
  const r = await db.one(`select * from atelier.assets where id = $1`, [req.assetId]);
  if (!r) throw notFound("Envoi");
  if (r.status === "ready") return toAsset(r);
  const store = getStore();
  const key = r.storage_key as string;
  if (req.multipart) await store.completeMultipart(key, req.multipart.uploadId, req.multipart.parts);
  const head = await store.head(key);
  if (!head) throw badRequest("Le fichier n'est pas arrivé dans le stockage. Réessayez l'envoi.");
  const facts = { ...req.facts };
  if (facts.hasThumb && r.thumb_key && !(await store.head(r.thumb_key as string))) facts.hasThumb = false;
  if (facts.hasPoster && r.poster_key && !(await store.head(r.poster_key as string))) facts.hasPoster = false;
  const asset = await markAssetReady(req.assetId, facts, head.size, db);
  await logActivity({ actor, verb: "a importé", objectType: "asset", objectId: asset.id, summary: asset.name, clientId: asset.clientId }, db);
  return asset;
}

/** Abandonne un envoi (annulation dans le navigateur ou erreur). */
export async function abortUpload(assetId: string, uploadId: string | null): Promise<void> {
  const db = await getDb();
  const r = await db.one(`select storage_key, thumb_key, poster_key, status from atelier.assets where id = $1`, [assetId]);
  if (!r || r.status !== "uploading") return;
  const store = getStore();
  if (uploadId) await store.abortMultipart(r.storage_key as string, uploadId);
  await store.delete([r.storage_key, r.thumb_key, r.poster_key].filter((k): k is string => typeof k === "string"));
  await db.query(`delete from atelier.assets where id = $1 and status = 'uploading'`, [assetId]);
}

/** Ajoute un fichier produit côté serveur (retouche exportée, rendu vidéo…) à la médiathèque. */
export async function addServerAsset(
  input: {
    name: string;
    mime: string;
    data: Buffer;
    folderId: string | null;
    /** Client du média ; absent = celui du média d'origine, du dossier, ou le client courant. */
    clientId?: string | null;
    source: Asset["source"];
    parentAssetId?: string | null;
    edit?: Asset["edit"];
    tags?: string[];
    facts?: Partial<UploadCompleteRequest["facts"]>;
    thumb?: Buffer | null;
    poster?: Buffer | null;
  },
  actor: string | null,
): Promise<Asset> {
  const kind = kindFromMime(input.mime);
  if (!kind) throw badRequest("Type de fichier non pris en charge.");
  const id = randomUUID();
  const store = getStore();
  const storageKey = keys.original(id, extFromName(input.name));
  await store.put(storageKey, input.data, input.mime);
  const thumbKey = input.thumb ? keys.thumb(id) : null;
  const posterKey = input.poster ? keys.poster(id) : null;
  if (thumbKey && input.thumb) await store.put(thumbKey, input.thumb, "image/webp");
  if (posterKey && input.poster) await store.put(posterKey, input.poster, "image/webp");
  return insertAsset(
    {
      id,
      clientId: input.clientId,
      folderId: input.folderId,
      kind,
      name: input.name,
      mime: input.mime,
      sizeBytes: input.data.byteLength,
      storageKey,
      thumbKey,
      posterKey,
      status: "ready",
      source: input.source,
      parentAssetId: input.parentAssetId ?? null,
      edit: input.edit ?? null,
      tags: input.tags,
      facts: input.facts,
    },
    actor,
  );
}

/** Supprime les envois abandonnés depuis plus de 24 h (appelé au fil de l'eau). */
export async function purgeStaleUploads(): Promise<number> {
  const db = await getDb();
  const rows = await db.query<{ id: string }>(`select id from atelier.assets where status = 'uploading' and created_at < now() - interval '24 hours' limit 50`);
  for (const r of rows) await abortUpload(r.id, null).catch(() => undefined);
  return rows.length;
}
