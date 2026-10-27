"use client";

import { useEffect, useMemo, useState } from "react";
import { Check, Film, Image as ImageIcon, Music, Search } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Dialog } from "@/components/ui/Dialog";
import { cx } from "@/components/ui/cx";
import { Spinner } from "@/components/ui/Spinner";
import { qs } from "@/lib/client/api";
import { useResource } from "@/lib/client/use-resource";
import { formatDuration } from "@/lib/shared/format";
import type { Asset, AssetKind, AssetPage } from "@/lib/shared/types";

export interface MediaPickerProps {
  open: boolean;
  onClose: () => void;
  onPick: (assets: Asset[]) => void;
  title?: string;
  /** Types autorisés (par défaut : photos et vidéos). */
  kinds?: AssetKind[];
  multiple?: boolean;
  /** Médias déjà choisis (cochés à l'ouverture). */
  initial?: string[];
  confirmLabel?: string;
}

/** Sélecteur de médias de la médiathèque, réutilisé par le montage, la programmation et l'agent. */
export function MediaPickerDialog({ open, onClose, onPick, title = "Choisir des médias", kinds = ["photo", "video"], multiple = true, initial = [], confirmLabel = "Ajouter" }: MediaPickerProps) {
  const [q, setQ] = useState("");
  const [debounced, setDebounced] = useState("");
  const [kind, setKind] = useState<AssetKind | "all">("all");
  const [picked, setPicked] = useState<Map<string, Asset>>(new Map());

  useEffect(() => {
    const t = window.setTimeout(() => setDebounced(q), 250);
    return () => window.clearTimeout(t);
  }, [q]);

  useEffect(() => {
    if (open) setPicked(new Map());
  }, [open]);

  const path = open ? `/api/assets${qs({ q: debounced, kind: kind === "all" ? undefined : kind, limit: 300, sort: "recent" })}` : null;
  const { data, loading } = useResource<AssetPage>(path, ["assets"]);
  const items = useMemo(() => (data?.items ?? []).filter((a) => kinds.includes(a.kind)), [data, kinds]);

  useEffect(() => {
    if (!open || initial.length === 0 || !data) return;
    setPicked((prev) => {
      if (prev.size > 0) return prev;
      const m = new Map<string, Asset>();
      for (const a of data.items) if (initial.includes(a.id)) m.set(a.id, a);
      return m;
    });
  }, [open, data, initial]);

  function toggle(a: Asset) {
    setPicked((prev) => {
      const m = new Map(multiple ? prev : []);
      if (prev.has(a.id)) m.delete(a.id);
      else m.set(a.id, a);
      return m;
    });
  }

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={title}
      size="xl"
      footer={
        <>
          <span className="mr-auto text-[13px] text-muted">{picked.size > 0 ? `${picked.size} sélectionné${picked.size > 1 ? "s" : ""}` : "Aucune sélection"}</span>
          <Button variant="ghost" onClick={onClose}>
            Annuler
          </Button>
          <Button
            variant="primary"
            disabled={picked.size === 0}
            onClick={() => {
              onPick([...picked.values()]);
              onClose();
            }}
          >
            {confirmLabel}
          </Button>
        </>
      }
    >
      <div className="sticky top-0 z-10 flex flex-wrap items-center gap-2 border-b border-line bg-surface px-5 py-3">
        <div className="relative min-w-[220px] flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-faint" />
          <input
            autoFocus
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Rechercher un média"
            aria-label="Rechercher un média"
            className="h-9 w-full rounded-full bg-sunken pl-9 pr-3 text-[13.5px] focus:outline-none focus:ring-2 focus:ring-chestnut/30"
          />
        </div>
        {kinds.length > 1 ? (
          <div className="flex gap-1" role="radiogroup" aria-label="Type de média">
            {(["all", ...kinds] as const).map((k) => (
              <button
                key={k}
                type="button"
                role="radio"
                aria-checked={kind === k}
                onClick={() => setKind(k)}
                className={cx("h-8 rounded-full px-3 text-[12.5px] font-semibold", kind === k ? "bg-ink text-surface" : "bg-sunken text-ink hover:bg-hover")}
              >
                {k === "all" ? "Tout" : k === "photo" ? "Photos" : k === "video" ? "Vidéos" : "Audio"}
              </button>
            ))}
          </div>
        ) : null}
      </div>
      <div className="min-h-[50vh] p-5">
        {loading && !data ? (
          <div className="flex justify-center py-16">
            <Spinner />
          </div>
        ) : items.length === 0 ? (
          <p className="py-16 text-center text-[13.5px] text-muted">Aucun média ne correspond.</p>
        ) : (
          <ul className="grid grid-cols-[repeat(auto-fill,minmax(132px,1fr))] gap-3">
            {items.map((a) => {
              const on = picked.has(a.id);
              const order = on ? [...picked.keys()].indexOf(a.id) + 1 : 0;
              return (
                <li key={a.id}>
                  <button
                    type="button"
                    onClick={() => toggle(a)}
                    aria-pressed={on}
                    className={cx("group relative block aspect-square w-full overflow-hidden rounded-xl bg-sunken text-left outline-none ring-offset-2 ring-offset-surface focus-visible:ring-2 focus-visible:ring-chestnut", on && "ring-[3px] ring-chestnut")}
                  >
                    {a.urls.thumb || a.urls.poster ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={a.urls.thumb ?? a.urls.poster ?? ""} alt={a.ai?.alt ?? a.name} loading="lazy" className="h-full w-full object-cover" />
                    ) : (
                      <span className="flex h-full w-full items-center justify-center text-faint">{a.kind === "audio" ? <Music /> : a.kind === "video" ? <Film /> : <ImageIcon />}</span>
                    )}
                    {a.kind === "video" ? <span className="absolute bottom-1.5 right-1.5 rounded bg-night/70 px-1.5 py-0.5 text-2xs font-semibold text-surface">{formatDuration(a.durationS)}</span> : null}
                    <span className={cx("absolute left-1.5 top-1.5 flex h-6 min-w-6 items-center justify-center rounded-full border-2 px-1 text-2xs font-bold", on ? "border-chestnut bg-chestnut text-surface" : "border-surface/90 bg-night/20 text-transparent group-hover:bg-night/30")}>
                      {on ? (multiple ? order : <Check className="h-3.5 w-3.5" />) : ""}
                    </span>
                  </button>
                  <p className="mt-1 truncate text-[12px] text-muted" title={a.name}>
                    {a.ai?.title ?? a.name}
                  </p>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </Dialog>
  );
}
