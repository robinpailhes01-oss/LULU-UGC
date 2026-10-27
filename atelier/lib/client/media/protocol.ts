import type { PixelMetrics } from "@/lib/client/media/pixels";

/** Messages échangés avec le Worker d'analyse. */
export type WorkerRequest =
  | { id: number; op: "image"; file: Blob; name: string; maxSide: number }
  | { id: number; op: "frame"; bitmap: ImageBitmap; maxSide: number }
  | { id: number; op: "sha256"; file: Blob }
  | { id: number; op: "ping" };

export interface ImageWorkResult {
  /** Dimensions de l'image d'origine, orientation appliquée. */
  width: number;
  height: number;
  thumb: Blob;
  metrics: PixelMetrics;
  /** Décodé via libheif (le navigateur ne lit pas ce format). */
  viaHeif: boolean;
}

export type WorkerResponse =
  | { id: number; ok: true; result: ImageWorkResult | string | null }
  | { id: number; ok: false; code: "decode" | "nocanvas" | "error"; message: string };
