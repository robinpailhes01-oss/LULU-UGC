"use client";

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { cx } from "@/components/ui/cx";
import { CropOverlay } from "@/components/retouch/CropOverlay";
import { RetouchRenderer } from "@/lib/client/retouch/renderer";
import type { PhotoSource } from "@/lib/client/retouch/source";
import type { OutputGeometry } from "@/lib/shared/look";
import type { CropRect, RetouchParams } from "@/lib/shared/types";

export type ZoomMode = "fit" | "100";

interface Props {
  source: PhotoSource | null;
  params: RetouchParams;
  geometry: OutputGeometry | null;
  cropMode: boolean;
  bypass: boolean;
  zoom: ZoomMode;
  onZoomChange: (z: ZoomMode) => void;
  ratio: number | null;
  onCropChange: (crop: CropRect, commit: boolean) => void;
  /** WebGL2 indisponible : le parent bascule sur l'aperçu approché. */
  onUnsupported: () => void;
  /** Espaces réservés en haut (barre d'outils flottante) et en bas (feuille de réglages sur mobile). */
  topInset?: number;
  bottomInset?: number;
  className?: string;
}

/** Aperçu en direct (WebGL2) : ajusté à la fenêtre ou à 100 %, déplacement à la souris, recadrage. */
export function PreviewCanvas({ source, params, geometry, cropMode, bypass, zoom, onZoomChange, ratio, onCropChange, onUnsupported, topInset = 0, bottomInset = 0, className }: Props) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rendererRef = useRef<RetouchRenderer | null>(null);
  const uploaded = useRef<PhotoSource | null>(null);
  const [size, setSize] = useState({ w: 0, h: 0, dpr: 1 });
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const panDrag = useRef<{ x: number; y: number; px: number; py: number; id: number } | null>(null);
  const raf = useRef(0);
  const onUnsupportedRef = useRef(onUnsupported);
  onUnsupportedRef.current = onUnsupported;

  // Moteur WebGL (une fois).
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const r = RetouchRenderer.create(canvas);
    if (!r) {
      onUnsupportedRef.current();
      return;
    }
    rendererRef.current = r;
    return () => {
      cancelAnimationFrame(raf.current);
      r.dispose();
      rendererRef.current = null;
      uploaded.current = null;
    };
  }, []);

  // Taille du conteneur.
  useLayoutEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const update = () => {
      const r = el.getBoundingClientRect();
      setSize({ w: Math.round(r.width), h: Math.round(r.height), dpr: Math.min(window.devicePixelRatio || 1, 2) });
    };
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // Contenu affiché : image recadrée, ou cadre entier en mode recadrage.
  const natW = geometry ? (cropMode ? geometry.frameWidth : geometry.width) : 0;
  const natH = geometry ? (cropMode ? geometry.frameHeight : geometry.height) : 0;
  const pad = size.w < 640 ? 12 : 28;
  const availW = Math.max(1, size.w - pad * 2);
  const availH = Math.max(1, size.h - pad * 2 - topInset - bottomInset);
  const fitScale = natW && natH ? Math.min(availW / natW, availH / natH, 1) : 1;
  const effectiveZoom: ZoomMode = cropMode ? "fit" : zoom;
  const scale = effectiveZoom === "100" ? 1 / size.dpr : fitScale;
  const cw = natW * scale;
  const ch = natH * scale;
  // Déplacement borné : le contenu plus grand que la zone ne laisse pas de vide.
  const maxPanX = Math.max(0, (cw - availW) / 2);
  const maxPanY = Math.max(0, (ch - availH) / 2);
  const px = effectiveZoom === "100" ? Math.max(-maxPanX, Math.min(maxPanX, pan.x)) : 0;
  const py = effectiveZoom === "100" ? Math.max(-maxPanY, Math.min(maxPanY, pan.y)) : 0;
  const rect = { x: (size.w - cw) / 2 + px, y: topInset + (size.h - topInset - bottomInset - ch) / 2 + py, w: cw, h: ch };

  useEffect(() => {
    if (zoom === "fit") setPan({ x: 0, y: 0 });
  }, [zoom]);

  const draw = useCallback(() => {
    const r = rendererRef.current;
    const canvas = canvasRef.current;
    if (!r || !canvas || !geometry || !source || size.w === 0) return;
    const W = Math.round(size.w * size.dpr);
    const H = Math.round(size.h * size.dpr);
    if (canvas.width !== W || canvas.height !== H) {
      canvas.width = W;
      canvas.height = H;
    }
    if (uploaded.current !== source) {
      r.setSource(source.bitmap);
      uploaded.current = source;
    }
    r.render({
      params,
      geometry,
      mode: cropMode ? "frame" : "output",
      view: { x: rect.x * size.dpr, y: rect.y * size.dpr, w: rect.w * size.dpr, h: rect.h * size.dpr },
      bypass,
    });
  }, [geometry, source, size, params, cropMode, bypass, rect.x, rect.y, rect.w, rect.h]);

  // Un rendu par image d'affichage au plus (fluide pendant le glissement des curseurs).
  useEffect(() => {
    cancelAnimationFrame(raf.current);
    raf.current = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(raf.current);
  }, [draw]);

  const ready = Boolean(source && geometry && size.w > 0);
  const canPan = effectiveZoom === "100" && (maxPanX > 0 || maxPanY > 0);

  return (
    <div
      ref={wrapRef}
      className={cx("relative h-full w-full overflow-hidden", canPan && "cursor-grab active:cursor-grabbing", className)}
      onPointerDown={(e) => {
        if (!canPan || e.button !== 0) return;
        panDrag.current = { x: e.clientX, y: e.clientY, px, py, id: e.pointerId };
        (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
      }}
      onPointerMove={(e) => {
        const d = panDrag.current;
        if (!d || d.id !== e.pointerId) return;
        setPan({ x: d.px + e.clientX - d.x, y: d.py + e.clientY - d.y });
      }}
      onPointerUp={() => {
        panDrag.current = null;
      }}
      onPointerCancel={() => {
        panDrag.current = null;
      }}
      onDoubleClick={(e) => {
        if (cropMode || !ready) return;
        if (zoom === "fit") {
          // Zoom 100 % centré sur le point double-cliqué.
          const box = wrapRef.current!.getBoundingClientRect();
          const mx = e.clientX - box.left;
          const my = e.clientY - box.top;
          const fx = Math.min(1, Math.max(0, (mx - rect.x) / rect.w));
          const fy = Math.min(1, Math.max(0, (my - rect.y) / rect.h));
          const nw = natW / size.dpr;
          const nh = natH / size.dpr;
          setPan({ x: mx - fx * nw - (size.w - nw) / 2, y: my - fy * nh - topInset - (size.h - topInset - bottomInset - nh) / 2 });
          onZoomChange("100");
        } else onZoomChange("fit");
      }}
    >
      {/* Damier sous l'image : visible pendant le chargement et autour du cadre. */}
      {geometry ? <div className={cx("absolute", ready ? "checker" : "skeleton rounded-none")} style={{ left: rect.x, top: rect.y, width: rect.w, height: rect.h }} aria-hidden /> : null}
      <canvas
        ref={canvasRef}
        data-testid="retouch-canvas"
        data-view={`${rect.x},${rect.y},${rect.w},${rect.h}`}
        aria-label={bypass ? "Aperçu de la photo d'origine" : "Aperçu de la photo retouchée"}
        role="img"
        className="absolute inset-0 h-full w-full"
        style={{ width: size.w || "100%", height: size.h || "100%", boxShadow: "none" }}
      />
      {ready && !cropMode ? <div className="pointer-events-none absolute shadow-[0_3px_8px_rgba(36,29,23,.10),0_24px_50px_-22px_rgba(36,29,23,.45)]" style={{ left: rect.x, top: rect.y, width: rect.w, height: rect.h }} aria-hidden /> : null}
      {cropMode && geometry && ready ? (
        <CropOverlay frame={rect} crop={geometry.crop} ratio={ratio} frameW={geometry.frameWidth} frameH={geometry.frameHeight} onChange={onCropChange} />
      ) : null}
    </div>
  );
}
