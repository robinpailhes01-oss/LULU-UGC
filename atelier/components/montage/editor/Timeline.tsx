"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Film, Image as ImageIcon, Minus, Music, Pause, Play, Plus, Scan, Type } from "lucide-react";
import { IconButton } from "@/components/ui/Button";
import { cx } from "@/components/ui/cx";
import { plainText, TEXT_STYLE_LABEL } from "@/lib/client/montage/style";
import { textWindow, type MontageTiming } from "@/lib/client/montage/timing";
import type { Asset, MontageSpec } from "@/lib/shared/types";
import { formatSeconds, formatTimecode } from "@/components/montage/editor/controls";

export type Selection = { kind: "clip"; id: string } | { kind: "text"; id: string } | { kind: "end" } | { kind: "music" } | null;

interface Props {
  spec: MontageSpec;
  timing: MontageTiming;
  assets: Record<string, Asset>;
  currentTime: number;
  playing: boolean;
  selection: Selection;
  onSelect: (s: Selection) => void;
  onSeek: (t: number) => void;
  onTogglePlay: () => void;
  onReorder: (from: number, to: number) => void;
  onRemoveClip: (id: string) => void;
  onTextTiming: (id: string, startS: number, endS: number) => void;
  onRemoveText: (id: string) => void;
}

const LABEL_W = 76;

/**
 * Timeline du montage : règle, plans (vignettes proportionnelles à leur durée, réordonnables par
 * glisser-déposer ou Alt+flèches), textes (déplaçables et redimensionnables), musique, tête de
 * lecture déplaçable. Les positions viennent de computeTiming, comme dans la composition.
 */
export function Timeline(props: Props) {
  const { spec, timing, assets, currentTime, playing, selection, onSelect, onSeek, onTogglePlay } = props;
  const scroller = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(800);
  const [zoom, setZoom] = useState(1);
  const D = Math.max(timing.durationS, 1);

  useEffect(() => {
    const el = scroller.current;
    if (!el) return;
    const ro = new ResizeObserver(() => setWidth(el.clientWidth));
    ro.observe(el);
    setWidth(el.clientWidth);
    return () => ro.disconnect();
  }, []);

  const pps = Math.max(12, ((width - 24) / D) * zoom);
  const inner = Math.max(width, D * pps + 24);
  const x = (t: number) => 12 + t * pps;
  const tAt = (clientX: number) => {
    const el = scroller.current!;
    const r = el.getBoundingClientRect();
    return Math.min(D, Math.max(0, (clientX - r.left + el.scrollLeft - 12) / pps));
  };

  // Garde la tête de lecture visible pendant la lecture.
  useEffect(() => {
    const el = scroller.current;
    if (!el || !playing) return;
    const px = x(currentTime);
    if (px < el.scrollLeft + 24 || px > el.scrollLeft + el.clientWidth - 24) el.scrollLeft = Math.max(0, px - 48);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentTime, playing]);

  const ticks = useMemo(() => {
    const step = pps > 120 ? 0.5 : pps > 50 ? 1 : pps > 22 ? 2 : 5;
    // Une étiquette au plus toutes les 44 px.
    const labelEvery = Math.max(1, Math.ceil(44 / (step * pps)));
    const out: { t: number; major: boolean }[] = [];
    for (let i = 0; i * step <= D + 0.0001; i++) out.push({ t: Math.round(i * step * 100) / 100, major: i % labelEvery === 0 });
    return out;
  }, [pps, D]);

  // --- Tête de lecture -------------------------------------------------------------------------
  const scrub = (e: React.PointerEvent) => {
    if (e.button !== 0) return;
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    onSeek(tAt(e.clientX));
    const move = (ev: PointerEvent) => onSeek(tAt(ev.clientX));
    const up = () => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
    };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
  };

  return (
    <div className="flex h-full min-h-0 flex-col bg-surface">
      <div className="flex h-10 shrink-0 items-center gap-1 border-b border-line px-2">
        <IconButton label={playing ? "Pause (Espace)" : "Lire (Espace)"} size="sm" onClick={onTogglePlay}>
          {playing ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
        </IconButton>
        <span className="ml-1 font-mono text-[12px] tabular-nums text-ink" aria-live="off">
          {formatTimecode(currentTime)} <span className="text-faint">/ {formatTimecode(D)}</span>
        </span>
        <div className="ml-auto flex items-center gap-0.5">
          <IconButton label="Dézoomer la timeline" size="sm" onClick={() => setZoom((z) => Math.max(1, z / 1.5))} disabled={zoom <= 1}>
            <Minus className="h-4 w-4" />
          </IconButton>
          <IconButton label="Ajuster à la largeur" size="sm" onClick={() => setZoom(1)} active={zoom === 1}>
            <Scan className="h-4 w-4" />
          </IconButton>
          <IconButton label="Zoomer la timeline" size="sm" onClick={() => setZoom((z) => Math.min(8, z * 1.5))}>
            <Plus className="h-4 w-4" />
          </IconButton>
        </div>
      </div>
      <div className="flex min-h-0 flex-1">
        <div className="flex shrink-0 flex-col border-r border-line text-[11.5px] font-semibold text-muted" style={{ width: LABEL_W }}>
          <div className="h-6 border-b border-line" />
          <div className="flex h-[72px] items-center gap-1.5 px-2.5">
            <Film className="h-3.5 w-3.5" aria-hidden /> Plans
          </div>
          <div className="flex h-10 items-center gap-1.5 px-2.5">
            <Type className="h-3.5 w-3.5" aria-hidden /> Textes
          </div>
          <div className="flex h-7 items-center gap-1.5 px-2.5">
            <Music className="h-3.5 w-3.5" aria-hidden /> Son
          </div>
        </div>
        <div ref={scroller} className="relative min-w-0 flex-1 overflow-x-auto overflow-y-hidden" onPointerDown={(e) => e.target === e.currentTarget && scrub(e)}>
          <div className="relative" style={{ width: inner }}>
            {/* Règle */}
            <div
              className="relative h-6 cursor-ew-resize select-none border-b border-line bg-canvas/60"
              onPointerDown={scrub}
              role="slider"
              tabIndex={0}
              aria-label="Position de lecture"
              aria-valuemin={0}
              aria-valuemax={Math.round(D * 10) / 10}
              aria-valuenow={Math.round(currentTime * 10) / 10}
              aria-valuetext={formatSeconds(currentTime)}
              onKeyDown={(e) => {
                if (e.key === "ArrowRight") onSeek(Math.min(D, currentTime + (e.shiftKey ? 1 : 1 / spec.fps)));
                else if (e.key === "ArrowLeft") onSeek(Math.max(0, currentTime - (e.shiftKey ? 1 : 1 / spec.fps)));
                else if (e.key === "Home") onSeek(0);
                else if (e.key === "End") onSeek(D);
                else return;
                e.preventDefault();
              }}
            >
              {ticks.map((tk) => (
                <div key={tk.t} className="absolute top-0 h-full" style={{ left: x(tk.t) }}>
                  <div className={cx("w-px bg-line-strong", tk.major ? "h-2.5" : "h-1.5")} style={{ backgroundColor: "rgba(36,29,23,.28)" }} />
                  {tk.major ? <span className="absolute left-1 top-1 whitespace-nowrap text-[10px] tabular-nums text-faint">{tk.t.toLocaleString("fr-FR")} s</span> : null}
                </div>
              ))}
            </div>
            <ClipLane {...props} x={x} pps={pps} tAt={tAt} />
            <TextLane {...props} x={x} pps={pps} D={D} />
            <div className="relative h-7 border-t border-line" onPointerDown={(e) => e.target === e.currentTarget && scrub(e)}>
              {spec.musicAssetId ? (
                <button
                  type="button"
                  onClick={() => onSelect({ kind: "music" })}
                  className={cx(
                    "absolute top-1 flex h-5 items-center gap-1 overflow-hidden rounded-md px-2 text-left text-[11px] font-semibold",
                    selection?.kind === "music" ? "bg-plum text-surface" : "bg-plum-soft text-plum hover:brightness-95",
                  )}
                  style={{ left: x(0), width: Math.max(24, Math.min(D, assets[spec.musicAssetId]?.durationS ?? D) * pps) }}
                >
                  <Music className="h-3 w-3 shrink-0" aria-hidden />
                  <span className="truncate">{assets[spec.musicAssetId]?.name ?? "Musique"}</span>
                </button>
              ) : null}
            </div>
            {/* Tête de lecture */}
            <div className="pointer-events-none absolute bottom-0 top-0 z-20" style={{ left: x(currentTime) }} aria-hidden>
              <div className="absolute -left-[5px] top-0 h-3 w-[11px] rounded-b-[3px] bg-terracotta" />
              <div className="absolute left-0 top-0 h-full w-px bg-terracotta" />
            </div>
          </div>
          {timing.clips.length === 0 ? (
            <p className="pointer-events-none absolute left-4 top-[34px] text-[12.5px] text-muted">Ajoutez des photos et des vidéos : elles s'enchaînent ici.</p>
          ) : null}
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------------------------

function ClipLane({ spec, timing, assets, selection, onSelect, onReorder, onRemoveClip, x, pps, tAt }: Props & { x: (t: number) => number; pps: number; tAt: (cx: number) => number }) {
  const [drag, setDrag] = useState<{ from: number; to: number; dx: number } | null>(null);

  const startDrag = (e: React.PointerEvent, index: number) => {
    if (e.button !== 0) return;
    const startX = e.clientX;
    let moved = false;
    let current: { from: number; to: number; dx: number } | null = null;
    const move = (ev: PointerEvent) => {
      const dx = ev.clientX - startX;
      if (!moved && Math.abs(dx) < 5) return;
      moved = true;
      const t = tAt(ev.clientX);
      let to = timing.clips.findIndex((c) => t < c.startS + c.durationS / 2);
      if (to === -1) to = timing.clips.length;
      if (to > index) to -= 1;
      current = { from: index, to: Math.max(0, Math.min(timing.clips.length - 1, to)), dx };
      setDrag(current);
    };
    const up = () => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
      setDrag(null);
      const d = current as { from: number; to: number } | null;
      if (moved && d && d.from !== d.to) onReorder(d.from, d.to);
      if (!moved) onSelect({ kind: "clip", id: spec.clips[index].id });
    };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
  };

  const indicator = drag && drag.from !== drag.to ? (drag.to > drag.from ? timing.clips[drag.to].endS : timing.clips[drag.to].startS) : null;

  return (
    <div className="relative h-[72px]">
      {timing.clips.map((t, i) => {
        const clip = spec.clips[i];
        const a = assets[clip.assetId];
        const sel = selection?.kind === "clip" && selection.id === clip.id;
        const thumb = a?.urls.thumb ?? a?.urls.poster ?? null;
        const w = Math.max(10, t.durationS * pps - 2);
        return (
          <button
            key={clip.id}
            type="button"
            onPointerDown={(e) => startDrag(e, i)}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                onSelect({ kind: "clip", id: clip.id });
              } else if (e.altKey && (e.key === "ArrowLeft" || e.key === "ArrowRight")) {
                e.preventDefault();
                const to = e.key === "ArrowLeft" ? i - 1 : i + 1;
                if (to >= 0 && to < spec.clips.length) onReorder(i, to);
              } else if (e.key === "Delete" || e.key === "Backspace") {
                e.preventDefault();
                onRemoveClip(clip.id);
              }
            }}
            aria-label={`Plan ${i + 1} : ${a?.name ?? "média introuvable"}, ${formatSeconds(t.durationS)}${sel ? " (sélectionné)" : ""}. Alt+flèches pour déplacer, Suppr pour retirer.`}
            aria-pressed={sel}
            className={cx(
              "group absolute top-1.5 h-[60px] touch-none select-none overflow-hidden rounded-lg border-2 bg-night text-left outline-none transition-shadow focus-visible:ring-2 focus-visible:ring-chestnut focus-visible:ring-offset-1",
              sel ? "border-chestnut shadow-pop" : "border-surface hover:border-honey/70",
              drag?.from === i && "opacity-60",
            )}
            style={{ left: x(t.startS) + 1, width: w, zIndex: sel ? 10 : i + 1, transform: drag?.from === i ? `translateX(${drag.dx}px)` : undefined }}
          >
            {thumb ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={thumb} alt="" draggable={false} className="pointer-events-none h-full w-full object-cover opacity-90" />
            ) : (
              <span className="flex h-full w-full items-center justify-center text-surface/50">{a?.kind === "video" ? <Film className="h-4 w-4" /> : <ImageIcon className="h-4 w-4" />}</span>
            )}
            <span className="pointer-events-none absolute inset-x-0 bottom-0 flex items-center justify-between gap-1 bg-gradient-to-t from-night/80 to-transparent px-1.5 pb-0.5 pt-3 text-[10.5px] font-semibold text-surface">
              <span>{i + 1}</span>
              {w > 46 ? <span className="tabular-nums">{formatSeconds(t.durationS)}</span> : null}
            </span>
            {t.overlapS > 0 ? (
              <span className="pointer-events-none absolute inset-y-0 left-0 bg-gradient-to-r from-honey/60 to-transparent" style={{ width: Math.max(4, t.overlapS * pps) }} title="Transition" />
            ) : null}
            {!a ? <span className="absolute inset-0 flex items-center justify-center bg-terracotta/70 text-[10px] font-semibold text-surface">Introuvable</span> : null}
          </button>
        );
      })}
      {timing.endCard ? (
        <button
          type="button"
          onClick={() => onSelect({ kind: "end" })}
          aria-pressed={selection?.kind === "end"}
          aria-label={`Carte de fin, ${formatSeconds(timing.endCard.durationS)}`}
          className={cx(
            "absolute top-1.5 flex h-[60px] items-center justify-center overflow-hidden rounded-lg border-2 bg-[#F4F0E8] px-1 font-display text-[12px] italic text-ink outline-none focus-visible:ring-2 focus-visible:ring-chestnut",
            selection?.kind === "end" ? "border-chestnut shadow-pop" : "border-line hover:border-honey/70",
          )}
          style={{ left: x(timing.endCard.startS) + 1, width: Math.max(12, timing.endCard.durationS * pps - 2), zIndex: spec.clips.length + 1 }}
        >
          <span className="truncate">{spec.endCard?.title || "Fin"}</span>
        </button>
      ) : null}
      {indicator !== null ? <div className="pointer-events-none absolute top-0 z-30 h-full w-[3px] -translate-x-1/2 rounded-full bg-chestnut" style={{ left: x(indicator) }} aria-hidden /> : null}
    </div>
  );
}

function TextLane({ spec, selection, onSelect, onTextTiming, onRemoveText, x, pps, D }: Props & { x: (t: number) => number; pps: number; D: number }) {
  const [live, setLive] = useState<{ id: string; startS: number; endS: number } | null>(null);

  const startDrag = (e: React.PointerEvent, id: string, mode: "move" | "start" | "end") => {
    if (e.button !== 0) return;
    e.stopPropagation();
    const t = spec.texts.find((x) => x.id === id);
    if (!t) return;
    const startX = e.clientX;
    const s0 = t.startS;
    const e0 = t.endS;
    let moved = false;
    let cur = { id, startS: s0, endS: e0 };
    const snap = (v: number) => Math.round(v * 10) / 10;
    const move = (ev: PointerEvent) => {
      const dt = (ev.clientX - startX) / pps;
      if (!moved && Math.abs(ev.clientX - startX) < 4) return;
      moved = true;
      if (mode === "move") {
        const len = e0 - s0;
        const s = Math.min(Math.max(0, snap(s0 + dt)), Math.max(0, D - len));
        cur = { id, startS: s, endS: snap(s + len) };
      } else if (mode === "start") cur = { id, startS: Math.min(Math.max(0, snap(s0 + dt)), e0 - 0.3), endS: e0 };
      else cur = { id, startS: s0, endS: Math.max(s0 + 0.3, Math.min(D, snap(e0 + dt))) };
      setLive(cur);
    };
    const up = () => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
      setLive(null);
      if (moved) onTextTiming(id, cur.startS, cur.endS);
      else onSelect({ kind: "text", id });
    };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
  };

  return (
    <div className="relative h-10 border-t border-line">
      {spec.texts.map((t) => {
        const w0 = live?.id === t.id ? live : t;
        const win = textWindow(w0, D) ?? { startS: Math.min(w0.startS, D), durationS: 0.2 };
        const sel = selection?.kind === "text" && selection.id === t.id;
        return (
          <div
            key={t.id}
            role="button"
            tabIndex={0}
            aria-pressed={sel}
            aria-label={`Texte « ${t.text} », de ${formatSeconds(t.startS)} à ${formatSeconds(t.endS)}. Alt+flèches pour décaler, Suppr pour retirer.`}
            onPointerDown={(e) => startDrag(e, t.id, "move")}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                onSelect({ kind: "text", id: t.id });
              } else if (e.altKey && (e.key === "ArrowLeft" || e.key === "ArrowRight")) {
                e.preventDefault();
                const d = e.key === "ArrowLeft" ? -0.1 : 0.1;
                const len = t.endS - t.startS;
                const s = Math.min(Math.max(0, Math.round((t.startS + d) * 10) / 10), Math.max(0, D - len));
                onTextTiming(t.id, s, Math.round((s + len) * 10) / 10);
              } else if (e.key === "Delete" || e.key === "Backspace") {
                e.preventDefault();
                onRemoveText(t.id);
              }
            }}
            className={cx(
              "absolute top-1.5 flex h-7 cursor-grab touch-none select-none items-center overflow-hidden rounded-md text-[11.5px] font-semibold outline-none focus-visible:ring-2 focus-visible:ring-chestnut active:cursor-grabbing",
              sel ? "bg-chestnut text-surface shadow-card" : "bg-honey-soft text-[#6b4519] hover:brightness-95",
            )}
            style={{ left: x(win.startS), width: Math.max(14, win.durationS * pps) }}
          >
            <span className="absolute inset-y-0 left-0 w-2 cursor-ew-resize" onPointerDown={(e) => startDrag(e, t.id, "start")} aria-hidden />
            <span className="truncate px-2.5">
              <span className="opacity-70">{TEXT_STYLE_LABEL[t.style]} · </span>
              {plainText(t.text) || "…"}
            </span>
            <span className="absolute inset-y-0 right-0 w-2 cursor-ew-resize" onPointerDown={(e) => startDrag(e, t.id, "end")} aria-hidden />
          </div>
        );
      })}
    </div>
  );
}
