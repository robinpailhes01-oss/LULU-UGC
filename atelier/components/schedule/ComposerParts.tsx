"use client";

import { useState } from "react";
import { ChevronLeft, ChevronRight, Film, Heart, ImagePlus, MessageCircle, Play, Send, X } from "lucide-react";
import { cx } from "@/components/ui/cx";
import { PlatformGlyph } from "@/components/schedule/PlatformGlyph";
import { thumbUrl } from "@/components/schedule/shared";
import { INSTAGRAM_FOLD } from "@/lib/server/zernio/rules";
import { formatDuration } from "@/lib/shared/format";
import type { Asset } from "@/lib/shared/types";

/** Bande des médias de la publication : ordre = ordre du carrousel. Glisser ou flèches pour réordonner. */
export function MediaStrip({ media, onChange, onAdd, disabled }: { media: Asset[]; onChange: (m: Asset[]) => void; onAdd: () => void; disabled?: boolean }) {
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [overIndex, setOverIndex] = useState<number | null>(null);
  const move = (from: number, to: number) => {
    if (to < 0 || to >= media.length || from === to) return;
    const next = [...media];
    const [m] = next.splice(from, 1);
    next.splice(to, 0, m);
    onChange(next);
  };
  return (
    <ol className="flex flex-wrap gap-2" aria-label="Médias, dans l'ordre de publication">
      {media.map((a, i) => {
        const url = thumbUrl(a);
        return (
          <li
            key={a.id}
            draggable={!disabled}
            onDragStart={(e) => {
              setDragIndex(i);
              e.dataTransfer.effectAllowed = "move";
              e.dataTransfer.setData("text/plain", a.id);
            }}
            onDragOver={(e) => {
              if (dragIndex === null) return;
              e.preventDefault();
              setOverIndex(i);
            }}
            onDrop={(e) => {
              e.preventDefault();
              if (dragIndex !== null) move(dragIndex, i);
              setDragIndex(null);
              setOverIndex(null);
            }}
            onDragEnd={() => {
              setDragIndex(null);
              setOverIndex(null);
            }}
            className={cx(
              "group/m relative h-[90px] w-[72px] shrink-0 overflow-hidden rounded-lg bg-sunken ring-offset-2 ring-offset-surface",
              !disabled && "cursor-grab active:cursor-grabbing",
              overIndex === i && dragIndex !== i && "ring-2 ring-chestnut",
              dragIndex === i && "opacity-50",
            )}
          >
            {url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={url} alt={a.ai?.alt ?? a.name} className="h-full w-full object-cover" draggable={false} />
            ) : (
              <span className="flex h-full w-full items-center justify-center text-faint">
                <Film className="h-5 w-5" />
              </span>
            )}
            <span className="absolute left-1 top-1 rounded-full bg-night/70 px-1.5 text-[10px] font-bold tabular-nums text-surface">{i + 1}</span>
            {a.kind === "video" ? (
              <span className="absolute bottom-1 left-1 inline-flex items-center gap-0.5 rounded-full bg-night/70 px-1.5 text-[10px] font-semibold text-surface">
                <Play className="h-2.5 w-2.5 fill-current" aria-hidden />
                {formatDuration(a.durationS)}
              </span>
            ) : null}
            {!disabled ? (
              <>
                <button
                  type="button"
                  aria-label={`Retirer « ${a.name} »`}
                  onClick={() => onChange(media.filter((m) => m.id !== a.id))}
                  className="absolute right-1 top-1 flex h-6 w-6 items-center justify-center rounded-full bg-night/70 text-surface opacity-100 transition-opacity hover:bg-night sm:opacity-0 sm:focus-visible:opacity-100 sm:group-hover/m:opacity-100"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
                {media.length > 1 ? (
                  <span className="absolute bottom-1 right-1 flex gap-0.5 opacity-100 transition-opacity sm:opacity-0 sm:focus-within:opacity-100 sm:group-hover/m:opacity-100">
                    <button type="button" aria-label={`Avancer « ${a.name} »`} disabled={i === 0} onClick={() => move(i, i - 1)} className="flex h-5 w-5 items-center justify-center rounded-full bg-surface/90 text-ink disabled:opacity-30">
                      <ChevronLeft className="h-3 w-3" />
                    </button>
                    <button type="button" aria-label={`Reculer « ${a.name} »`} disabled={i === media.length - 1} onClick={() => move(i, i + 1)} className="flex h-5 w-5 items-center justify-center rounded-full bg-surface/90 text-ink disabled:opacity-30">
                      <ChevronRight className="h-3 w-3" />
                    </button>
                  </span>
                ) : null}
              </>
            ) : null}
          </li>
        );
      })}
      {!disabled ? (
        <li>
          <button
            type="button"
            onClick={onAdd}
            className="flex h-[90px] w-[72px] flex-col items-center justify-center gap-1 rounded-lg border border-dashed border-line-strong text-[11.5px] font-semibold text-muted transition-colors hover:border-chestnut hover:bg-hover hover:text-ink"
          >
            <ImagePlus className="h-5 w-5" aria-hidden />
            Ajouter
          </button>
        </li>
      ) : null}
    </ol>
  );
}

/** Aperçu façon téléphone (indicatif, pas une réplique au pixel près). */
export function PhonePreview({
  media,
  caption,
  platform,
  format,
  account,
}: {
  media: Asset[];
  caption: string;
  platform: string;
  format: "feed" | "reel" | "story";
  account: string;
}) {
  const first = media[0];
  const url = first ? (first.kind === "photo" ? first.urls.original : first.urls.poster ?? first.urls.thumb) : null;
  const tall = format !== "feed" || platform === "tiktok";
  const cap = caption.trim();
  const folded = cap.length > INSTAGRAM_FOLD ? `${cap.slice(0, INSTAGRAM_FOLD).trimEnd()}…` : cap;
  const overlay = tall && format !== "story";
  return (
    <figure className="mx-auto w-full max-w-[236px]" aria-label={`Aperçu ${platform === "tiktok" ? "TikTok" : platform === "facebook" ? "Facebook" : "Instagram"}`}>
      <div className="overflow-hidden rounded-[28px] border-[6px] border-ink bg-night shadow-pop">
        {!tall ? (
          <div className="flex items-center gap-2 bg-surface px-3 py-2">
            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-chestnut text-[10px] font-bold text-surface">{account.slice(0, 1).toUpperCase()}</span>
            <span className="min-w-0 flex-1 truncate text-[11.5px] font-semibold text-ink">{account}</span>
            <PlatformGlyph platform={platform} className="h-3.5 w-3.5 text-ink" title={false} />
          </div>
        ) : null}
        <div className={cx("relative w-full bg-[#2b221b]", tall ? "aspect-[9/16]" : "aspect-[4/5]")}>
          {url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={url} alt="" className="absolute inset-0 h-full w-full object-cover" />
          ) : (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 px-6 text-center text-[12px] text-surface/60">
              <ImagePlus className="h-6 w-6" aria-hidden />
              Ajoutez un média pour voir l'aperçu.
            </div>
          )}
          {first?.kind === "video" ? (
            <span className="absolute left-1/2 top-1/2 flex h-11 w-11 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-night/45 text-surface backdrop-blur-sm">
              <Play className="h-5 w-5 fill-current" aria-hidden />
            </span>
          ) : null}
          {format === "story" ? (
            <div className="absolute inset-x-2 top-2 space-y-1.5">
              <div className="h-0.5 rounded-full bg-surface/80" />
              <div className="flex items-center gap-1.5 text-[11px] font-semibold text-surface drop-shadow">
                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-chestnut text-[9px]">{account.slice(0, 1).toUpperCase()}</span>
                {account}
              </div>
            </div>
          ) : null}
          {media.length > 1 && !tall ? (
            <div className="absolute inset-x-0 bottom-2 flex justify-center gap-1" aria-hidden>
              {media.slice(0, 10).map((m, i) => (
                <span key={m.id} className={cx("h-1.5 w-1.5 rounded-full", i === 0 ? "bg-surface" : "bg-surface/50")} />
              ))}
            </div>
          ) : null}
          {overlay ? (
            <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-night/80 via-night/30 to-transparent px-3 pb-3 pt-10 text-surface">
              <div className="flex items-center gap-1.5 text-[11.5px] font-semibold">
                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-chestnut text-[9px]">{account.slice(0, 1).toUpperCase()}</span>
                {account}
              </div>
              {cap ? <p className="mt-1 line-clamp-2 text-[11px] leading-snug text-surface/90">{cap}</p> : null}
            </div>
          ) : null}
        </div>
        {!tall ? (
          <div className="space-y-1 bg-surface px-3 pb-3 pt-2 text-ink">
            <div className="flex gap-2.5" aria-hidden>
              <Heart className="h-4 w-4" />
              <MessageCircle className="h-4 w-4" />
              <Send className="h-4 w-4" />
            </div>
            <p className="text-[11px] leading-snug">
              <span className="font-semibold">{account}</span> {folded ? <span className="whitespace-pre-line">{folded}</span> : <span className="text-muted">Votre légende…</span>}
              {cap.length > INSTAGRAM_FOLD ? <span className="text-muted"> plus</span> : null}
            </p>
          </div>
        ) : null}
      </div>
    </figure>
  );
}
