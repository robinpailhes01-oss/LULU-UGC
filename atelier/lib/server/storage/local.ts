import "server-only";
import { createHmac, randomUUID, timingSafeEqual } from "node:crypto";
import { createReadStream, createWriteStream } from "node:fs";
import fs from "node:fs/promises";
import path from "node:path";
import { Readable } from "node:stream";
import { pipeline } from "node:stream/promises";
import { env } from "@/lib/server/env";
import type { BlobStore } from "@/lib/server/storage/types";

/**
 * Stockage sur disque (mode local). Les fichiers vivent dans ATELIER_DATA_DIR/blobs, avec un
 * fichier « .meta.json » à côté pour le type MIME. Les URLs d'envoi et de lecture passent par la
 * route /api/blob/[...key], protégée par une signature HMAC à durée limitée.
 */

const ROOT = env.storage.localDir;
const PARTS = path.join(ROOT, ".multipart");

export function blobPath(key: string): string {
  const safe = path.normalize(key).replace(/^(\.\.(\/|\\|$))+/, "");
  const full = path.join(ROOT, safe);
  if (!full.startsWith(ROOT + path.sep)) throw new Error("Clé de fichier invalide");
  return full;
}

function partPath(uploadId: string, partNumber: number): string {
  if (!/^[a-f0-9-]{36}$/.test(uploadId)) throw new Error("Identifiant d'envoi invalide");
  return path.join(PARTS, uploadId, String(partNumber).padStart(5, "0"));
}

// ---------------------------------------------------------------------------------------------
// Signatures

export type BlobOp = "get" | "put" | "part";

function payload(op: BlobOp, key: string, exp: number, extra = "") {
  return `${op}\n${key}\n${exp}\n${extra}`;
}

export function signBlob(op: BlobOp, key: string, exp: number, extra = ""): string {
  return createHmac("sha256", env.auth.secret).update(payload(op, key, exp, extra)).digest("base64url");
}

export function verifyBlob(op: BlobOp, key: string, exp: number, sig: string, extra = ""): boolean {
  if (!Number.isFinite(exp) || exp * 1000 < Date.now()) return false;
  const expected = Buffer.from(signBlob(op, key, exp, extra));
  const given = Buffer.from(sig);
  return expected.length === given.length && timingSafeEqual(expected, given);
}

function signedUrl(op: BlobOp, key: string, ttlS: number, query: Record<string, string> = {}, extra = "", absolute = false) {
  const exp = Math.floor(Date.now() / 1000) + ttlS;
  const params = new URLSearchParams({ ...query, op, exp: String(exp), sig: signBlob(op, key, exp, extra) });
  const rel = `/api/blob/${key.split("/").map(encodeURIComponent).join("/")}?${params.toString()}`;
  return absolute ? `${env.appUrl}${rel}` : rel;
}

// ---------------------------------------------------------------------------------------------

async function writeMeta(file: string, contentType: string) {
  await fs.writeFile(`${file}.meta.json`, JSON.stringify({ contentType }));
}

export async function readMeta(file: string): Promise<{ contentType: string | null }> {
  try {
    return JSON.parse(await fs.readFile(`${file}.meta.json`, "utf8"));
  } catch {
    return { contentType: null };
  }
}

/** Écrit un flux reçu par la route /api/blob (PUT) sur le disque. */
export async function writeStreamToKey(key: string, body: ReadableStream<Uint8Array>, contentType: string) {
  const file = blobPath(key);
  await fs.mkdir(path.dirname(file), { recursive: true });
  await pipeline(Readable.fromWeb(body as never), createWriteStream(file));
  await writeMeta(file, contentType);
}

export async function writeStreamToPart(uploadId: string, partNumber: number, body: ReadableStream<Uint8Array>): Promise<string> {
  const file = partPath(uploadId, partNumber);
  await fs.mkdir(path.dirname(file), { recursive: true });
  await pipeline(Readable.fromWeb(body as never), createWriteStream(file));
  const stat = await fs.stat(file);
  return `"${uploadId.slice(0, 8)}-${partNumber}-${stat.size}"`;
}

export function openReadStream(key: string, range?: { start: number; end: number }) {
  return createReadStream(blobPath(key), range);
}

export function createLocalStore(): BlobStore {
  return {
    kind: "local",

    async presignPut(key, contentType, ttlS = 3600) {
      return { url: signedUrl("put", key, ttlS, { ct: contentType }), method: "PUT", headers: { "Content-Type": contentType } };
    },

    async createMultipart(key, contentType) {
      const uploadId = randomUUID();
      await fs.mkdir(path.join(PARTS, uploadId), { recursive: true });
      await fs.writeFile(path.join(PARTS, uploadId, "info.json"), JSON.stringify({ key, contentType }));
      return { uploadId };
    },

    async presignPart(key, uploadId, partNumber, ttlS = 6 * 3600) {
      return signedUrl("part", key, ttlS, { upload: uploadId, part: String(partNumber) }, `${uploadId}:${partNumber}`);
    },

    async completeMultipart(key, uploadId, parts) {
      const info = JSON.parse(await fs.readFile(path.join(PARTS, uploadId, "info.json"), "utf8")) as { key: string; contentType: string };
      if (info.key !== key) throw new Error("Envoi incohérent");
      const file = blobPath(key);
      await fs.mkdir(path.dirname(file), { recursive: true });
      const out = createWriteStream(file);
      for (const p of [...parts].sort((a, b) => a.partNumber - b.partNumber)) {
        await new Promise<void>((resolve, reject) => {
          const rs = createReadStream(partPath(uploadId, p.partNumber));
          rs.on("error", reject);
          rs.on("end", () => resolve());
          rs.pipe(out, { end: false });
        });
      }
      await new Promise<void>((resolve, reject) => out.end((err?: Error | null) => (err ? reject(err) : resolve())));
      await writeMeta(file, info.contentType);
      await fs.rm(path.join(PARTS, uploadId), { recursive: true, force: true });
    },

    async abortMultipart(_key, uploadId) {
      await fs.rm(path.join(PARTS, uploadId), { recursive: true, force: true }).catch(() => undefined);
    },

    async presignGet(key, opts = {}) {
      const ttl = opts.ttlS ?? 6 * 3600;
      // Lien stable à l'heure près, pour profiter du cache du navigateur.
      if (opts.stable) {
        const exp = (Math.floor(Date.now() / 3_600_000) + 2) * 3600;
        const params = new URLSearchParams({ op: "get", exp: String(exp), sig: signBlob("get", key, exp) });
        if (opts.filename) params.set("dl", opts.filename);
        return `${env.appUrl}/api/blob/${key.split("/").map(encodeURIComponent).join("/")}?${params.toString()}`;
      }
      return signedUrl("get", key, ttl, opts.filename ? { dl: opts.filename } : {}, "", true);
    },

    async put(key, body, contentType) {
      const file = blobPath(key);
      await fs.mkdir(path.dirname(file), { recursive: true });
      await fs.writeFile(file, body);
      await writeMeta(file, contentType);
    },

    async getBuffer(key) {
      return fs.readFile(blobPath(key));
    },

    async head(key) {
      try {
        const file = blobPath(key);
        const stat = await fs.stat(file);
        return { size: stat.size, contentType: (await readMeta(file)).contentType };
      } catch {
        return null;
      }
    },

    async delete(keysToDelete) {
      for (const key of keysToDelete) {
        const file = blobPath(key);
        await fs.rm(file, { force: true });
        await fs.rm(`${file}.meta.json`, { force: true });
      }
    },
  };
}
