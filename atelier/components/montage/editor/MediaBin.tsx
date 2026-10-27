"use client";

import { Film, Image as ImageIcon, Plus, Type } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { cx } from "@/components/ui/cx";
import { formatSeconds } from "@/components/montage/editor/controls";
import type { Selection } from "@/components/montage/editor/Timeline";
import { plainText, TEXT_STYLE_LABEL } from "@/lib/client/montage/style";
import type { MontageTiming } from "@/lib/client/montage/timing";
import type { Asset, MontageSpec } from "@/lib/shared/types";

/** Colonne de gauche : plans utilisés (dans l'ordre) et textes, avec leurs actions d'ajout. */
export function MediaBin({
  spec,
  timing,
  assets,
  selection,
  onSelect,
  onSeek,
  onAddMedia,
  onAddText,
}: {
  spec: MontageSpec;
  timing: MontageTiming;
  assets: Record<string, Asset>;
  selection: Selection;
  onSelect: (s: Selection) => void;
  onSeek: (t: number) => void;
  onAddMedia: () => void;
  onAddText: () => void;
}) {
  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="flex items-center justify-between px-4 pb-2 pt-4">
        <h2 className="label-eyebrow">Plans · {spec.clips.length}</h2>
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto px-2">
        {spec.clips.length === 0 ? <p className="px-2 py-3 text-[12.5px] leading-relaxed text-muted">Aucun plan pour l'instant. Ajoutez des photos et des vidéos de la médiathèque.</p> : null}
        <ul className="space-y-0.5">
          {spec.clips.map((c, i) => {
            const a = assets[c.assetId];
            const t = timing.clips[i];
            const sel = selection?.kind === "clip" && selection.id === c.id;
            const thumb = a?.urls.thumb ?? a?.urls.poster ?? null;
            return (
              <li key={c.id}>
                <button
                  type="button"
                  aria-pressed={sel}
                  onClick={() => {
                    onSelect({ kind: "clip", id: c.id });
                    if (t) onSeek(t.startS + Math.min(0.1, t.durationS / 4));
                  }}
                  className={cx("flex w-full items-center gap-2.5 rounded-lg p-1.5 text-left transition-colors", sel ? "bg-select" : "hover:bg-hover")}
                >
                  <span className="relative h-12 w-[34px] shrink-0 overflow-hidden rounded-md bg-night">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    {thumb ? <img src={thumb} alt="" className="h-full w-full object-cover" loading="lazy" /> : null}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className={cx("block truncate text-[12.5px]", sel ? "font-semibold text-chestnut" : "text-ink")}>
                      {i + 1}. {a?.ai?.title ?? a?.name ?? "Média introuvable"}
                    </span>
                    <span className="mt-0.5 flex items-center gap-1 text-[11.5px] text-muted">
                      {a?.kind === "video" ? <Film className="h-3 w-3" aria-hidden /> : <ImageIcon className="h-3 w-3" aria-hidden />}
                      {formatSeconds(c.outS - c.inS)}
                      {a?.kind === "video" && c.muted === false ? " · son" : ""}
                    </span>
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
        <div className="px-1.5 py-2">
          <Button size="sm" className="w-full" icon={<Plus className="h-4 w-4" />} onClick={onAddMedia}>
            Ajouter des médias
          </Button>
        </div>

        <h2 className="label-eyebrow px-2 pb-2 pt-4">Textes · {spec.texts.length}</h2>
        {spec.texts.length === 0 ? <p className="px-2 pb-2 text-[12.5px] leading-relaxed text-muted">Un hook court au début suffit souvent.</p> : null}
        <ul className="space-y-0.5">
          {spec.texts.map((t) => {
            const sel = selection?.kind === "text" && selection.id === t.id;
            return (
              <li key={t.id}>
                <button
                  type="button"
                  aria-pressed={sel}
                  onClick={() => {
                    onSelect({ kind: "text", id: t.id });
                    onSeek(t.startS + Math.min(0.6, (t.endS - t.startS) / 2));
                  }}
                  className={cx("flex w-full items-start gap-2 rounded-lg px-2 py-1.5 text-left transition-colors", sel ? "bg-select" : "hover:bg-hover")}
                >
                  <Type className="mt-0.5 h-3.5 w-3.5 shrink-0 text-muted" aria-hidden />
                  <span className="min-w-0 flex-1">
                    <span className={cx("line-clamp-2 text-[12.5px]", sel ? "font-semibold text-chestnut" : "text-ink")}>{plainText(t.text) || "Texte vide"}</span>
                    <span className="text-[11.5px] text-muted">
                      {TEXT_STYLE_LABEL[t.style]} · {formatSeconds(t.startS)} → {formatSeconds(t.endS)}
                    </span>
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
        <div className="px-1.5 py-2">
          <Button size="sm" variant="ghost" className="w-full" icon={<Type className="h-4 w-4" />} onClick={onAddText}>
            Ajouter un texte
          </Button>
        </div>
      </div>
    </div>
  );
}
