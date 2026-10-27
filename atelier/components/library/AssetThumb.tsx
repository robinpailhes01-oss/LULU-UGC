"use client";

import { memo, useEffect, useState } from "react";
import { Film, Image as ImageIcon, Music } from "lucide-react";
import { cx } from "@/components/ui/cx";
import { formatDuration } from "@/lib/shared/format";
import type { Asset } from "@/lib/shared/types";

function extensionLabel(asset: Asset): string {
  const m = /\.([a-z0-9]{1,5})$/i.exec(asset.name);
  if (m) return m[1].toUpperCase();
  return asset.mime.split("/")[1]?.toUpperCase().slice(0, 5) ?? "";
}

/** Aperçu neutre quand il n'y a pas de vignette (HEIC sans décodeur, son, codec illisible). */
export function AssetPlaceholder({ asset, size = "md" }: { asset: Pick<Asset, "kind" | "name" | "mime" | "durationS">; size?: "sm" | "md" | "lg" }) {
  const Icon = asset.kind === "video" ? Film : asset.kind === "audio" ? Music : ImageIcon;
  return (
    <span
      className={cx(
        "flex h-full w-full flex-col items-center justify-center gap-1.5 text-chestnut/70",
        asset.kind === "audio" ? "bg-[radial-gradient(circle_at_30%_25%,#F1DFC2,#E9E1D4_70%)]" : "bg-[linear-gradient(160deg,#EFE7DA,#E2D7C6)]",
      )}
    >
      <Icon className={size === "sm" ? "h-4 w-4" : size === "lg" ? "h-10 w-10" : "h-7 w-7"} aria-hidden strokeWidth={1.6} />
      {size !== "sm" ? (
        <span className="text-2xs font-semibold tracking-[0.08em] text-muted">
          {extensionLabel(asset as Asset)}
          {asset.kind === "audio" && asset.durationS ? ` · ${formatDuration(asset.durationS)}` : ""}
        </span>
      ) : null}
    </span>
  );
}

/** Vignette d'un média (chargement paresseux, décodage asynchrone, repli si l'image est illisible). */
export const AssetThumb = memo(function AssetThumb({ asset, size = "md", className, fit = "cover" }: { asset: Asset; size?: "sm" | "md" | "lg"; className?: string; fit?: "cover" | "contain" }) {
  const src = asset.urls.thumb ?? asset.urls.poster;
  const [failed, setFailed] = useState(false);
  const [loaded, setLoaded] = useState(false);
  useEffect(() => {
    setFailed(false);
    setLoaded(false);
  }, [src]);
  if (!src || failed) return <AssetPlaceholder asset={asset} size={size} />;
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt={asset.ai?.alt ?? ""}
      loading="lazy"
      decoding="async"
      draggable={false}
      ref={(el) => {
        if (el && el.complete && el.naturalWidth > 0 && !loaded) setLoaded(true);
      }}
      onLoad={() => setLoaded(true)}
      onError={() => setFailed(true)}
      className={cx("h-full w-full transition-opacity duration-base", fit === "cover" ? "object-cover" : "object-contain", loaded ? "opacity-100" : "opacity-0", className)}
    />
  );
});
