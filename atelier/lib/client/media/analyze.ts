"use client";

import { readPhotoMeta } from "@/lib/client/media/exif";
import { guessMime, kindOf } from "@/lib/client/media/kind";
import { readVideoMeta } from "@/lib/client/media/mp4";
import { THUMB_MAX_SIDE } from "@/lib/client/media/pixels";
import type { ImageWorkResult } from "@/lib/client/media/protocol";
import { probeAudio, probeVideo } from "@/lib/client/media/video";
import { analyzeImagePixels, fileFingerprint } from "@/lib/client/media/worker-client";
import type { AssetKind, ClientMediaFacts } from "@/lib/shared/types";

/**
 * Analyse complète d'un fichier avant envoi, entièrement dans le navigateur :
 * EXIF / métadonnées vidéo, vignette ou affiche WebP 640 px, dHash, netteté, exposition, SHA-256.
 * Chaque mesure est indépendante : un échec (format inconnu, codec illisible) laisse la valeur à null
 * sans empêcher l'envoi.
 */

export type MediaFacts = Omit<ClientMediaFacts, "hasThumb" | "hasPoster">;

export interface MediaAnalysis {
  kind: AssetKind;
  mime: string;
  facts: MediaFacts;
  /** Vignette des photos (WebP, ou JPEG sur les navigateurs sans encodeur WebP). */
  thumb: Blob | null;
  /** Affiche des vidéos. */
  poster: Blob | null;
  /** Remarques affichables (aperçu indisponible…). */
  notes: string[];
}

export class UnsupportedFileError extends Error {}

export async function analyzeFile(file: File): Promise<MediaAnalysis> {
  const mime = guessMime(file);
  const kind = kindOf(mime);
  if (!kind) throw new UnsupportedFileError(`Type de fichier non pris en charge : ${file.name}`);

  const facts: MediaFacts = {
    width: null,
    height: null,
    durationS: null,
    takenAt: null,
    camera: null,
    gps: null,
    sha256: null,
    dhash: null,
    blurScore: null,
    lumaMean: null,
    clipHigh: null,
    clipLow: null,
  };
  const notes: string[] = [];
  let thumb: Blob | null = null;
  let poster: Blob | null = null;

  const hash = fileFingerprint(file).catch(() => null);

  const applyPixels = (r: ImageWorkResult) => {
    facts.width = r.width || facts.width;
    facts.height = r.height || facts.height;
    facts.dhash = r.metrics.dhash;
    facts.blurScore = r.metrics.blurScore;
    facts.lumaMean = r.metrics.lumaMean;
    facts.clipHigh = r.metrics.clipHigh;
    facts.clipLow = r.metrics.clipLow;
  };

  if (kind === "photo") {
    const [meta, pixels] = await Promise.all([
      readPhotoMeta(file, file.name),
      analyzeImagePixels(file, THUMB_MAX_SIDE).catch(() => null),
    ]);
    facts.takenAt = meta.takenAt;
    facts.camera = meta.camera;
    facts.gps = meta.gps;
    if (pixels) {
      applyPixels(pixels);
      thumb = pixels.thumb;
    } else notes.push("Aperçu indisponible : ce format n'est pas lu par le navigateur.");
  } else if (kind === "video") {
    const [container, probe] = await Promise.all([readVideoMeta(file), probeVideo(file, THUMB_MAX_SIDE)]);
    facts.takenAt = container.takenAt;
    facts.camera = container.camera;
    facts.gps = container.gps;
    facts.durationS = probe.durationS ?? container.durationS;
    facts.width = probe.width ?? container.width;
    facts.height = probe.height ?? container.height;
    if (probe.frame) {
      applyPixels(probe.frame);
      facts.width = probe.width ?? container.width ?? probe.frame.width;
      facts.height = probe.height ?? container.height ?? probe.frame.height;
      poster = probe.frame.thumb;
    } else notes.push("Affiche indisponible : ce codec n'est pas lu par le navigateur.");
  } else {
    facts.durationS = (await probeAudio(file)).durationS;
  }

  facts.sha256 = await hash;
  return { kind, mime, facts, thumb, poster, notes };
}
