"use client";

import { memo } from "react";
import { AlertTriangle, Check, Film, Image as ImageIcon, Music, Play, Star } from "lucide-react";
import { AssetThumb } from "@/components/library/AssetThumb";
import { cx } from "@/components/ui/cx";
import { formatDuration } from "@/lib/shared/format";
import type { Asset } from "@/lib/shared/types";

/** Gestionnaires partagés par toutes les cartes (objet stable : les cartes restent mémoïsées). */
export interface CardHandlers {
  pointerDown: (e: React.PointerEvent, index: number) => void;
  click: (e: React.MouseEvent, index: number) => void;
  doubleClick: (index: number) => void;
  contextMenu: (e: React.MouseEvent, index: number) => void;
  toggleCheck: (index: number, shift: boolean) => void;
  toggleStar: (index: number) => void;
  dragStart: (e: React.DragEvent, index: number) => void;
  focus: (index: number) => void;
  register: (id: string, el: HTMLElement | null) => void;
}

export function kindLabel(asset: Pick<Asset, "kind">) {
  return asset.kind === "video" ? "Vidéo" : asset.kind === "audio" ? "Son" : "Photo";
}

export function KindIcon({ kind, className }: { kind: Asset["kind"]; className?: string }) {
  const Icon = kind === "video" ? Film : kind === "audio" ? Music : ImageIcon;
  return <Icon className={className} aria-hidden />;
}

interface CardProps {
  asset: Asset;
  index: number;
  selected: boolean;
  /** Une sélection existe : les cases à cocher restent visibles. */
  selecting: boolean;
  /** Élément actif (navigation au clavier, tabindex = 0). */
  active: boolean;
  height: number;
  draggable: boolean;
  handlers: CardHandlers;
}

/** Carte de la grille : vignette carrée, nom, durée des vidéos, favori, case de sélection. */
export const AssetCard = memo(function AssetCard({ asset, index, selected, selecting, active, height, draggable, handlers }: CardProps) {
  const label = `${asset.name}, ${kindLabel(asset).toLowerCase()}${asset.kind !== "photo" && asset.durationS ? `, ${formatDuration(asset.durationS)}` : ""}${asset.starred ? ", favori" : ""}`;
  return (
    <div
      ref={(el) => handlers.register(asset.id, el)}
      role="option"
      aria-selected={selected}
      aria-label={label}
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
      style={{ height }}
      className={cx(
        "group relative flex cursor-default select-none flex-col rounded-[13px] p-1.5 outline-none transition-colors duration-fast [-webkit-touch-callout:none] focus-visible:ring-2 focus-visible:ring-chestnut focus-visible:ring-offset-2 focus-visible:ring-offset-canvas",
        selected ? "bg-select ring-2 ring-chestnut" : "hover:bg-hover",
      )}
    >
      <div className="relative min-h-0 flex-1 overflow-hidden rounded-[9px] bg-sunken">
        <AssetThumb asset={asset} />
        {asset.kind === "video" ? (
          <>
            {asset.urls.poster || asset.urls.thumb ? (
              <span className="pointer-events-none absolute inset-0 flex items-center justify-center" aria-hidden>
                <span className="flex h-9 w-9 items-center justify-center rounded-full bg-night/45 text-surface backdrop-blur-[2px] transition-transform duration-base group-hover:scale-110">
                  <Play className="ml-0.5 h-4 w-4 fill-current" />
                </span>
              </span>
            ) : null}
            {asset.durationS ? (
              <span className="pointer-events-none absolute bottom-1.5 right-1.5 rounded-md bg-night/70 px-1.5 py-0.5 text-2xs font-semibold tabular-nums text-surface">
                {formatDuration(asset.durationS)}
              </span>
            ) : null}
          </>
        ) : null}
        {asset.status === "error" ? (
          <span className="absolute bottom-1.5 left-1.5 inline-flex items-center gap-1 rounded-md bg-terracotta px-1.5 py-0.5 text-2xs font-semibold text-surface">
            <AlertTriangle className="h-3 w-3" aria-hidden /> Erreur
          </span>
        ) : null}
        {/* Case de sélection (survol, ou dès qu'une sélection existe) */}
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
          onDoubleClick={(e) => e.stopPropagation()}
          className={cx(
            "absolute left-1.5 top-1.5 flex h-6 w-6 items-center justify-center rounded-full border-2 transition-opacity duration-fast",
            selected ? "border-chestnut bg-chestnut text-surface opacity-100" : "border-surface bg-night/25 text-transparent hover:bg-night/40",
            selected || selecting ? "opacity-100" : "opacity-0 group-hover:opacity-100 group-focus-visible:opacity-100 [@media(hover:none)]:opacity-0",
          )}
        >
          <Check className="h-3.5 w-3.5" strokeWidth={3} />
        </button>
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
          onDoubleClick={(e) => e.stopPropagation()}
          className={cx(
            "absolute right-1.5 top-1.5 flex h-7 w-7 items-center justify-center rounded-full transition-opacity duration-fast",
            asset.starred
              ? "text-honey opacity-100 drop-shadow-[0_1px_2px_rgba(23,17,13,.45)]"
              : "bg-night/25 text-surface opacity-0 hover:bg-night/40 group-hover:opacity-100 [@media(hover:none)]:hidden",
          )}
        >
          <Star className={cx("h-4 w-4", asset.starred && "fill-current")} />
        </button>
      </div>
      <div className="flex h-[30px] shrink-0 items-center gap-1.5 px-1 pt-1">
        <KindIcon kind={asset.kind} className={cx("h-3.5 w-3.5 shrink-0", selected ? "text-chestnut" : "text-faint")} />
        <span className={cx("truncate text-[12.5px]", selected ? "font-semibold text-chestnut" : "font-medium text-ink")}>{asset.name}</span>
      </div>
    </div>
  );
});

export const CARD_LABEL_HEIGHT = 30;
export const CARD_PADDING = 6;
