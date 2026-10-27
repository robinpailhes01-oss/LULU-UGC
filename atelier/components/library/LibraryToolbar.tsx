"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useElementWidth } from "@/components/library/use-virtual";
import { createPortal } from "react-dom";
import { ArrowDownWideNarrow, Check, ChevronDown, Info, LayoutGrid, List, Search, Sparkles, Tags, X } from "lucide-react";
import { Button, IconButton } from "@/components/ui/Button";
import { cx } from "@/components/ui/cx";
import { useMenu } from "@/components/ui/Menu";
import type { AssetKind, AssetSort } from "@/lib/shared/types";

export const SORT_LABEL: Record<AssetSort, string> = {
  recent: "Plus récents",
  oldest: "Plus anciens",
  name: "Nom",
  taken: "Date de prise de vue",
  size: "Taille",
};

export interface Filters {
  kind: AssetKind | "all";
  tags: string[];
  untagged: boolean;
}

export const NO_FILTERS: Filters = { kind: "all", tags: [], untagged: false };

const KINDS: { value: Filters["kind"]; label: string }[] = [
  { value: "all", label: "Tout" },
  { value: "photo", label: "Photos" },
  { value: "video", label: "Vidéos" },
  { value: "audio", label: "Audio" },
];

interface Props {
  filters: Filters;
  onFilters: (f: Filters) => void;
  sort: AssetSort;
  onSort: ((s: AssetSort) => void) | null;
  view: "grid" | "list";
  onView: (v: "grid" | "list") => void;
  infoOpen: boolean;
  onToggleInfo: () => void;
  tags: { tag: string; count: number }[];
  showUntagged: boolean;
  onAskAgent: (() => void) | null;
}

/** Barre d'outils : type, mots-clés, non triés, tri, grille/liste, panneau Infos, tri par l'agent. */
export function LibraryToolbar({ filters, onFilters, sort, onSort, view, onView, infoOpen, onToggleInfo, tags, showUntagged, onAskAgent }: Props) {
  const menu = useMenu();
  // Largeur réelle disponible (la colonne rétrécit quand le panneau Infos ou l'agent sont ouverts).
  const root = useRef<HTMLDivElement>(null);
  const width = useElementWidth(root);
  const roomy = width === 0 || width >= 980;
  const showSortLabel = width === 0 || width >= 820;
  return (
    <div ref={root} className="flex items-center gap-2">
      <div className="-mx-1 flex min-w-0 flex-1 items-center gap-1.5 overflow-x-auto px-1 py-1 [scrollbar-width:none]">
        <div role="radiogroup" aria-label="Type de média" className="flex shrink-0 gap-1">
          {KINDS.map((k) => (
            <button
              key={k.value}
              type="button"
              role="radio"
              aria-checked={filters.kind === k.value}
              onClick={() => onFilters({ ...filters, kind: k.value })}
              className={cx(
                "h-8 shrink-0 rounded-full px-3 text-[12.5px] font-semibold transition-colors",
                filters.kind === k.value ? "bg-ink text-surface" : "border border-line bg-surface text-ink hover:bg-hover",
              )}
            >
              {k.label}
            </button>
          ))}
        </div>
        <span className="mx-1 h-5 w-px shrink-0 bg-ink/10" aria-hidden />
        <TagFilter tags={tags} value={filters.tags} onChange={(t) => onFilters({ ...filters, tags: t })} />
        {showUntagged ? (
          <button
            type="button"
            aria-pressed={filters.untagged}
            onClick={() => onFilters({ ...filters, untagged: !filters.untagged })}
            className={cx(
              "inline-flex h-8 shrink-0 items-center gap-1.5 rounded-full px-3 text-[12.5px] font-semibold transition-colors",
              filters.untagged ? "bg-honey-soft text-[#7a5220] ring-1 ring-honey/60" : "border border-line bg-surface text-ink hover:bg-hover",
            )}
          >
            {filters.untagged ? <Check className="h-3.5 w-3.5" aria-hidden /> : null}
            Non triés
          </button>
        ) : null}
        {filters.kind !== "all" || filters.tags.length || filters.untagged ? (
          <button type="button" onClick={() => onFilters(NO_FILTERS)} className="inline-flex h-8 shrink-0 items-center gap-1 rounded-full px-2.5 text-[12.5px] font-semibold text-muted hover:bg-hover hover:text-ink">
            <X className="h-3.5 w-3.5" aria-hidden /> Effacer
          </button>
        ) : null}
      </div>
      <div className="flex shrink-0 items-center gap-1">
        {onAskAgent ? (
          roomy ? (
            <Button variant="secondary" size="sm" icon={<Sparkles className="h-4 w-4 text-chestnut" />} onClick={onAskAgent}>
              Trier avec l'agent
            </Button>
          ) : (
            <IconButton label="Trier avec l'agent" onClick={onAskAgent} size="sm" className="h-8 w-8 border border-line bg-surface">
              <Sparkles className="h-4 w-4 text-chestnut" />
            </IconButton>
          )
        ) : null}
        {onSort ? (
          <button
            type="button"
            onClick={(e) =>
              menu.openBelow(
                e.currentTarget,
                (Object.keys(SORT_LABEL) as AssetSort[]).map((s) => ({ label: SORT_LABEL[s], icon: s === sort ? <Check /> : undefined, onSelect: () => onSort(s) })),
                "right",
              )
            }
            aria-label={`Trier : ${SORT_LABEL[sort]}`}
            title={`Trier : ${SORT_LABEL[sort]}`}
            className="inline-flex h-8 items-center gap-1.5 rounded-full px-2.5 text-[12.5px] font-semibold text-ink hover:bg-hover"
          >
            <ArrowDownWideNarrow className="h-4 w-4 text-muted" aria-hidden />
            {showSortLabel ? <span>{SORT_LABEL[sort]}</span> : null}
          </button>
        ) : null}
        <div className="flex rounded-full border border-line bg-surface p-0.5" role="radiogroup" aria-label="Affichage">
          <button
            type="button"
            role="radio"
            aria-checked={view === "grid"}
            aria-label="Grille"
            title="Grille"
            onClick={() => onView("grid")}
            className={cx("flex h-7 w-8 items-center justify-center rounded-full", view === "grid" ? "bg-select text-chestnut" : "text-muted hover:text-ink")}
          >
            <LayoutGrid className="h-4 w-4" />
          </button>
          <button
            type="button"
            role="radio"
            aria-checked={view === "list"}
            aria-label="Liste"
            title="Liste"
            onClick={() => onView("list")}
            className={cx("flex h-7 w-8 items-center justify-center rounded-full", view === "list" ? "bg-select text-chestnut" : "text-muted hover:text-ink")}
          >
            <List className="h-4 w-4" />
          </button>
        </div>
        <IconButton label={infoOpen ? "Masquer les infos (I)" : "Afficher les infos (I)"} active={infoOpen} aria-pressed={infoOpen} onClick={onToggleInfo} size="sm" className="h-8 w-8">
          <Info className="h-4 w-4" />
        </IconButton>
      </div>
    </div>
  );
}

/** Liste déroulante « Mots-clés » à choix multiples, avec recherche. */
function TagFilter({ tags, value, onChange }: { tags: { tag: string; count: number }[]; value: string[]; onChange: (t: string[]) => void }) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const btn = useRef<HTMLButtonElement>(null);
  const panel = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState({ left: 0, top: 0 });

  useEffect(() => {
    if (!open) return;
    const r = btn.current?.getBoundingClientRect();
    if (r) setPos({ left: Math.max(8, Math.min(r.left, window.innerWidth - 288)), top: r.bottom + 6 });
    const onDown = (e: MouseEvent) => {
      if (!panel.current?.contains(e.target as Node) && !btn.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.stopPropagation();
        setOpen(false);
        btn.current?.focus();
      }
    };
    const onScroll = (e: Event) => {
      if (!panel.current?.contains(e.target as Node)) setOpen(false);
    };
    window.addEventListener("mousedown", onDown);
    window.addEventListener("keydown", onKey, true);
    window.addEventListener("scroll", onScroll, true);
    return () => {
      window.removeEventListener("mousedown", onDown);
      window.removeEventListener("keydown", onKey, true);
      window.removeEventListener("scroll", onScroll, true);
    };
  }, [open]);

  const list = useMemo(() => {
    const s = q.trim().toLowerCase();
    const selectedFirst = [...tags].sort((a, b) => Number(value.includes(b.tag)) - Number(value.includes(a.tag)));
    return (s ? selectedFirst.filter((t) => t.tag.includes(s)) : selectedFirst).slice(0, 80);
  }, [tags, q, value]);

  return (
    <>
      <button
        ref={btn}
        type="button"
        aria-haspopup="dialog"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
        className={cx(
          "inline-flex h-8 shrink-0 items-center gap-1.5 rounded-full px-3 text-[12.5px] font-semibold transition-colors",
          value.length ? "bg-select text-chestnut ring-1 ring-chestnut/40" : "border border-line bg-surface text-ink hover:bg-hover",
        )}
      >
        <Tags className="h-3.5 w-3.5" aria-hidden />
        {value.length === 0 ? "Mots-clés" : value.length === 1 ? value[0] : `${value.length} mots-clés`}
        <ChevronDown className="h-3.5 w-3.5 opacity-70" aria-hidden />
      </button>
      {open
        ? createPortal(
            <div ref={panel} role="dialog" aria-label="Filtrer par mots-clés" className="fixed z-menu w-[280px] animate-fade-in rounded-xl border border-line bg-surface p-2 shadow-pop" style={{ left: pos.left, top: pos.top }}>
              <div className="relative mb-1.5">
                <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-faint" aria-hidden />
                <input
                  autoFocus
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  placeholder="Chercher un mot-clé"
                  aria-label="Chercher un mot-clé"
                  className="h-8 w-full rounded-lg bg-sunken pl-8 pr-2 text-[13px] placeholder:text-faint focus:outline-none focus:ring-2 focus:ring-chestnut/25"
                />
              </div>
              {tags.length === 0 ? (
                <p className="px-2 py-4 text-center text-[12.5px] text-muted">Aucun mot-clé pour l'instant. Ajoutez-en depuis le panneau Infos ou laissez l'IA s'en charger.</p>
              ) : (
                <ul className="max-h-[300px] overflow-y-auto" role="group" aria-label="Mots-clés">
                  {list.map((t) => {
                    const on = value.includes(t.tag);
                    return (
                      <li key={t.tag}>
                        <label className={cx("flex cursor-pointer items-center gap-2.5 rounded-lg px-2 py-1.5 text-[13px]", on ? "bg-select" : "hover:bg-hover")}>
                          <input
                            type="checkbox"
                            checked={on}
                            onChange={() => onChange(on ? value.filter((v) => v !== t.tag) : [...value, t.tag])}
                            className="h-4 w-4 rounded accent-[#8B5E34]"
                          />
                          <span className="flex-1 truncate">{t.tag}</span>
                          <span className="text-2xs tabular-nums text-faint">{t.count}</span>
                        </label>
                      </li>
                    );
                  })}
                  {list.length === 0 ? <li className="px-2 py-3 text-center text-[12.5px] text-muted">Aucun mot-clé ne correspond.</li> : null}
                </ul>
              )}
              {value.length > 0 ? (
                <div className="mt-1.5 flex items-center justify-between border-t border-line px-1 pt-1.5 text-[12px]">
                  <span className="text-muted">Médias portant {value.length > 1 ? "tous ces mots-clés" : "ce mot-clé"}</span>
                  <button type="button" onClick={() => onChange([])} className="font-semibold text-chestnut hover:underline">
                    Effacer
                  </button>
                </div>
              ) : null}
            </div>,
            document.body,
          )
        : null}
    </>
  );
}
