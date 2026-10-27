"use client";

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight, Download, Info, RotateCcw, Star, Trash2, WandSparkles, X } from "lucide-react";
import { AssetPlaceholder } from "@/components/library/AssetThumb";
import { DetailsPanel } from "@/components/library/DetailsPanel";
import type { LibraryActions } from "@/components/library/use-library-actions";
import { cx } from "@/components/ui/cx";
import { Dialog } from "@/components/ui/Dialog";
import type { Asset } from "@/lib/shared/types";

interface Props {
  assets: Asset[];
  currentId: string | null;
  onNavigate: (id: string) => void;
  onClose: () => void;
  actions: LibraryActions;
  trash: boolean;
  aiEnabled: boolean | null;
  tags: { tag: string; count: number }[];
  onEditTags: (asset: Asset) => void;
}

function isTypingTarget(t: EventTarget | null) {
  const el = t as HTMLElement | null;
  return Boolean(el && (el.tagName === "INPUT" || el.tagName === "TEXTAREA" || el.tagName === "SELECT" || el.isContentEditable));
}

/** Aperçu plein écran sur fond sombre : photo (clic = 100 %, glisser pour se déplacer), vidéo, son. */
export function PreviewDialog({ assets, currentId, onNavigate, onClose, actions, trash, aiEnabled, tags, onEditTags }: Props) {
  const index = currentId ? assets.findIndex((a) => a.id === currentId) : -1;
  const asset = index >= 0 ? assets[index] : null;
  const [info, setInfo] = useState(false);
  const prev = index > 0 ? assets[index - 1] : null;
  const next = index >= 0 && index < assets.length - 1 ? assets[index + 1] : null;

  const go = useCallback((a: Asset | null) => a && onNavigate(a.id), [onNavigate]);

  useEffect(() => {
    if (!asset) return;
    const onKey = (e: KeyboardEvent) => {
      if (isTypingTarget(e.target)) return;
      const tag = (e.target as HTMLElement | null)?.tagName;
      if (e.key === "ArrowLeft" && tag !== "VIDEO" && tag !== "AUDIO") {
        e.preventDefault();
        go(prev);
      } else if (e.key === "ArrowRight" && tag !== "VIDEO" && tag !== "AUDIO") {
        e.preventDefault();
        go(next);
      } else if (e.key.toLowerCase() === "i" && !e.metaKey && !e.ctrlKey) {
        setInfo((v) => !v);
      } else if ((e.key === "Delete" || e.key === "Backspace") && !trash) {
        e.preventDefault();
        void actions.trash([asset]);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [asset, prev, next, go, trash, actions]);

  // Précharge les voisins pour une navigation instantanée.
  useEffect(() => {
    for (const a of [prev, next]) {
      if (!a) continue;
      const src = a.kind === "photo" ? a.urls.original : a.urls.poster ?? a.urls.thumb;
      if (src) new Image().src = src;
    }
  }, [prev, next]);

  return (
    <Dialog open={Boolean(asset)} onClose={onClose} dark size="full" className="!m-0 !h-dvh !max-h-none !w-screen !max-w-none !rounded-none">
      {asset ? (
        <div className="flex h-full min-h-0 flex-col">
          <header className="flex h-14 shrink-0 items-center gap-2 border-b border-white/10 px-2 sm:px-3">
            <button type="button" onClick={onClose} aria-label="Fermer l'aperçu (Échap)" className="rounded-full p-2 text-white/70 hover:bg-white/10 hover:text-white">
              <X className="h-5 w-5" />
            </button>
            <div className="min-w-0 flex-1">
              <h2 className="truncate text-[14px] font-semibold text-white">{asset.name}</h2>
              <p className="text-2xs tabular-nums text-white/50" aria-live="polite">
                {index + 1} / {assets.length}
                {asset.ai?.title ? <span className="hidden sm:inline"> · {asset.ai.title}</span> : null}
              </p>
            </div>
            <div className="flex items-center gap-0.5">
              <DarkButton label="Télécharger" onClick={() => actions.download([asset])}>
                <Download />
              </DarkButton>
              {!trash && asset.kind === "photo" ? (
                <DarkButton label="Retoucher" onClick={() => actions.retouch(asset)} className="hidden sm:inline-flex">
                  <WandSparkles />
                </DarkButton>
              ) : null}
              {!trash ? (
                <DarkButton label={asset.starred ? "Retirer des favoris" : "Ajouter aux favoris"} onClick={() => void actions.star([asset], !asset.starred)} pressed={asset.starred}>
                  <Star className={asset.starred ? "fill-current text-honey" : undefined} />
                </DarkButton>
              ) : null}
              <DarkButton label="Infos (I)" onClick={() => setInfo((v) => !v)} pressed={info}>
                <Info />
              </DarkButton>
              {trash ? (
                <DarkButton label="Restaurer" onClick={() => void actions.restore([asset])}>
                  <RotateCcw />
                </DarkButton>
              ) : (
                <DarkButton label="Mettre à la corbeille" onClick={() => void actions.trash([asset])}>
                  <Trash2 />
                </DarkButton>
              )}
            </div>
          </header>
          <div className="flex min-h-0 flex-1">
            <div className="relative min-w-0 flex-1">
              <Stage key={asset.id} asset={asset} onSwipe={(dir) => go(dir < 0 ? next : prev)} onDownload={() => actions.download([asset])} />
              {prev ? (
                <NavArrow side="left" label="Média précédent (←)" onClick={() => go(prev)}>
                  <ChevronLeft className="h-6 w-6" />
                </NavArrow>
              ) : null}
              {next ? (
                <NavArrow side="right" label="Média suivant (→)" onClick={() => go(next)}>
                  <ChevronRight className="h-6 w-6" />
                </NavArrow>
              ) : null}
            </div>
            {info ? (
              <aside className="absolute inset-x-0 bottom-0 z-10 max-h-[70%] overflow-hidden rounded-t-2xl bg-surface text-ink md:static md:max-h-none md:w-[340px] md:shrink-0 md:rounded-none" aria-label="Infos du média">
                <DetailsPanel
                  asset={asset}
                  selection={[asset]}
                  aiEnabled={aiEnabled}
                  tags={tags}
                  actions={actions}
                  onClose={() => setInfo(false)}
                  onPreview={() => undefined}
                  onEditTags={() => onEditTags(asset)}
                  emptyHint=""
                  className="max-h-[70vh] md:max-h-none"
                />
              </aside>
            ) : null}
          </div>
        </div>
      ) : null}
    </Dialog>
  );
}

function DarkButton({ label, onClick, children, pressed, className }: { label: string; onClick: () => void; children: React.ReactNode; pressed?: boolean; className?: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      title={label}
      aria-pressed={pressed}
      className={cx("inline-flex h-9 w-9 items-center justify-center rounded-full text-white/75 hover:bg-white/10 hover:text-white [&>svg]:h-[18px] [&>svg]:w-[18px]", pressed && "bg-white/10 text-white", className)}
    >
      {children}
    </button>
  );
}

function NavArrow({ side, label, onClick, children }: { side: "left" | "right"; label: string; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      title={label}
      className={cx(
        "absolute top-1/2 hidden h-12 w-12 -translate-y-1/2 items-center justify-center rounded-full bg-black/35 text-white/85 backdrop-blur-sm transition-colors hover:bg-black/55 hover:text-white sm:flex",
        side === "left" ? "left-3" : "right-3",
      )}
    >
      {children}
    </button>
  );
}

function Stage({ asset, onSwipe, onDownload }: { asset: Asset; onSwipe: (dir: number) => void; onDownload: () => void }) {
  const swipe = useRef<{ x: number; y: number; t: number } | null>(null);
  const handlers = {
    onPointerDown: (e: React.PointerEvent) => {
      if (e.pointerType !== "mouse") swipe.current = { x: e.clientX, y: e.clientY, t: Date.now() };
    },
    onPointerUp: (e: React.PointerEvent) => {
      const s = swipe.current;
      swipe.current = null;
      if (!s) return;
      const dx = e.clientX - s.x;
      const dy = e.clientY - s.y;
      if (Math.abs(dx) > 60 && Math.abs(dy) < 60 && Date.now() - s.t < 700) onSwipe(dx);
    },
  };
  if (asset.kind === "photo") return <PhotoStage asset={asset} swipe={handlers} />;
  if (asset.kind === "video") return <VideoStage asset={asset} onDownload={onDownload} swipe={handlers} />;
  return (
    <div className="flex h-full flex-col items-center justify-center gap-6 p-6" {...handlers}>
      <div className="h-48 w-48 overflow-hidden rounded-2xl">
        <AssetPlaceholder asset={asset} size="lg" />
      </div>
      <audio key={asset.id} controls autoPlay src={asset.urls.original} className="w-[min(420px,90vw)]" />
    </div>
  );
}

type SwipeHandlers = { onPointerDown: (e: React.PointerEvent) => void; onPointerUp: (e: React.PointerEvent) => void };

function VideoStage({ asset, onDownload, swipe }: { asset: Asset; onDownload: () => void; swipe: SwipeHandlers }) {
  const [failed, setFailed] = useState(false);
  if (failed) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-4 p-6 text-center">
        <p className="max-w-sm text-[14px] text-white/75">Cette vidéo ne peut pas être lue dans ce navigateur (codec non pris en charge). Téléchargez-la pour la regarder.</p>
        <button type="button" onClick={onDownload} className="inline-flex h-10 items-center gap-2 rounded-full bg-surface px-4 text-[13.5px] font-semibold text-ink hover:bg-white">
          <Download className="h-4 w-4" /> Télécharger
        </button>
      </div>
    );
  }
  return (
    <div className="flex h-full items-center justify-center p-2 sm:p-6" {...swipe}>
      <video
        controls
        playsInline
        autoPlay
        src={asset.urls.original}
        poster={asset.urls.poster ?? undefined}
        onError={() => setFailed(true)}
        className="max-h-full max-w-full rounded-md bg-black"
      />
    </div>
  );
}

function PhotoStage({ asset, swipe }: { asset: Asset; swipe: SwipeHandlers }) {
  const [loaded, setLoaded] = useState(false);
  const [failed, setFailed] = useState(false);
  const [natural, setNatural] = useState<{ w: number; h: number } | null>(null);
  const [zoom, setZoom] = useState<{ px: number; py: number } | null>(null);
  const box = useRef<HTMLDivElement>(null);
  const scroller = useRef<HTMLDivElement>(null);
  const drag = useRef<{ x: number; y: number; sl: number; st: number; moved: boolean } | null>(null);
  const fitImg = useRef<HTMLImageElement>(null);

  // Le zoom n'a d'intérêt que si l'image est plus grande que l'écran.
  const [canZoom, setCanZoom] = useState(false);
  useEffect(() => {
    const check = () => {
      const b = box.current;
      if (!b || !natural) return setCanZoom(false);
      setCanZoom(natural.w > b.clientWidth * 1.05 || natural.h > b.clientHeight * 1.05);
    };
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, [natural]);

  useLayoutEffect(() => {
    const s = scroller.current;
    if (!zoom || !s || !natural) return;
    s.scrollLeft = zoom.px * natural.w - s.clientWidth / 2;
    s.scrollTop = zoom.py * natural.h - s.clientHeight / 2;
  }, [zoom, natural]);

  const thumb = asset.urls.thumb ?? asset.urls.poster;

  if (zoom && natural) {
    return (
      <div
        ref={scroller}
        className={cx("h-full w-full overflow-auto", drag.current?.moved ? "cursor-grabbing" : "cursor-zoom-out")}
        onPointerDown={(e) => {
          const s = scroller.current;
          if (!s) return;
          drag.current = { x: e.clientX, y: e.clientY, sl: s.scrollLeft, st: s.scrollTop, moved: false };
          (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
        }}
        onPointerMove={(e) => {
          const d = drag.current;
          const s = scroller.current;
          if (!d || !s) return;
          const dx = e.clientX - d.x;
          const dy = e.clientY - d.y;
          if (Math.abs(dx) + Math.abs(dy) > 4) d.moved = true;
          s.scrollLeft = d.sl - dx;
          s.scrollTop = d.st - dy;
        }}
        onPointerUp={() => {
          const d = drag.current;
          drag.current = null;
          if (d && !d.moved) setZoom(null);
        }}
      >
        <div className="flex min-h-full min-w-full items-center justify-center" style={{ width: natural.w, height: natural.h }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={asset.urls.original} alt={asset.ai?.alt ?? asset.name} draggable={false} style={{ width: natural.w, height: natural.h, maxWidth: "none" }} className="select-none" />
        </div>
      </div>
    );
  }

  return (
    <div ref={box} className="relative flex h-full w-full items-center justify-center overflow-hidden p-2 sm:p-6" {...swipe}>
      {thumb && !loaded ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={thumb} alt="" aria-hidden className="absolute inset-0 m-auto max-h-[calc(100%-48px)] max-w-[calc(100%-48px)] object-contain blur-[2px]" />
      ) : null}
      {!failed ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          ref={fitImg}
          src={asset.urls.original}
          alt={asset.ai?.alt ?? asset.name}
          draggable={false}
          decoding="async"
          onLoad={(e) => {
            const img = e.currentTarget;
            setNatural({ w: img.naturalWidth, h: img.naturalHeight });
            setLoaded(true);
          }}
          onError={() => setFailed(true)}
          onClick={(e) => {
            if (!canZoom) return;
            const r = e.currentTarget.getBoundingClientRect();
            setZoom({ px: (e.clientX - r.left) / r.width, py: (e.clientY - r.top) / r.height });
          }}
          className={cx("relative max-h-full max-w-full select-none object-contain transition-opacity duration-base", loaded ? "opacity-100" : "opacity-0", canZoom && "cursor-zoom-in")}
        />
      ) : thumb ? (
        <div className="flex max-h-full flex-col items-center gap-3">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={thumb} alt={asset.ai?.alt ?? asset.name} className="max-h-[70vh] max-w-full object-contain" />
          <p className="max-w-md text-center text-[12.5px] text-white/60">Aperçu réduit : ce format ne s'affiche pas en grand dans ce navigateur. Téléchargez l'original pour le voir en pleine résolution.</p>
        </div>
      ) : (
        <div className="h-56 w-56 overflow-hidden rounded-2xl">
          <AssetPlaceholder asset={asset} size="lg" />
        </div>
      )}
    </div>
  );
}
