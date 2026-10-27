"use client";

import type { ImageWorkResult } from "@/lib/client/media/protocol";
import { analyzeFrame } from "@/lib/client/media/worker-client";

/**
 * Vidéos et sons : durée et dimensions via un élément <video>/<audio> caché (URL objet, muet,
 * préchargement des métadonnées), puis affiche WebP 640 px à min(1 s, durée/2).
 * Si le codec n'est pas lisible par ce navigateur, on renvoie ce qui a pu être lu (souvent rien).
 */

export interface VideoProbe {
  durationS: number | null;
  width: number | null;
  height: number | null;
  frame: ImageWorkResult | null;
}

const META_TIMEOUT = 15_000;
const SEEK_TIMEOUT = 10_000;

export async function probeVideo(file: File, maxSide: number): Promise<VideoProbe> {
  const empty: VideoProbe = { durationS: null, width: null, height: null, frame: null };
  if (typeof document === "undefined") return empty;
  const url = URL.createObjectURL(file);
  const video = document.createElement("video");
  video.muted = true;
  video.playsInline = true;
  video.preload = "metadata";
  video.crossOrigin = "anonymous";
  video.setAttribute("aria-hidden", "true");
  video.style.cssText = "position:fixed;left:-9999px;top:0;width:1px;height:1px;opacity:0;pointer-events:none";
  document.body.appendChild(video);
  try {
    video.src = url;
    const ok = await waitFor(video, "loadedmetadata", META_TIMEOUT);
    if (!ok) return empty;
    const duration = Number.isFinite(video.duration) && video.duration > 0 ? video.duration : null;
    const width = video.videoWidth || null;
    const height = video.videoHeight || null;
    const out: VideoProbe = { durationS: duration ? Math.round(duration * 1000) / 1000 : null, width, height, frame: null };
    if (!width || !height) return out;

    // Première tentative à min(1 s, durée/2) ; si l'image est entièrement noire (fondu d'ouverture),
    // une seconde tentative un peu plus loin.
    const attempts = duration ? [Math.min(1, duration / 2), ...(duration > 3 ? [Math.min(duration * 0.4, 5)] : [])] : [0];
    for (const at of attempts) {
      const seeked = waitFor(video, "seeked", SEEK_TIMEOUT);
      video.currentTime = at;
      if (!(await seeked)) break;
      if (video.readyState < 2) await waitFor(video, "loadeddata", SEEK_TIMEOUT);
      await nextFrame(video);
      try {
        const frame = await analyzeFrame(video, maxSide);
        const black = frame.metrics.clipLow > 0.995 && frame.metrics.blurScore < 1;
        out.frame = frame;
        if (!black) break;
      } catch {
        break;
      }
    }
    return out;
  } finally {
    video.removeAttribute("src");
    video.load();
    video.remove();
    URL.revokeObjectURL(url);
  }
}

export async function probeAudio(file: File): Promise<{ durationS: number | null }> {
  if (typeof document === "undefined") return { durationS: null };
  const url = URL.createObjectURL(file);
  const audio = document.createElement("audio");
  audio.preload = "metadata";
  try {
    audio.src = url;
    const ok = await waitFor(audio, "loadedmetadata", META_TIMEOUT);
    if (!ok || !Number.isFinite(audio.duration) || audio.duration <= 0) return { durationS: null };
    return { durationS: Math.round(audio.duration * 1000) / 1000 };
  } finally {
    audio.removeAttribute("src");
    audio.load();
    URL.revokeObjectURL(url);
  }
}

function waitFor(el: HTMLMediaElement, event: string, timeoutMs: number): Promise<boolean> {
  return new Promise((resolve) => {
    const done = (v: boolean) => {
      window.clearTimeout(timer);
      el.removeEventListener(event, onOk);
      el.removeEventListener("error", onErr);
      resolve(v);
    };
    const onOk = () => done(true);
    const onErr = () => done(false);
    const timer = window.setTimeout(() => done(false), timeoutMs);
    el.addEventListener(event, onOk, { once: true });
    el.addEventListener("error", onErr, { once: true });
  });
}

/** Attend que l'image affichée corresponde bien à la position demandée. */
function nextFrame(video: HTMLVideoElement): Promise<void> {
  return new Promise((resolve) => {
    const v = video as HTMLVideoElement & { requestVideoFrameCallback?: (cb: () => void) => number };
    let settled = false;
    const finish = () => {
      if (!settled) {
        settled = true;
        resolve();
      }
    };
    if (typeof v.requestVideoFrameCallback === "function") {
      v.requestVideoFrameCallback(finish);
      window.setTimeout(finish, 300);
    } else window.requestAnimationFrame(() => window.requestAnimationFrame(finish));
  });
}
