"use client";

import { Check, Trash2 } from "lucide-react";
import { cx } from "@/components/ui/cx";
import { useMenu } from "@/components/ui/Menu";
import type { Look } from "@/lib/shared/types";

interface Props {
  looks: Look[] | undefined;
  error: string | null;
  onRetry: () => void;
  /** Vignettes (URL data:) par identifiant de look, plus « original ». */
  thumbs: Record<string, string>;
  selectedId: string | null;
  /** La case « Original » est cochée (aucun look et couleurs neutres). */
  originalSelected?: boolean;
  onSelect: (look: Look | null) => void;
  onDelete?: (look: Look) => void;
  /** « strip » : bande défilante sur mobile, grille sur grand écran ; « grid » : grille partout. */
  layout?: "strip" | "grid";
  /** Masque la case « Original ». */
  hideOriginal?: boolean;
}

/** Bande de looks : chaque look est montré sur LA photo en cours (même rendu que l'aperçu). */
export function LookStrip({ looks, error, onRetry, thumbs, selectedId, originalSelected, onSelect, onDelete, layout = "strip", hideOriginal }: Props) {
  const menu = useMenu();
  const container =
    layout === "grid"
      ? "grid grid-cols-[repeat(auto-fill,minmax(84px,1fr))] gap-x-2.5 gap-y-3 p-1"
      : "-mx-4 flex snap-x scroll-px-4 gap-2.5 overflow-x-auto px-4 pb-2 pt-1 lg:mx-0 lg:grid lg:grid-cols-4 lg:gap-x-2 lg:gap-y-2.5 lg:overflow-visible lg:px-0.5 lg:pb-1";
  const cell = layout === "grid" ? "w-full" : "w-[68px] shrink-0 snap-start lg:w-full";
  if (error) {
    return (
      <p className="rounded-lg bg-terracotta-soft px-3 py-2 text-[12.5px] text-terracotta">
        Les looks n&apos;ont pas pu être chargés.{" "}
        <button type="button" className="font-semibold underline" onClick={onRetry}>
          Réessayer
        </button>
      </p>
    );
  }
  if (!looks) {
    return (
      <div className={cx(container, "overflow-hidden")} aria-busy="true" aria-label="Chargement des looks">
        {Array.from({ length: 8 }, (_, i) => (
          <div key={i} className={cell}>
            <div className="skeleton aspect-square w-full rounded-xl" />
            <div className="skeleton mt-1.5 h-2.5 w-3/4" />
          </div>
        ))}
      </div>
    );
  }
  const items: (Look | null)[] = hideOriginal ? looks : [null, ...looks];
  return (
    <div role="radiogroup" aria-label="Looks" className={container}>
      {items.map((look) => {
        const id = look?.id ?? "original";
        const on = look ? look.id === selectedId : Boolean(originalSelected);
        const thumb = thumbs[id];
        const deletable = Boolean(look && !look.builtin && onDelete);
        return (
          <div key={id} className={cx("group relative", cell)}>
            <button
              type="button"
              role="radio"
              aria-checked={on}
              onClick={() => onSelect(look)}
              onKeyDown={(e) => {
                if (deletable && (e.key === "Delete" || e.key === "Backspace")) {
                  e.preventDefault();
                  onDelete!(look!);
                }
              }}
              onContextMenu={(e) => {
                if (!deletable) return;
                menu.openAt(e, [{ label: "Supprimer le look", icon: <Trash2 />, danger: true, onSelect: () => onDelete!(look!) }]);
              }}
              title={look ? look.name : "Sans look"}
              className="block w-full rounded-xl text-left outline-none focus-visible:ring-2 focus-visible:ring-chestnut focus-visible:ring-offset-2 focus-visible:ring-offset-surface"
            >
              <span className={cx("relative block aspect-square w-full overflow-hidden rounded-xl bg-sunken transition-shadow duration-fast", on ? "ring-2 ring-chestnut ring-offset-2 ring-offset-surface" : "group-hover:shadow-card")}>
                {thumb ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={thumb} alt="" className="h-full w-full object-cover" draggable={false} />
                ) : (
                  <span className="skeleton block h-full w-full rounded-none" />
                )}
                {on ? (
                  <span className="absolute bottom-1 right-1 flex h-4 w-4 items-center justify-center rounded-full bg-chestnut text-surface">
                    <Check className="h-2.5 w-2.5" strokeWidth={3} aria-hidden />
                  </span>
                ) : null}
              </span>
              <span className={cx("mt-1.5 block text-[11.5px] leading-tight", on ? "font-semibold text-ink" : "text-muted")}>{look ? look.name : "Original"}</span>
            </button>
            {deletable ? (
              <button
                type="button"
                aria-label={`Supprimer le look ${look!.name}`}
                title="Supprimer le look"
                onClick={() => onDelete!(look!)}
                className="absolute right-0.5 top-1.5 flex h-6 w-6 items-center justify-center rounded-full bg-night/60 text-surface opacity-0 backdrop-blur transition-opacity hover:bg-terracotta focus-visible:opacity-100 group-hover:opacity-100 [@media(hover:none)]:opacity-100"
              >
                <Trash2 className="h-3 w-3" aria-hidden />
              </button>
            ) : null}
          </div>
        );
      })}
    </div>
  );
}
