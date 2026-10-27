"use client";

import { DecodeError, processImage } from "@/lib/client/media/image-work";
import { thumbnailAndMetrics, type Drawable } from "@/lib/client/media/pixels";
import type { ImageWorkResult, WorkerRequest, WorkerResponse } from "@/lib/client/media/protocol";
import { fingerprint } from "@/lib/client/media/sha256";

/**
 * Accès aux Workers d'analyse. Deux Workers : un pour les pixels (vignettes, HEIC), un pour les
 * empreintes (lecture de gros fichiers), afin qu'un SHA-256 de 200 Mo ne retarde pas les vignettes.
 * Repli automatique sur le fil principal si les Workers ou OffscreenCanvas ne sont pas disponibles.
 */

type Pending = { resolve: (v: unknown) => void; reject: (e: unknown) => void };
type WorkerPayload = WorkerRequest extends infer R ? (R extends { id: number } ? Omit<R, "id"> : never) : never;

class Channel {
  private worker: Worker | null = null;
  private failed = false;
  private seq = 0;
  private pending = new Map<number, Pending>();
  private ready: Promise<boolean> | null = null;
  canvas = true;

  private spawn(): Worker | null {
    if (this.failed) return null;
    if (this.worker) return this.worker;
    if (typeof Worker === "undefined") {
      this.failed = true;
      return null;
    }
    try {
      const w = new Worker(new URL("./media.worker.ts", import.meta.url), { name: "atelier-media" });
      w.onmessage = (e: MessageEvent<WorkerResponse>) => {
        const p = this.pending.get(e.data.id);
        if (!p) return;
        this.pending.delete(e.data.id);
        if (e.data.ok) p.resolve(e.data.result);
        else p.reject(e.data.code === "decode" ? new DecodeError(e.data.message) : Object.assign(new Error(e.data.message), { code: e.data.code }));
      };
      w.onerror = (e) => {
        e.preventDefault();
        this.fail(new Error("Worker d'analyse indisponible"));
      };
      this.worker = w;
      return w;
    } catch {
      this.failed = true;
      return null;
    }
  }

  private fail(err: Error) {
    this.failed = true;
    this.worker?.terminate();
    this.worker = null;
    for (const p of this.pending.values()) p.reject(Object.assign(err, { code: "worker" }));
    this.pending.clear();
  }

  /** Vérifie une fois que le Worker répond et peut dessiner (OffscreenCanvas 2D). */
  available(): Promise<boolean> {
    if (!this.ready) {
      this.ready = (async () => {
        if (!this.spawn()) return false;
        try {
          const r = await Promise.race([this.call({ op: "ping" }), new Promise((_, rej) => setTimeout(() => rej(new Error("délai")), 8000))]);
          this.canvas = r === "ok";
          return true;
        } catch {
          this.fail(new Error("Worker d'analyse indisponible"));
          return false;
        }
      })();
    }
    return this.ready;
  }

  call<T>(payload: WorkerPayload, transfer: Transferable[] = []): Promise<T> {
    const w = this.spawn();
    if (!w) return Promise.reject(Object.assign(new Error("Worker indisponible"), { code: "worker" }));
    const id = ++this.seq;
    return new Promise<T>((resolve, reject) => {
      this.pending.set(id, { resolve: resolve as (v: unknown) => void, reject });
      w.postMessage({ ...payload, id } as WorkerRequest, transfer);
    });
  }
}

const pixelChannel = new Channel();
const hashChannel = new Channel();

function isWorkerFailure(err: unknown): boolean {
  const code = (err as { code?: string } | null)?.code;
  return code === "worker" || code === "nocanvas";
}

/** Photo → dimensions, vignette WebP 640 px et mesures. Lève DecodeError si le format est illisible. */
export async function analyzeImagePixels(file: File, maxSide: number): Promise<ImageWorkResult> {
  if ((await pixelChannel.available()) && pixelChannel.canvas) {
    try {
      return await pixelChannel.call<ImageWorkResult>({ op: "image", file, name: file.name, maxSide });
    } catch (err) {
      if (!isWorkerFailure(err)) throw err;
    }
  }
  return processImage(file, file.name, maxSide);
}

/** Image d'une vidéo (déjà dessinée) → affiche WebP 640 px et mesures. */
export async function analyzeFrame(frame: Drawable, maxSide: number): Promise<ImageWorkResult> {
  if ((await pixelChannel.available()) && pixelChannel.canvas && typeof createImageBitmap === "function") {
    try {
      const bitmap = await createImageBitmap(frame as ImageBitmapSource);
      return await pixelChannel.call<ImageWorkResult>({ op: "frame", bitmap, maxSide }, [bitmap]);
    } catch {
      // createImageBitmap(video) ou le Worker peuvent échouer : repli sur le fil principal.
    }
  }
  const r = await thumbnailAndMetrics(frame, maxSide);
  const size = frame instanceof HTMLVideoElement ? { width: frame.videoWidth, height: frame.videoHeight } : { width: (frame as ImageBitmap).width, height: (frame as ImageBitmap).height };
  return { ...size, thumb: r.thumb, metrics: r.metrics, viaHeif: false };
}

/** Empreinte SHA-256 du contenu (complète jusqu'à 256 Mo, échantillonnée au-delà). */
export async function fileFingerprint(file: File): Promise<string> {
  if (await hashChannel.available()) {
    try {
      return await hashChannel.call<string>({ op: "sha256", file });
    } catch (err) {
      if (!isWorkerFailure(err)) throw err;
    }
  }
  return fingerprint(file);
}
