"use client";

import { useCallback, useEffect, useLayoutEffect, useState } from "react";

/** Hauteur de la barre d'outils collante au-dessus de la grille (pour garder l'élément actif visible). */
export const STICKY_OFFSET = 64;

const useIsoLayoutEffect = typeof window === "undefined" ? useEffect : useLayoutEffect;

export function getScrollParent(el: HTMLElement | null): HTMLElement | null {
  let cur = el?.parentElement ?? null;
  while (cur) {
    const oy = getComputedStyle(cur).overflowY;
    if (oy === "auto" || oy === "scroll") return cur;
    cur = cur.parentElement;
  }
  return (document.scrollingElement as HTMLElement | null) ?? document.documentElement;
}

/** Largeur d'un élément, suivie avec ResizeObserver. */
export function useElementWidth(ref: React.RefObject<HTMLElement | null>): number {
  const [width, setWidth] = useState(0);
  useIsoLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    setWidth(el.clientWidth);
    const ro = new ResizeObserver((entries) => {
      const w = entries[0]?.contentRect.width ?? el.clientWidth;
      setWidth((prev) => (Math.abs(prev - w) < 0.5 ? prev : w));
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, [ref]);
  return width;
}

/**
 * Rangées visibles d'une liste virtualisée placée dans le conteneur défilant de la page
 * (<main>), avec une marge de préchargement au-dessus et au-dessous.
 */
export function useVisibleRows(ref: React.RefObject<HTMLElement | null>, rowCount: number, rowStride: number, overscanPx = 800) {
  const [range, setRange] = useState({ start: 0, end: Math.min(rowCount, 12) });
  useIsoLayoutEffect(() => {
    const el = ref.current;
    if (!el || rowStride <= 0) return;
    const scroller = getScrollParent(el);
    if (!scroller) return;
    let raf = 0;
    const update = () => {
      raf = 0;
      const top = el.getBoundingClientRect().top - (scroller === document.scrollingElement ? 0 : scroller.getBoundingClientRect().top);
      const viewH = scroller === document.scrollingElement ? window.innerHeight : scroller.clientHeight;
      const start = Math.max(0, Math.min(rowCount, Math.floor((-top - overscanPx) / rowStride)));
      const end = Math.max(start, Math.min(rowCount, Math.ceil((-top + viewH + overscanPx) / rowStride)));
      setRange((r) => (r.start === start && r.end === end ? r : { start, end }));
    };
    const schedule = () => {
      if (!raf) raf = requestAnimationFrame(update);
    };
    update();
    const target: EventTarget = scroller === document.scrollingElement ? window : scroller;
    target.addEventListener("scroll", schedule, { passive: true });
    window.addEventListener("resize", schedule);
    const ro = new ResizeObserver(schedule);
    ro.observe(scroller);
    return () => {
      if (raf) cancelAnimationFrame(raf);
      target.removeEventListener("scroll", schedule);
      window.removeEventListener("resize", schedule);
      ro.disconnect();
    };
  }, [ref, rowCount, rowStride, overscanPx]);
  return range;
}

/** Fait défiler le conteneur pour que la rangée `row` soit visible (sous la barre collante). */
export function useEnsureRowVisible(ref: React.RefObject<HTMLElement | null>, rowStride: number, rowHeight: number) {
  return useCallback(
    (row: number) => {
      const el = ref.current;
      if (!el) return;
      const scroller = getScrollParent(el);
      if (!scroller) return;
      const isDoc = scroller === document.scrollingElement;
      const scrollerTop = isDoc ? 0 : scroller.getBoundingClientRect().top;
      const viewH = isDoc ? window.innerHeight : scroller.clientHeight;
      const gridTop = el.getBoundingClientRect().top - scrollerTop + scroller.scrollTop;
      const rowTop = gridTop + row * rowStride;
      const rowBottom = rowTop + rowHeight;
      if (rowTop < scroller.scrollTop + STICKY_OFFSET) scroller.scrollTop = rowTop - STICKY_OFFSET - 8;
      else if (rowBottom > scroller.scrollTop + viewH) scroller.scrollTop = rowBottom - viewH + 16;
    },
    [ref, rowStride, rowHeight],
  );
}
