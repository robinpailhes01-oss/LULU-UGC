"use client";

import { forwardRef, memo, useImperativeHandle, useRef } from "react";
import { Check, Star } from "lucide-react";
import { AssetThumb } from "@/components/library/AssetThumb";
import { kindLabel, type CardHandlers } from "@/components/library/AssetCard";
import { useElementWidth, useEnsureRowVisible, useVisibleRows } from "@/components/library/use-virtual";
import type { GridHandle } from "@/components/library/AssetGrid";
import { cx } from "@/components/ui/cx";
import { dimensions, formatBytes, formatDate, formatDuration } from "@/lib/shared/format";
import type { Asset } from "@/lib/shared/types";

const ROW = 52;

/** Colonnes affichées selon la largeur réellement disponible (et non celle de l'écran). */
interface Cols {
  type: boolean;
  dims: boolean;
  date: boolean;
  tags: boolean;
  by: boolean;
}

interface ListProps {
  items: Asset[];
  selected: ReadonlySet<string>;
  activeIndex: number;
  draggable: boolean;
  handlers: CardHandlers;
  label: string;
}

/** Vue liste (tableau) virtualisée : Nom, Type, Dimensions/Durée, Taille, Prise de vue, Mots-clés, Ajouté par. */
export const AssetList = forwardRef<GridHandle, ListProps>(function AssetList({ items, selected, activeIndex, draggable, handlers, label }, ref) {
  const body = useRef<HTMLTableSectionElement>(null);
  const wrap = useRef<HTMLDivElement>(null);
  const w = useElementWidth(wrap);
  const cols: Cols = { date: w === 0 || w >= 520, type: w === 0 || w >= 660, dims: w === 0 || w >= 790, by: w === 0 || w >= 910, tags: w === 0 || w >= 1060 };
  const { start, end } = useVisibleRows(body, items.length, ROW, 900);
  const ensureRow = useEnsureRowVisible(body, ROW, ROW);
  useImperativeHandle(ref, () => ({ columns: () => 1, ensureVisible: (i: number) => ensureRow(i) }), [ensureRow]);
  const selecting = selected.size > 0;
  const tabTarget = activeIndex >= start && activeIndex < end ? activeIndex : start;

  return (
    <div ref={wrap} className="overflow-hidden rounded-card border border-line bg-surface">
      <table role="grid" aria-multiselectable="true" aria-label={label} aria-rowcount={items.length + 1} className="w-full table-fixed border-collapse text-left text-[13px]">
        <thead className="whitespace-nowrap text-2xs font-semibold uppercase tracking-[0.1em] text-muted">
          <tr className="border-b border-line">
            <th scope="col" className="py-2.5 pl-3 pr-2 font-semibold">Nom</th>
            {cols.type ? <th scope="col" className="w-[120px] px-2 font-semibold">Type</th> : null}
            {cols.dims ? <th scope="col" className="w-[130px] px-2 font-semibold">Dimensions / durée</th> : null}
            <th scope="col" className="w-[84px] px-2 font-semibold">Taille</th>
            {cols.date ? <th scope="col" className="w-[112px] px-2 font-semibold">Prise de vue</th> : null}
            {cols.tags ? <th scope="col" className="w-[190px] px-2 font-semibold">Mots-clés</th> : null}
            {cols.by ? <th scope="col" className="w-[110px] px-2 pr-3 font-semibold">Ajouté par</th> : null}
          </tr>
        </thead>
        <tbody ref={body}>
          {start > 0 ? <tr aria-hidden style={{ height: start * ROW }} /> : null}
          {items.slice(start, end).map((a, i) => {
            const index = start + i;
            return <ListRow key={a.id} asset={a} index={index} selected={selected.has(a.id)} selecting={selecting} active={index === tabTarget} draggable={draggable} handlers={handlers} cols={cols} />;
          })}
          {end < items.length ? <tr aria-hidden style={{ height: (items.length - end) * ROW }} /> : null}
        </tbody>
      </table>
    </div>
  );
});

const ListRow = memo(function ListRow({
  asset,
  index,
  selected,
  selecting,
  active,
  draggable,
  handlers,
  cols,
}: {
  cols: Cols;
  asset: Asset;
  index: number;
  selected: boolean;
  selecting: boolean;
  active: boolean;
  draggable: boolean;
  handlers: CardHandlers;
}) {
  const sub = asset.mime.split("/")[1]?.toUpperCase().replace("QUICKTIME", "MOV").replace("X-M4V", "M4V") ?? "";
  return (
    <tr
      ref={(el) => handlers.register(asset.id, el)}
      aria-selected={selected}
      aria-rowindex={index + 2}
      tabIndex={active ? 0 : -1}
      data-card={index}
      title={asset.ai?.title ?? undefined}
      draggable={draggable}
      onDragStart={(e) => handlers.dragStart(e, index)}
      onPointerDown={(e) => handlers.pointerDown(e, index)}
      onClick={(e) => handlers.click(e, index)}
      onDoubleClick={() => handlers.doubleClick(index)}
      onContextMenu={(e) => handlers.contextMenu(e, index)}
      onFocus={() => handlers.focus(index)}
      style={{ height: ROW }}
      className={cx(
        "group cursor-default select-none border-b border-line outline-none last:border-b-0 focus-visible:bg-hover focus-visible:shadow-[inset_3px_0_0_#8B5E34]",
        selected ? "bg-select" : "hover:bg-hover",
      )}
    >
      <td className="py-1.5 pl-2 pr-2">
        <div className="flex min-w-0 items-center gap-2.5">
          <button
            type="button"
            tabIndex={-1}
            role="checkbox"
            aria-checked={selected}
            aria-label={selected ? `Désélectionner ${asset.name}` : `Sélectionner ${asset.name}`}
            onPointerDown={(e) => e.stopPropagation()}
            onClick={(e) => {
              e.stopPropagation();
              handlers.toggleCheck(index, e.shiftKey);
            }}
            className={cx(
              "flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2",
              selected ? "border-chestnut bg-chestnut text-surface" : "border-line-strong text-transparent",
              selected || selecting ? "opacity-100" : "opacity-0 group-hover:opacity-100",
            )}
          >
            <Check className="h-3 w-3" strokeWidth={3} />
          </button>
          <span className="relative h-9 w-9 shrink-0 overflow-hidden rounded-md bg-sunken">
            <AssetThumb asset={asset} size="sm" />
          </span>
          <span className={cx("min-w-0 truncate", selected ? "font-semibold text-chestnut" : "font-medium text-ink")}>{asset.name}</span>
          <button
            type="button"
            tabIndex={-1}
            aria-pressed={asset.starred}
            aria-label={asset.starred ? `Retirer ${asset.name} des favoris` : `Ajouter ${asset.name} aux favoris`}
            onPointerDown={(e) => e.stopPropagation()}
            onClick={(e) => {
              e.stopPropagation();
              handlers.toggleStar(index);
            }}
            className={cx("ml-auto shrink-0 rounded-full p-1", asset.starred ? "text-honey" : "text-faint opacity-0 hover:text-ink group-hover:opacity-100")}
          >
            <Star className={cx("h-3.5 w-3.5", asset.starred && "fill-current")} />
          </button>
        </div>
      </td>
      {cols.type ? (
        <td className="truncate whitespace-nowrap px-2 text-muted">
          {kindLabel(asset)} <span className="text-faint">· {sub}</span>
        </td>
      ) : null}
      {cols.dims ? <td className="whitespace-nowrap px-2 tabular-nums text-muted">{asset.kind === "photo" ? dimensions(asset.width, asset.height) || "—" : formatDuration(asset.durationS) || "—"}</td> : null}
      <td className="whitespace-nowrap px-2 tabular-nums text-muted">{formatBytes(asset.sizeBytes)}</td>
      {cols.date ? <td className="whitespace-nowrap px-2 text-muted">{asset.takenAt ? formatDate(asset.takenAt) : "—"}</td> : null}
      {cols.tags ? (
      <td className="px-2">
        <div className="flex gap-1 overflow-hidden">
          {asset.tags.slice(0, 3).map((t) => (
            <span key={t} className="shrink-0 rounded-full bg-sunken px-2 py-0.5 text-2xs text-muted">
              {t}
            </span>
          ))}
          {asset.tags.length > 3 ? <span className="text-2xs text-faint">+{asset.tags.length - 3}</span> : null}
        </div>
      </td>
      ) : null}
      {cols.by ? <td className="truncate whitespace-nowrap px-2 pr-3 text-muted">{asset.createdBy ?? "—"}</td> : null}
    </tr>
  );
});
