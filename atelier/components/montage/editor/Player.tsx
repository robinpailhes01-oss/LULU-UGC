"use client";

import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from "react";
import { AlertTriangle } from "lucide-react";
import { Spinner } from "@/components/ui/Spinner";

/** Interface impérative du lecteur HyperFrames (sous-ensemble utilisé par l'éditeur). */
interface HfPlayerElement extends HTMLElement {
  play(): void;
  pause(): void;
  seek(t: number): void;
  currentTime: number;
  readonly duration: number;
  readonly paused: boolean;
}

export interface PlayerHandle {
  seek: (t: number) => void;
  play: () => void;
  pause: () => void;
  toggle: () => void;
  readonly paused: boolean;
}

/**
 * Aperçu d'une composition dans <hyperframes-player> (web component chargé à la demande).
 * La composition est passée en srcdoc, dans un iframe isolé (sandbox-origin="opaque") : le code
 * du montage, même modifié à la main, n'a aucun accès à l'Atelier. Garde la position de lecture
 * quand la composition change.
 */
export const Player = forwardRef<PlayerHandle, {
  html: string | null;
  width: number;
  height: number;
  loading?: boolean;
  error?: string | null;
  onTime?: (t: number) => void;
  onPlayingChange?: (playing: boolean) => void;
}>(function Player({ html, width, height, loading, error, onTime, onPlayingChange }, ref) {
  const el = useRef<HfPlayerElement | null>(null);
  const box = useRef<HTMLDivElement>(null);
  const [registered, setRegistered] = useState(false);
  const [loadFailed, setLoadFailed] = useState<string | null>(null);
  const [size, setSize] = useState<{ w: number; h: number } | null>(null);
  const [painted, setPainted] = useState(false);
  const lastTime = useRef(0);
  const cbs = useRef({ onTime, onPlayingChange });
  cbs.current = { onTime, onPlayingChange };

  useEffect(() => {
    let alive = true;
    import("@hyperframes/player")
      .then(() => alive && setRegistered(true))
      .catch((err: unknown) => alive && setLoadFailed(err instanceof Error ? err.message : "Lecteur indisponible"));
    return () => {
      alive = false;
    };
  }, []);

  // Le lecteur occupe la plus grande boîte au bon format dans l'espace disponible.
  useEffect(() => {
    const b = box.current;
    if (!b) return;
    const fit = () => {
      const r = b.getBoundingClientRect();
      if (r.width <= 0 || r.height <= 0) return;
      const scale = Math.min(r.width / width, r.height / height);
      setSize({ w: Math.floor(width * scale), h: Math.floor(height * scale) });
    };
    fit();
    const ro = new ResizeObserver(fit);
    ro.observe(b);
    return () => ro.disconnect();
  }, [width, height]);

  useEffect(() => {
    const p = el.current;
    if (!p || !registered) return;
    const onTimeUpdate = (e: Event) => {
      const t = (e as CustomEvent<{ currentTime: number }>).detail?.currentTime ?? 0;
      lastTime.current = t;
      cbs.current.onTime?.(t);
    };
    const onReady = () => {
      // Nouvelle composition chargée : on revient où l'on était.
      if (lastTime.current > 0) {
        try {
          p.seek(Math.min(lastTime.current, Math.max(0, (p.duration || lastTime.current) - 0.05)));
        } catch {
          /* lecteur pas encore prêt */
        }
      }
    };
    const onPlay = () => cbs.current.onPlayingChange?.(true);
    const onPause = () => cbs.current.onPlayingChange?.(false);
    const onPainted = () => setPainted(true);
    p.addEventListener("timeupdate", onTimeUpdate);
    p.addEventListener("ready", onReady);
    p.addEventListener("play", onPlay);
    p.addEventListener("pause", onPause);
    p.addEventListener("ended", onPause);
    p.addEventListener("painted", onPainted);
    p.addEventListener("assetsready", onPainted);
    return () => {
      p.removeEventListener("timeupdate", onTimeUpdate);
      p.removeEventListener("ready", onReady);
      p.removeEventListener("play", onPlay);
      p.removeEventListener("pause", onPause);
      p.removeEventListener("ended", onPause);
      p.removeEventListener("painted", onPainted);
      p.removeEventListener("assetsready", onPainted);
    };
  }, [registered]);

  // Premier chargement : voile « Chargement des médias » (le lecteur n'affiche rien de lisible).
  useEffect(() => {
    if (painted) return;
    const t = window.setTimeout(() => setPainted(true), 15000);
    return () => window.clearTimeout(t);
  }, [painted]);

  useImperativeHandle(
    ref,
    () => ({
      seek: (t: number) => {
        lastTime.current = t;
        try {
          el.current?.seek(t);
        } catch {
          /* lecteur pas prêt */
        }
        cbs.current.onTime?.(t);
      },
      play: () => el.current?.play(),
      pause: () => el.current?.pause(),
      toggle: () => {
        const p = el.current;
        if (!p) return;
        if (p.paused) p.play();
        else p.pause();
      },
      get paused() {
        return el.current?.paused ?? true;
      },
    }),
    [],
  );

  const failure = loadFailed ?? error;
  return (
    <div ref={box} className="relative flex h-full w-full items-center justify-center">
      {size ? (
        <div className="relative overflow-hidden rounded-[10px] bg-night shadow-pop" style={{ width: size.w, height: size.h }}>
          {registered && html ? (
            <hyperframes-player
              ref={(node: HTMLElement | null) => {
                el.current = node as HfPlayerElement | null;
              }}
              srcdoc={html}
              width={width}
              height={height}
              controls
              sandbox-origin="opaque"
              assets-loading-ui="none"
              aria-label="Aperçu du montage"
              style={{ display: "block", width: "100%", height: "100%" }}
            />
          ) : (
            <div className="skeleton h-full w-full rounded-none bg-night/80" />
          )}
          {registered && html && !painted ? (
            <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center gap-3 bg-night text-[13px] text-surface/80" role="status">
              <Spinner className="text-honey" label="Chargement des médias" />
              Chargement des médias…
            </div>
          ) : null}
          {loading && registered && html && painted ? (
            <span className="pointer-events-none absolute right-2 top-2 rounded-full bg-night/70 px-2 py-1 text-surface">
              <Spinner className="text-surface" label="Mise à jour de l'aperçu" />
            </span>
          ) : null}
          {failure ? (
            <div role="alert" className="absolute inset-x-3 bottom-14 flex items-start gap-2 rounded-xl bg-night/85 px-3 py-2 text-[12.5px] text-surface">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-[#f0b49c]" aria-hidden />
              <span>Aperçu indisponible : {failure}</span>
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
});
