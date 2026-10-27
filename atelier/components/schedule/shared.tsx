"use client";

import { Film, ImageOff } from "lucide-react";
import { cx } from "@/components/ui/cx";
import { PlatformGlyphs } from "@/components/schedule/PlatformGlyph";
import { STATUS_STYLE, StatusIcon, statusLabel } from "@/components/schedule/status";
import { whenLabel, zoned } from "@/components/schedule/dates";
import { PLATFORM_LABEL } from "@/lib/shared/labels";
import type { ScheduleRules } from "@/lib/server/zernio/rules";
import type { Asset, ScheduledPost, SocialAccount } from "@/lib/shared/types";

/** Réponses des routes du module. */
export interface PostsResponse {
  posts: ScheduledPost[];
  assets: Record<string, Asset>;
}

export type AccountInfo = SocialAccount & { needsReconnection: boolean; platformLabel: string };

export interface AccountsResponse {
  configured: boolean;
  accounts: AccountInfo[];
  rules: ScheduleRules;
  error: string | null;
}

/** Type MIME du glisser-déposer d'une publication (calendrier, brouillons). */
export const DRAG_POST_MIME = "application/x-atelier-post";

export function thumbUrl(a: Asset | undefined): string | null {
  if (!a) return null;
  return a.urls.thumb ?? a.urls.poster ?? (a.kind === "photo" ? a.urls.original : null);
}

export function captionExcerpt(c: string, n = 60): string {
  const t = c.replace(/\s+/g, " ").trim();
  return t.length > n ? `${t.slice(0, n - 1)}…` : t;
}

export function postAriaLabel(post: ScheduledPost): string {
  const platforms = [...new Set(post.targets.map((t) => PLATFORM_LABEL[t.platform] ?? t.platform))];
  const when = post.scheduledFor ? whenLabel(post.scheduledFor) : "sans date";
  const cap = captionExcerpt(post.caption, 50);
  return `${statusLabel(post)}${platforms.length ? `, ${platforms.join(" et ")}` : ""}, ${when}${cap ? ` : « ${cap} »` : ""}`;
}

export function Thumb({ asset, className, rounded = "rounded" }: { asset: Asset | undefined; className?: string; rounded?: string }) {
  const url = thumbUrl(asset);
  return (
    <span className={cx("relative inline-block shrink-0 overflow-hidden bg-sunken", rounded, className)}>
      {url ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={url} alt="" className="h-full w-full object-cover" loading="lazy" draggable={false} />
      ) : (
        <span className="flex h-full w-full items-center justify-center text-faint">{asset?.kind === "video" ? <Film className="h-3 w-3" /> : <ImageOff className="h-3 w-3" />}</span>
      )}
    </span>
  );
}

/** Pastille d'une publication dans le calendrier (cliquable, déplaçable si elle n'est pas publiée). */
export function PostChip({
  post,
  asset,
  onOpen,
  dense,
  tall,
  className,
  style,
}: {
  post: ScheduledPost;
  asset: Asset | undefined;
  onOpen: (p: ScheduledPost) => void;
  dense?: boolean;
  /** Deux lignes (vue semaine) : heure et plateformes, puis le début de la légende. */
  tall?: boolean;
  className?: string;
  style?: React.CSSProperties;
}) {
  const movable = post.status !== "published" && post.status !== "publishing";
  const s = STATUS_STYLE[post.status === "published" && post.error ? "publishing" : post.status];
  const time = post.scheduledFor ? zoned(post.scheduledFor).time : null;
  return (
    <button
      type="button"
      draggable={movable}
      aria-label={postAriaLabel(post)}
      title={postAriaLabel(post)}
      onDragStart={(e) => {
        e.dataTransfer.setData(DRAG_POST_MIME, post.id);
        e.dataTransfer.effectAllowed = "move";
      }}
      onClick={(e) => {
        e.stopPropagation();
        onOpen(post);
      }}
      style={style}
      className={cx(
        "group/chip relative flex w-full min-w-0 items-center gap-1 overflow-hidden rounded-md pl-[5px] pr-1 text-left transition-[filter] duration-fast hover:brightness-[.97] focus-visible:z-10",
        tall ? "h-10 flex-col !items-stretch justify-center gap-0" : dense ? "h-[18px]" : "h-6",
        s.chip,
        movable ? "cursor-grab active:cursor-grabbing" : "cursor-pointer",
        className,
      )}
    >
      <span className={cx("absolute inset-y-0 left-0 w-[3px]", s.bar)} aria-hidden />
      {tall ? (
        <>
          <span className="flex min-w-0 items-center gap-1 overflow-hidden">
            <Thumb asset={asset} className="h-[16px] w-[16px]" />
            <StatusIcon status={post.status} />
            {time ? <span className="shrink-0 text-2xs font-semibold tabular-nums">{time}</span> : null}
            <PlatformGlyphs platforms={post.targets.map((t) => t.platform)} className="h-3 w-3" />
          </span>
          <span className="block min-w-0 truncate text-[11.5px] leading-4">{captionExcerpt(post.caption, 40) || "Sans légende"}</span>
        </>
      ) : (
        <>
          {!dense ? <Thumb asset={asset} className="h-[18px] w-[18px]" /> : null}
          <StatusIcon status={post.status} className={cx(dense ? "hidden sm:block" : "")} />
          {time ? <span className="shrink-0 text-2xs font-semibold tabular-nums">{time}</span> : null}
          <span className={cx("inline-flex", dense && "hidden xl:inline-flex")}>
            <PlatformGlyphs platforms={post.targets.map((t) => t.platform)} className="h-3 w-3" />
          </span>
          <span className={cx("min-w-0 flex-1 truncate text-[11.5px]", dense && "hidden md:inline")}>{captionExcerpt(post.caption, 40) || "Sans légende"}</span>
        </>
      )}
    </button>
  );
}
