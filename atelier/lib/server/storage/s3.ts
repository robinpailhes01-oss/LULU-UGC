import "server-only";
import {
  AbortMultipartUploadCommand,
  CompleteMultipartUploadCommand,
  CreateMultipartUploadCommand,
  DeleteObjectsCommand,
  GetObjectCommand,
  HeadObjectCommand,
  PutObjectCommand,
  S3Client,
  UploadPartCommand,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { env } from "@/lib/server/env";
import type { BlobStore } from "@/lib/server/storage/types";

const HOUR = 3600;

export function createS3Store(): BlobStore {
  const cfg = env.storage.s3;
  const client = new S3Client({
    region: cfg.region,
    endpoint: cfg.endpoint,
    forcePathStyle: cfg.forcePathStyle,
    credentials: { accessKeyId: cfg.accessKeyId, secretAccessKey: cfg.secretAccessKey },
    // R2 n'accepte pas les sommes de contrôle CRC par défaut des SDK récents sur les URLs pré-signées.
    requestChecksumCalculation: "WHEN_REQUIRED",
    responseChecksumValidation: "WHEN_REQUIRED",
  });
  const Bucket = cfg.bucket;

  return {
    kind: "s3",

    async presignPut(key, contentType, ttlS = HOUR) {
      const url = await getSignedUrl(client, new PutObjectCommand({ Bucket, Key: key, ContentType: contentType }), {
        expiresIn: ttlS,
        signableHeaders: new Set(["content-type"]),
      });
      return { url, method: "PUT", headers: { "Content-Type": contentType } };
    },

    async createMultipart(key, contentType) {
      const out = await client.send(new CreateMultipartUploadCommand({ Bucket, Key: key, ContentType: contentType }));
      if (!out.UploadId) throw new Error("Le stockage n'a pas renvoyé d'identifiant d'envoi.");
      return { uploadId: out.UploadId };
    },

    async presignPart(key, uploadId, partNumber, ttlS = 6 * HOUR) {
      return getSignedUrl(client, new UploadPartCommand({ Bucket, Key: key, UploadId: uploadId, PartNumber: partNumber }), { expiresIn: ttlS });
    },

    async completeMultipart(key, uploadId, parts) {
      await client.send(
        new CompleteMultipartUploadCommand({
          Bucket,
          Key: key,
          UploadId: uploadId,
          MultipartUpload: { Parts: [...parts].sort((a, b) => a.partNumber - b.partNumber).map((p) => ({ PartNumber: p.partNumber, ETag: p.etag })) },
        }),
      );
    },

    async abortMultipart(key, uploadId) {
      await client.send(new AbortMultipartUploadCommand({ Bucket, Key: key, UploadId: uploadId })).catch(() => undefined);
    },

    async presignGet(key, opts = {}) {
      if (cfg.publicBaseUrl && !opts.filename) return `${cfg.publicBaseUrl}/${encodeKey(key)}`;
      const ttl = Math.min(opts.ttlS ?? 6 * HOUR, 7 * 24 * HOUR);
      // URL « stable » : signée au début de l'heure, pour que le navigateur puisse la mettre en cache.
      const signingDate = opts.stable ? new Date(Math.floor(Date.now() / (HOUR * 1000)) * HOUR * 1000) : undefined;
      return getSignedUrl(
        client,
        new GetObjectCommand({
          Bucket,
          Key: key,
          ResponseContentDisposition: opts.filename ? `attachment; filename*=UTF-8''${encodeURIComponent(opts.filename)}` : undefined,
        }),
        { expiresIn: opts.stable ? ttl + HOUR : ttl, signingDate },
      );
    },

    async put(key, body, contentType) {
      await client.send(new PutObjectCommand({ Bucket, Key: key, Body: body, ContentType: contentType }));
    },

    async getBuffer(key) {
      const out = await client.send(new GetObjectCommand({ Bucket, Key: key }));
      if (!out.Body) throw new Error(`Fichier introuvable : ${key}`);
      return Buffer.from(await out.Body.transformToByteArray());
    },

    async head(key) {
      try {
        const out = await client.send(new HeadObjectCommand({ Bucket, Key: key }));
        return { size: Number(out.ContentLength ?? 0), contentType: out.ContentType ?? null };
      } catch (err) {
        const status = (err as { $metadata?: { httpStatusCode?: number } }).$metadata?.httpStatusCode;
        if (status === 404 || status === 403) return null;
        throw err;
      }
    },

    async delete(keysToDelete) {
      for (let i = 0; i < keysToDelete.length; i += 1000) {
        const chunk = keysToDelete.slice(i, i + 1000);
        if (chunk.length === 0) continue;
        await client.send(new DeleteObjectsCommand({ Bucket, Delete: { Objects: chunk.map((Key) => ({ Key })), Quiet: true } }));
      }
    },
  };
}

function encodeKey(key: string) {
  return key.split("/").map(encodeURIComponent).join("/");
}
