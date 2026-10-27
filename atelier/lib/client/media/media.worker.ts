/**
 * Worker d'analyse des médias : décodage des photos (HEIC compris), vignettes WebP, mesures de
 * netteté/exposition/dHash et empreinte SHA-256, hors du fil principal pour garder l'interface fluide.
 */
import { DecodeError, processImage } from "@/lib/client/media/image-work";
import { thumbnailAndMetrics } from "@/lib/client/media/pixels";
import type { WorkerRequest, WorkerResponse } from "@/lib/client/media/protocol";
import { fingerprint } from "@/lib/client/media/sha256";

interface WorkerScope {
  onmessage: ((event: MessageEvent<WorkerRequest>) => void) | null;
  postMessage(message: WorkerResponse, transfer?: Transferable[]): void;
}

const scope = self as unknown as WorkerScope;

scope.onmessage = async (event: MessageEvent<WorkerRequest>) => {
  const req = event.data;
  const reply = (res: WorkerResponse) => scope.postMessage(res);
  try {
    switch (req.op) {
      case "ping":
        reply({ id: req.id, ok: true, result: typeof OffscreenCanvas !== "undefined" && canDraw() ? "ok" : "nocanvas" });
        return;
      case "sha256":
        reply({ id: req.id, ok: true, result: await fingerprint(req.file) });
        return;
      case "image":
        reply({ id: req.id, ok: true, result: await processImage(req.file, req.name, req.maxSide) });
        return;
      case "frame": {
        try {
          const r = await thumbnailAndMetrics(req.bitmap, req.maxSide);
          reply({ id: req.id, ok: true, result: { width: req.bitmap.width, height: req.bitmap.height, thumb: r.thumb, metrics: r.metrics, viaHeif: false } });
        } finally {
          req.bitmap.close();
        }
        return;
      }
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    reply({ id: req.id, ok: false, code: err instanceof DecodeError ? "decode" : /canvas/i.test(message) ? "nocanvas" : "error", message });
  }
};

function canDraw(): boolean {
  try {
    const c = new OffscreenCanvas(2, 2);
    return Boolean(c.getContext("2d")) && typeof c.convertToBlob === "function";
  } catch {
    return false;
  }
}

export {};
