"use client";

import { useState } from "react";
import { Film, ImageIcon, Music, Play } from "lucide-react";
import { cx } from "@/components/ui/cx";
import { formatDuration } from "@/lib/shared/format";
import type { Asset } from "@/lib/shared/types";

/** Vignette d'un média (photo, affiche vidéo ou icône), avec la durée pour les vidéos. */
export function MediaThumb({ asset, className, fit = "cover", showDuration = true }: { asset: Asset; className?: string; fit?: "cover" | "contain"; showDuration?: boolean }) {
  const [failed, setFailed] = useState(false);
  const src = asset.urls.thumb ?? asset.urls.poster;
  return (
    <span className={cx("relative block overflow-hidden bg-sunken", className)}>
      {src && !failed ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={src} alt={asset.ai?.alt ?? asset.name} loading="lazy" draggable={false} onError={() => setFailed(true)} className={cx("h-full w-full", fit === "cover" ? "object-cover" : "object-contain")} />
      ) : (
        <span className="flex h-full w-full items-center justify-center text-faint" aria-label={asset.name}>
          {asset.kind === "audio" ? <Music className="h-6 w-6" /> : asset.kind === "video" ? <Film className="h-6 w-6" /> : <ImageIcon className="h-6 w-6" />}
        </span>
      )}
      {asset.kind === "video" && showDuration ? (
        <span className="absolute bottom-1.5 right-1.5 inline-flex items-center gap-1 rounded bg-night/70 px-1.5 py-0.5 text-2xs font-semibold text-surface">
          <Play className="h-2.5 w-2.5 fill-current" aria-hidden />
          {formatDuration(asset.durationS)}
        </span>
      ) : null}
    </span>
  );
}
