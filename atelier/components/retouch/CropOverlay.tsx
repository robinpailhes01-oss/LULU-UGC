"use client";

import { useRef } from "react";
import { cx } from "@/components/ui/cx";
import { dragCrop, nudgeCrop, type CropHandle } from "@/lib/client/retouch/crop";
import type { CropRect } from "@/lib/shared/types";

interface Props {
  /** Rectangle du cadre entier, en pixels CSS dans le conteneur. */
  frame: { x: number; y: number; w: number; h: number };
  crop: CropRect;
  /** Rapport verrouillé (largeur / hauteur en pixels) ou null. */
  ratio: number | null;
  frameW: number;
  frameH: number;
  onChange: (crop: CropRect, commit: boolean) => void;
}

const HANDLES: { id: Exclude<CropHandle, "move">; cls: string; cursor: string; label: string }[] = [
  { id: "nw", cls: "left-0 top-0 -translate-x-1/2 -translate-y-1/2", cursor: "cursor-nwse-resize", label: "Coin haut gauche" },
  { id: "ne", cls: "right-0 top-0 translate-x-1/2 -translate-y-1/2", cursor: "cursor-nesw-resize", label: "Coin haut droit" },
  { id: "sw", cls: "left-0 bottom-0 -translate-x-1/2 translate-y-1/2", cursor: "cursor-nesw-resize", label: "Coin bas gauche" },
  { id: "se", cls: "right-0 bottom-0 translate-x-1/2 translate-y-1/2", cursor: "cursor-nwse-resize", label: "Coin bas droit" },
  { id: "n", cls: "left-1/2 top-0 -translate-x-1/2 -translate-y-1/2", cursor: "cursor-ns-resize", label: "Bord haut" },
  { id: "s", cls: "left-1/2 bottom-0 -translate-x-1/2 translate-y-1/2", cursor: "cursor-ns-resize", label: "Bord bas" },
  { id: "w", cls: "left-0 top-1/2 -translate-x-1/2 -translate-y-1/2", cursor: "cursor-ew-resize", label: "Bord gauche" },
  { id: "e", cls: "right-0 top-1/2 translate-x-1/2 -translate-y-1/2", cursor: "cursor-ew-resize", label: "Bord droit" },
];

/** Cadre de recadrage : déplacer, redimensionner (poignées), grille des tiers, proportions verrouillées. */
export function CropOverlay({ frame, crop, ratio, frameW, frameH, onChange }: Props) {
  const drag = useRef<{ handle: CropHandle; x: number; y: number; start: CropRect; last: CropRect; pointerId: number } | null>(null);

  function begin(e: React.PointerEvent, handle: CropHandle) {
    e.preventDefault();
    e.stopPropagation();
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    drag.current = { handle, x: e.clientX, y: e.clientY, start: crop, last: crop, pointerId: e.pointerId };
  }

  function move(e: React.PointerEvent) {
    const d = drag.current;
    if (!d || d.pointerId !== e.pointerId) return;
    const next = dragCrop(d.start, d.handle, (e.clientX - d.x) / frame.w, (e.clientY - d.y) / frame.h, ratio, frameW, frameH);
    d.last = next;
    onChange(next, false);
  }

  function end(e: React.PointerEvent) {
    const d = drag.current;
    if (!d || d.pointerId !== e.pointerId) return;
    drag.current = null;
    onChange(d.last, true);
  }

  const left = frame.x + crop.x * frame.w;
  const top = frame.y + crop.y * frame.h;
  const width = crop.w * frame.w;
  const height = crop.h * frame.h;

  const shade = "absolute bg-night/60";
  return (
    <div className="pointer-events-none absolute inset-0">
      {/* Voile sur la photo hors du cadre (pas sur le fond de l'atelier). */}
      <div className={shade} style={{ left: frame.x, top: frame.y, width: frame.w, height: Math.max(0, top - frame.y) }} aria-hidden />
      <div className={shade} style={{ left: frame.x, top: top + height, width: frame.w, height: Math.max(0, frame.y + frame.h - top - height) }} aria-hidden />
      <div className={shade} style={{ left: frame.x, top, width: Math.max(0, left - frame.x), height }} aria-hidden />
      <div className={shade} style={{ left: left + width, top, width: Math.max(0, frame.x + frame.w - left - width), height }} aria-hidden />
      <div
        role="group"
        tabIndex={0}
        aria-label="Cadre de recadrage. Flèches : déplacer ; Maj + flèches : agrandir ou réduire."
        onKeyDown={(e) => {
          const next = nudgeCrop(crop, e.key, e.shiftKey, e.altKey ? 0.002 : 0.01, ratio, frameW, frameH);
          if (next) {
            e.preventDefault();
            onChange(next, true);
          }
        }}
        onPointerDown={(e) => begin(e, "move")}
        onPointerMove={move}
        onPointerUp={end}
        onPointerCancel={end}
        className="pointer-events-auto absolute cursor-move touch-none outline-none ring-chestnut focus-visible:ring-2"
        style={{ left, top, width, height }}
      >
        <div className="absolute inset-0 border border-surface/90" />
        {/* Grille des tiers */}
        <div className="absolute inset-y-0 left-1/3 w-px bg-surface/45" />
        <div className="absolute inset-y-0 left-2/3 w-px bg-surface/45" />
        <div className="absolute inset-x-0 top-1/3 h-px bg-surface/45" />
        <div className="absolute inset-x-0 top-2/3 h-px bg-surface/45" />
        {HANDLES.map((h) => (
          <span
            key={h.id}
            aria-hidden
            onPointerDown={(e) => begin(e, h.id)}
            title={h.label}
            className={cx("absolute flex h-7 w-7 touch-none items-center justify-center", h.cls, h.cursor)}
          >
            <span className={cx("block bg-surface shadow-[0_1px_3px_rgba(23,17,13,.5)]", h.id.length === 2 ? "h-3 w-3 rounded-[3px]" : h.id === "n" || h.id === "s" ? "h-1.5 w-5 rounded-full" : "h-5 w-1.5 rounded-full")} />
          </span>
        ))}
      </div>
    </div>
  );
}
