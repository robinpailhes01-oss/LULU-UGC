"use client";

import { ApiError } from "@/lib/client/api";
import { analyzeFile, type MediaAnalysis } from "@/lib/client/media/analyze";
import { serverInfo } from "@/lib/client/upload/ai";
import { AbortedError, postJson, sleep, StorageError, xhrPut } from "@/lib/client/upload/transport";
import { formatBytes } from "@/lib/shared/format";
import type { Asset, UploadCompleteRequest, UploadInitResponse } from "@/lib/shared/types";

/**
 * Envoi d'un fichier, étape par étape :
 * analyse (navigateur) → POST /api/uploads → envoi direct de l'original (simple ou en parties)
 * → vignette/affiche → POST /api/uploads/complete. L'état est gardé dans `job` pour reprendre
 * là où l'envoi s'est arrêté (« Réessayer ») sans tout recommencer.
 */

export type UploadPhase = "queued" | "analyzing" | "uploading" | "finishing" | "done" | "error" | "cancelled";

export interface UploadJob {
  file: File;
  folderId: string | null;
  analysis?: MediaAnalysis;
  init?: UploadInitResponse;
  initAt?: number;
  /** Parties déjà envoyées (numéro → ETag). */
  parts: Map<number, string>;
  /** Découpage retenu pour l'envoi en parties (stable entre deux essais). */
  plan?: { partSize: number; partCount: number };
  originalSent: boolean;
  previews?: { thumb: boolean; poster: boolean };
  asset?: Asset;
}

export interface PipelineHooks {
  signal: AbortSignal;
  phase: (phase: UploadPhase) => void;
  progress: (loaded: number) => void;
  analyzed: (analysis: MediaAnalysis) => void;
  duplicate: (assetId: string) => void;
}

const PART_CONCURRENCY = 3;
const PART_RETRIES = 3;
const URL_BATCH = 40;
/** Les URLs d'envoi simple expirent après 1 h : au-delà de 50 min on redemande un envoi. */
const SINGLE_URL_MAX_AGE = 50 * 60_000;
/**
 * Stockage local : les fichiers passent par l'application Next, dont le middleware ne transmet
 * que les 10 premiers Mo d'une requête (middlewareClientMaxBodySize). On envoie donc des parties
 * de 8 Mo au plus (le stockage local accepte n'importe quelle taille de partie).
 */
const LOCAL_MAX_PART = 8 * 1024 * 1024;

export function newJob(file: File, folderId: string | null): UploadJob {
  return { file, folderId, parts: new Map(), originalSent: false };
}

export async function runPipeline(job: UploadJob, hooks: PipelineHooks): Promise<Asset> {
  const { signal } = hooks;

  // 1. Analyse dans le navigateur (une seule fois, même en cas de nouvel essai)
  if (!job.analysis) {
    hooks.phase("analyzing");
    job.analysis = await analyzeFile(job.file);
    hooks.analyzed(job.analysis);
  }
  if (signal.aborted) throw new AbortedError();
  const analysis = job.analysis;

  // 2. Création de l'envoi (ou reprise)
  if (job.init && job.init.original.mode === "single" && !job.originalSent && Date.now() - (job.initAt ?? 0) > SINGLE_URL_MAX_AGE) {
    void abortRemote(job.init.assetId, null);
    job.init = undefined;
  }
  if (!job.init) {
    hooks.phase("uploading");
    job.init = await postJson<UploadInitResponse>(
      "/api/uploads",
      {
        name: safeName(job.file.name),
        mime: analysis.mime,
        size: job.file.size,
        folderId: job.folderId,
        sha256: analysis.facts.sha256,
        withThumb: Boolean(analysis.thumb),
        withPoster: Boolean(analysis.poster),
      },
      signal,
    );
    job.initAt = Date.now();
    job.parts = new Map();
    job.plan = undefined;
    job.originalSent = false;
    job.previews = undefined;
    if (job.init.duplicateOf) hooks.duplicate(job.init.duplicateOf);
  }
  const init = job.init;

  // 3. Original
  if (!job.originalSent) {
    hooks.phase("uploading");
    if (init.original.mode === "single") {
      const single = init.original;
      await withRetries(signal, 2, () => xhrPut(single.url, job.file, single.headers, { signal, onProgress: hooks.progress }));
    } else {
      try {
        if (!job.plan) {
          let { partSize, partCount } = init.original;
          if ((await serverInfo()).storage === "local" && partSize > LOCAL_MAX_PART) {
            partSize = LOCAL_MAX_PART;
            partCount = Math.ceil(job.file.size / partSize);
          }
          job.plan = { partSize, partCount };
        }
        await uploadParts(job, init.assetId, init.original.uploadId, job.plan.partSize, job.plan.partCount, hooks);
      } catch (err) {
        // L'envoi n'existe plus côté serveur (purgé) : on repartira de zéro au prochain essai.
        if (err instanceof ApiError && err.status === 404) job.init = undefined;
        throw err;
      }
    }
    job.originalSent = true;
  }
  hooks.progress(job.file.size);

  // 4. Vignette et affiche (facultatives : un échec n'empêche pas l'envoi)
  hooks.phase("finishing");
  if (!job.previews) {
    const sendPreview = async (target: { url: string; headers: Record<string, string> } | null, blob: Blob | null) => {
      if (!target || !blob) return false;
      try {
        await withRetries(signal, 1, () => xhrPut(target.url, blob, target.headers, { signal }));
        return true;
      } catch (err) {
        if (err instanceof AbortedError) throw err;
        return false;
      }
    };
    const [thumb, poster] = await Promise.all([sendPreview(init.thumb, analysis.thumb), sendPreview(init.poster, analysis.poster)]);
    job.previews = { thumb, poster };
  }

  // 5. Finalisation
  const body: UploadCompleteRequest = {
    assetId: init.assetId,
    multipart:
      init.original.mode === "multipart"
        ? { uploadId: init.original.uploadId, parts: [...job.parts.entries()].sort((a, b) => a[0] - b[0]).map(([partNumber, etag]) => ({ partNumber, etag })) }
        : undefined,
    facts: { ...analysis.facts, hasThumb: job.previews.thumb, hasPoster: job.previews.poster },
  };
  try {
    job.asset = await postJson<Asset>("/api/uploads/complete", body, signal);
  } catch (err) {
    // Fichier absent du stockage : le prochain essai renverra l'original.
    if (err instanceof ApiError && err.status === 400) {
      job.originalSent = false;
      job.previews = undefined;
      job.parts = new Map();
    }
    if (err instanceof ApiError && err.status === 404) job.init = undefined;
    throw err;
  }
  // Fichier tronqué en route (limite de taille d'un intermédiaire) : on ne garde pas un média abîmé.
  if (job.asset.sizeBytes !== job.file.size) {
    const received = job.asset.sizeBytes;
    await postJson("/api/assets/bulk", { ids: [job.asset.id], op: { action: "delete" } }).catch(() => undefined);
    job.init = undefined;
    job.asset = undefined;
    job.originalSent = false;
    throw new Error(`Fichier arrivé incomplet (${formatBytes(received)} sur ${formatBytes(job.file.size)}) : le serveur a coupé l'envoi. Vérifiez la limite de taille des requêtes.`);
  }
  return job.asset;
}

async function uploadParts(job: UploadJob, assetId: string, uploadId: string, partSize: number, partCount: number, hooks: PipelineHooks) {
  const signal = hooks.signal;
  const file = job.file;
  const sizeOf = (n: number) => Math.min(partSize, file.size - (n - 1) * partSize);
  const todo: number[] = [];
  for (let n = 1; n <= partCount; n++) if (!job.parts.has(n)) todo.push(n);

  let doneBytes = 0;
  for (const n of job.parts.keys()) doneBytes += sizeOf(n);
  const inflight = new Map<number, number>();
  const report = () => {
    let s = doneBytes;
    for (const v of inflight.values()) s += v;
    hooks.progress(Math.min(s, file.size));
  };
  report();

  // URLs signées demandées par lots, à l'avance.
  const urls = new Map<number, string>();
  const batches = new Map<number, Promise<void>>();
  const fetchBatch = (b: number): Promise<void> => {
    let p = batches.get(b);
    if (!p) {
      const numbers = todo.slice(b * URL_BATCH, (b + 1) * URL_BATCH);
      p = numbers.length
        ? postJson<{ urls: Record<string, string> }>("/api/uploads/parts", { assetId, uploadId, partNumbers: numbers }, signal).then((r) => {
            for (const [k, v] of Object.entries(r.urls)) urls.set(Number(k), v);
          })
        : Promise.resolve();
      p.catch(() => batches.delete(b));
      batches.set(b, p);
    }
    return p;
  };
  const refreshUrl = async (n: number) => {
    const r = await postJson<{ urls: Record<string, string> }>("/api/uploads/parts", { assetId, uploadId, partNumbers: [n] }, signal);
    if (r.urls[n]) urls.set(n, r.urls[n]);
  };

  let cursor = 0;
  const worker = async () => {
    while (cursor < todo.length) {
      if (signal.aborted) throw new AbortedError();
      const index = cursor++;
      const n = todo[index];
      const batch = Math.floor(index / URL_BATCH);
      await fetchBatch(batch);
      if (index % URL_BATCH === Math.floor(URL_BATCH / 2)) void fetchBatch(batch + 1).catch(() => undefined);
      const start = (n - 1) * partSize;
      const blob = file.slice(start, start + sizeOf(n));
      let attempt = 0;
      for (;;) {
        try {
          const url = urls.get(n);
          if (!url) await refreshUrl(n);
          const { etag } = await xhrPut(urls.get(n) ?? "", blob, {}, {
            signal,
            onProgress: (loaded) => {
              inflight.set(n, loaded);
              report();
            },
          });
          if (!etag) throw new StorageError(-1, "Le stockage ne renvoie pas l'en-tête ETag : ajoutez « ETag » aux en-têtes exposés (CORS) du bucket.");
          job.parts.set(n, etag);
          inflight.delete(n);
          doneBytes += blob.size;
          report();
          break;
        } catch (err) {
          inflight.delete(n);
          report();
          if (err instanceof AbortedError || signal.aborted) throw new AbortedError();
          const retryable = err instanceof StorageError ? err.retryable || err.status === 403 : err instanceof ApiError ? err.status === 0 || err.status >= 500 : false;
          if (!retryable || attempt >= PART_RETRIES) throw err;
          attempt++;
          if (err instanceof StorageError && err.status === 403) urls.delete(n);
          await sleep(1000 * 2 ** (attempt - 1) + Math.random() * 400, signal);
        }
      }
    }
  };
  await Promise.all(Array.from({ length: Math.min(PART_CONCURRENCY, todo.length) }, worker));
}

async function withRetries<T>(signal: AbortSignal, retries: number, fn: () => Promise<T>): Promise<T> {
  let attempt = 0;
  for (;;) {
    try {
      return await fn();
    } catch (err) {
      if (err instanceof AbortedError || signal.aborted) throw new AbortedError();
      if (!(err instanceof StorageError && err.retryable) || attempt >= retries) throw err;
      attempt++;
      await sleep(1000 * 2 ** (attempt - 1), signal);
    }
  }
}

/** Abandon côté serveur (supprime l'enregistrement « en cours » et les parties déjà reçues). */
export async function abortRemote(assetId: string, uploadId: string | null): Promise<void> {
  try {
    await postJson("/api/uploads/abort", { assetId, uploadId });
  } catch {
    /* sans gravité : purgé automatiquement après 24 h */
  }
}

/** Nom limité à 255 caractères, extension conservée. */
function safeName(name: string): string {
  const clean = name.replace(/[\u0000-\u001f]/g, "").trim() || "Sans titre";
  if (clean.length <= 255) return clean;
  const m = /(\.[a-z0-9]{1,8})$/i.exec(clean);
  const ext = m ? m[1] : "";
  return clean.slice(0, 255 - ext.length) + ext;
}
