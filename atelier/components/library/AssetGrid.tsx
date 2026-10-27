"use client";

import { forwardRef, useImperativeHandle, useMemo, useRef } from "react";
import { AssetCard, CARD_LABEL_HEIGHT, type CardHandlers } from "@/components/library/AssetCard";
import { useElementWidth, useEnsureRowVisible, useVisibleRows } from "@/components/library/use-virtual";
import type { Asset } from "@/lib/shared/types";

export interface GridHandle {
  /** Nombre de colonnes (navigation ↑/↓ au clavier). */
  columns: () => number;
  ensureVisible: (index: number) => void;
}

interface GridProps {
  items: Asset[];
  selected: ReadonlySet<string>;
  activeIndex: number;
  draggable: boolean;
  handlers: CardHandlers;
  label: string;
}

/** Grille virtualisée : seules les rangées proches de l'écran sont rendues (fluide avec 2 000 médias). */
export const AssetGrid = forwardRef<GridHandle, GridProps>(function AssetGrid({ items, selected, activeIndex, draggable, handlers, label }, ref) {
  const el = useRef<HTMLDivElement>(null);
  const width = useElementWidth(el);
  const narrow = width > 0 && width < 520;
  const gap = narrow ? 8 : 12;
  const minCard = narrow ? 150 : 176;
  const cols = width > 0 ? Math.max(2, Math.floor((width + gap) / (minCard + gap))) : 4;
  const cardW = width > 0 ? (width - gap * (cols - 1)) / cols : 180;
  const cardH = Math.round(cardW + CARD_LABEL_HEIGHT);
  const stride = cardH + gap;
  const rows = Math.ceil(items.length / cols);
  const { start, end } = useVisibleRows(el, rows, stride);
  const ensureRow = useEnsureRowVisible(el, stride, cardH);

  useImperativeHandle(ref, () => ({ columns: () => cols, ensureVisible: (index: number) => ensureRow(Math.floor(index / cols)) }), [cols, ensureRow]);

  const visible = useMemo(() => items.slice(start * cols, end * cols), [items, start, end, cols]);
  const selecting = selected.size > 0;
  // Une carte reste toujours atteignable à la touche Tab, même si l'active est hors de l'écran.
  const tabTarget = activeIndex >= start * cols && activeIndex < Math.min(items.length, end * cols) ? activeIndex : start * cols;

  return (
    <div ref={el} role="listbox" aria-multiselectable="true" aria-label={label} className="relative w-full" style={{ height: rows > 0 ? rows * stride - gap : 0 }}>
      <div
        className="absolute inset-x-0 top-0 grid"
        style={{ transform: `translateY(${start * stride}px)`, gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))`, columnGap: gap, rowGap: gap }}
      >
        {visible.map((a, i) => {
          const index = start * cols + i;
          return <AssetCard key={a.id} asset={a} index={index} selected={selected.has(a.id)} selecting={selecting} active={index === tabTarget} height={cardH} draggable={draggable} handlers={handlers} />;
        })}
      </div>
    </div>
  );
});
