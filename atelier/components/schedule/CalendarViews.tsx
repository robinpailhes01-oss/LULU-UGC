"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Plus } from "lucide-react";
import { cx } from "@/components/ui/cx";
import { PlatformGlyph } from "@/components/schedule/PlatformGlyph";
import { StatusBadge } from "@/components/schedule/status";
import { addDays, dayNumber, longDayLabel, monthGrid, startOfMonth, startOfWeek, WEEKDAYS_SHORT, weekdayDayLabel, zoned } from "@/components/schedule/dates";
import { DRAG_POST_MIME, PostChip, Thumb, captionExcerpt, postAriaLabel } from "@/components/schedule/shared";
import type { Asset, ScheduledPost } from "@/lib/shared/types";

export interface CalendarProps {
  anchor: string;
  today: string;
  posts: ScheduledPost[];
  assets: Record<string, Asset>;
  loading: boolean;
  onCreate: (day: string, time?: string) => void;
  onOpen: (post: ScheduledPost) => void;
  /** Dépôt d'une publication glissée sur un jour (et une heure en vue semaine). */
  onDropPost: (postId: string, day: string, time?: string) => void;
}

function byDay(posts: ScheduledPost[]): Map<string, ScheduledPost[]> {
  const m = new Map<string, ScheduledPost[]>();
  for (const p of posts) {
    if (!p.scheduledFor) continue;
    const d = zoned(p.scheduledFor).day;
    const list = m.get(d) ?? [];
    list.push(p);
    m.set(d, list);
  }
  for (const list of m.values()) list.sort((a, b) => (a.scheduledFor! < b.scheduledFor! ? -1 : 1));
  return m;
}

function useDropTarget(onDrop: (postId: string) => void) {
  const [over, setOver] = useState(false);
  return {
    over,
    props: {
      onDragOver: (e: React.DragEvent) => {
        if (!e.dataTransfer.types.includes(DRAG_POST_MIME)) return;
        e.preventDefault();
        e.dataTransfer.dropEffect = "move";
        setOver(true);
      },
      onDragLeave: () => setOver(false),
      onDrop: (e: React.DragEvent) => {
        setOver(false);
        const id = e.dataTransfer.getData(DRAG_POST_MIME);
        if (id) {
          e.preventDefault();
          onDrop(id);
        }
      },
    },
  };
}

// ---------------------------------------------------------------------------------------------
// Mois

const MAX_CHIPS = 3;

export function MonthView({ anchor, today, posts, assets, loading, onCreate, onOpen, onDropPost }: CalendarProps) {
  const days = useMemo(() => monthGrid(anchor), [anchor]);
  const month = startOfMonth(anchor).slice(0, 7);
  const map = useMemo(() => byDay(posts), [posts]);
  return (
    <div className="overflow-hidden rounded-card border border-line bg-surface" role="grid" aria-label="Calendrier du mois">
      <div className="grid grid-cols-7 border-b border-line bg-canvas/60" role="row">
        {WEEKDAYS_SHORT.map((w) => (
          <div key={w} role="columnheader" className="px-1.5 py-2 text-center text-2xs font-semibold uppercase tracking-[0.08em] text-muted sm:px-2.5 sm:text-left">
            {w}
          </div>
        ))}
      </div>
      <div className="grid grid-cols-7">
        {days.map((d, i) => (
          <MonthCell
            key={d}
            day={d}
            inMonth={d.startsWith(month)}
            isToday={d === today}
            isPast={d < today}
            lastCol={i % 7 === 6}
            lastRow={i >= days.length - 7}
            posts={map.get(d) ?? []}
            assets={assets}
            loading={loading}
            onCreate={onCreate}
            onOpen={onOpen}
            onDropPost={onDropPost}
          />
        ))}
      </div>
    </div>
  );
}

function MonthCell({
  day,
  inMonth,
  isToday,
  isPast,
  lastCol,
  lastRow,
  posts,
  assets,
  loading,
  onCreate,
  onOpen,
  onDropPost,
}: {
  day: string;
  inMonth: boolean;
  isToday: boolean;
  isPast: boolean;
  lastCol: boolean;
  lastRow: boolean;
  posts: ScheduledPost[];
  assets: Record<string, Asset>;
  loading: boolean;
  onCreate: CalendarProps["onCreate"];
  onOpen: CalendarProps["onOpen"];
  onDropPost: CalendarProps["onDropPost"];
}) {
  const [expanded, setExpanded] = useState(false);
  const drop = useDropTarget((id) => onDropPost(id, day));
  const shown = expanded ? posts : posts.slice(0, MAX_CHIPS);
  const rest = posts.length - shown.length;
  const label = longDayLabel(day);
  return (
    <div
      role="gridcell"
      aria-label={`${label}${posts.length ? `, ${posts.length} publication${posts.length > 1 ? "s" : ""}` : ""}`}
      {...drop.props}
      onClick={() => onCreate(day)}
      className={cx(
        "group/cell relative flex min-h-[76px] min-w-0 cursor-pointer flex-col gap-1 p-1 transition-colors duration-fast sm:min-h-[118px] sm:p-1.5",
        !lastCol && "border-r border-line",
        !lastRow && "border-b border-line",
        inMonth ? "bg-surface hover:bg-[#f7f1e7]" : "bg-canvas/70 hover:bg-canvas",
        drop.over && "bg-honey-soft/70 ring-2 ring-inset ring-chestnut",
      )}
    >
      <div className="flex items-center justify-between">
        <span
          aria-current={isToday ? "date" : undefined}
          className={cx(
            "inline-flex h-6 min-w-6 items-center justify-center rounded-full px-1 text-[12px] font-semibold tabular-nums",
            isToday ? "bg-chestnut text-surface" : inMonth ? (isPast ? "text-muted" : "text-ink") : "text-faint",
          )}
        >
          {dayNumber(day)}
        </span>
        <button
          type="button"
          aria-label={`Ajouter une publication le ${label}`}
          onClick={(e) => {
            e.stopPropagation();
            onCreate(day);
          }}
          className="hidden h-6 w-6 items-center justify-center rounded-full text-muted opacity-0 transition-opacity hover:bg-hover hover:text-ink focus-visible:opacity-100 group-hover/cell:opacity-100 sm:inline-flex"
        >
          <Plus className="h-3.5 w-3.5" />
        </button>
      </div>
      {loading && posts.length === 0 && inMonth && dayNumber(day) % 6 === 2 ? <span className="skeleton h-5 w-full" /> : null}
      <div className="flex min-w-0 flex-col gap-[3px]">
        {shown.map((p) => (
          <PostChip key={p.id} post={p} asset={assets[p.assetIds[0]]} onOpen={onOpen} dense className="sm:h-6" />
        ))}
        {rest > 0 ? (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setExpanded(true);
            }}
            className="self-start rounded px-1 text-2xs font-semibold text-chestnut hover:bg-hover"
          >
            +{rest} {rest > 1 ? "autres" : "autre"}
          </button>
        ) : null}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------------------------
// Semaine

const H0 = 7;
const H1 = 23;
const ROW = 48;

export function WeekView({ anchor, today, posts, assets, loading, onCreate, onOpen, onDropPost }: CalendarProps) {
  const start = startOfWeek(anchor);
  const days = useMemo(() => Array.from({ length: 7 }, (_, i) => addDays(start, i)), [start]);
  const map = useMemo(() => byDay(posts), [posts]);
  const hours = Array.from({ length: H1 - H0 + 1 }, (_, i) => H0 + i);
  const scroller = useRef<HTMLDivElement>(null);
  const [now, setNow] = useState(() => zoned(new Date().toISOString()));
  useEffect(() => {
    const t = window.setInterval(() => setNow(zoned(new Date().toISOString())), 60_000);
    return () => window.clearInterval(t);
  }, []);

  return (
    <div className="overflow-hidden rounded-card border border-line bg-surface">
      <div ref={scroller} className="max-h-[calc(100dvh-260px)] min-h-[420px] overflow-auto">
        <div className="min-w-[720px]">
          <div className="sticky top-0 z-[2] grid grid-cols-[52px_repeat(7,minmax(0,1fr))] border-b border-line bg-surface/95 backdrop-blur">
            <div />
            {days.map((d) => (
              <div key={d} className="border-l border-line px-2 py-2">
                <span className={cx("inline-flex items-center gap-1.5 text-[12.5px] font-semibold", d === today ? "text-chestnut" : d < today ? "text-muted" : "text-ink")} aria-current={d === today ? "date" : undefined}>
                  {d === today ? <span className="h-1.5 w-1.5 rounded-full bg-chestnut" aria-hidden /> : null}
                  {weekdayDayLabel(d)}
                </span>
              </div>
            ))}
          </div>
          <div className="relative grid grid-cols-[52px_repeat(7,minmax(0,1fr))]">
            <div>
              {hours.map((h) => (
                <div key={h} style={{ height: ROW }} className="border-b border-transparent pr-2 pt-1 text-right text-2xs tabular-nums text-muted">
                  {String(h).padStart(2, "0")}:00
                </div>
              ))}
            </div>
            {days.map((d) => (
              <WeekColumn key={d} day={d} hours={hours} posts={map.get(d) ?? []} assets={assets} isToday={d === today} now={now} loading={loading} onCreate={onCreate} onOpen={onOpen} onDropPost={onDropPost} />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function WeekColumn({
  day,
  hours,
  posts,
  assets,
  isToday,
  now,
  loading,
  onCreate,
  onOpen,
  onDropPost,
}: {
  day: string;
  hours: number[];
  posts: ScheduledPost[];
  assets: Record<string, Asset>;
  isToday: boolean;
  now: { hour: number; minute: number };
  loading: boolean;
  onCreate: CalendarProps["onCreate"];
  onOpen: CalendarProps["onOpen"];
  onDropPost: CalendarProps["onDropPost"];
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [overHour, setOverHour] = useState<number | null>(null);
  const hourAt = (clientY: number) => {
    const r = ref.current!.getBoundingClientRect();
    return Math.min(H1, Math.max(H0, H0 + Math.floor((clientY - r.top) / ROW)));
  };
  const top = (iso: string) => {
    const z = zoned(iso);
    const h = Math.min(H1 + 0.5, Math.max(H0, z.hour + z.minute / 60));
    return (h - H0) * ROW;
  };
  const nowTop = (now.hour + now.minute / 60 - H0) * ROW;
  return (
    <div
      ref={ref}
      className={cx("relative border-l border-line", isToday && "bg-honey-soft/20")}
      style={{ height: hours.length * ROW }}
      onDragOver={(e) => {
        if (!e.dataTransfer.types.includes(DRAG_POST_MIME)) return;
        e.preventDefault();
        setOverHour(hourAt(e.clientY));
      }}
      onDragLeave={() => setOverHour(null)}
      onDrop={(e) => {
        const id = e.dataTransfer.getData(DRAG_POST_MIME);
        const h = hourAt(e.clientY);
        setOverHour(null);
        if (id) {
          e.preventDefault();
          onDropPost(id, day, `${String(h).padStart(2, "0")}:00`);
        }
      }}
    >
      {hours.map((h) => (
        <button
          key={h}
          type="button"
          aria-label={`Ajouter une publication le ${longDayLabel(day)} à ${h} h`}
          onClick={() => onCreate(day, `${String(h).padStart(2, "0")}:00`)}
          style={{ height: ROW }}
          className={cx("group/slot flex w-full items-start justify-end border-b border-line p-1 text-faint hover:bg-hover", overHour === h && "bg-honey-soft/70 ring-2 ring-inset ring-chestnut")}
        >
          <Plus className="h-3 w-3 opacity-0 group-hover/slot:opacity-100 group-focus-visible/slot:opacity-100" aria-hidden />
        </button>
      ))}
      {isToday && now.hour >= H0 && now.hour <= H1 ? (
        <div className="pointer-events-none absolute inset-x-0 z-[1] h-px bg-chestnut" style={{ top: nowTop }} aria-hidden>
          <span className="absolute -left-1 -top-[3px] h-[7px] w-[7px] rounded-full bg-chestnut" />
        </div>
      ) : null}
      {loading && posts.length === 0 && Number(day.slice(8)) % 3 === 0 ? <span className="skeleton absolute inset-x-1 h-6" style={{ top: 11.5 * ROW - H0 * ROW }} /> : null}
      {posts.map((p, i) => (
        <div key={p.id} className="absolute inset-x-1 z-[1] rounded-md shadow-card" style={{ top: top(p.scheduledFor!) + (i > 0 && posts[i - 1].scheduledFor === p.scheduledFor ? 42 : 0) }}>
          <PostChip post={p} asset={assets[p.assetIds[0]]} onOpen={onOpen} tall />
        </div>
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------------------------
// Liste

export function ListView({ today, posts, drafts, assets, loading, onOpen }: { today: string; posts: ScheduledPost[]; drafts: ScheduledPost[]; assets: Record<string, Asset>; loading: boolean; onOpen: (p: ScheduledPost) => void }) {
  const map = useMemo(() => byDay(posts), [posts]);
  const dayKeys = [...map.keys()].sort();
  const upcoming = dayKeys.filter((d) => d >= today);
  const past = dayKeys.filter((d) => d < today).reverse();
  if (loading && posts.length === 0 && drafts.length === 0) {
    return (
      <div className="space-y-3" aria-hidden>
        {Array.from({ length: 5 }, (_, i) => (
          <div key={i} className="skeleton h-16 w-full rounded-card" />
        ))}
      </div>
    );
  }
  return (
    <div className="max-w-[1000px] space-y-8">
      {drafts.length ? <ListSection title={`Brouillons sans date (${drafts.length})`} groups={[{ day: null, posts: drafts }]} assets={assets} onOpen={onOpen} /> : null}
      <ListSection title="À venir" empty="Rien de programmé pour les semaines à venir." groups={upcoming.map((d) => ({ day: d, posts: map.get(d)! }))} assets={assets} onOpen={onOpen} today={today} />
      {past.length ? <ListSection title="Passées" groups={past.map((d) => ({ day: d, posts: [...map.get(d)!].reverse() }))} assets={assets} onOpen={onOpen} today={today} /> : null}
    </div>
  );
}

function ListSection({ title, groups, assets, onOpen, empty, today }: { title: string; groups: { day: string | null; posts: ScheduledPost[] }[]; assets: Record<string, Asset>; onOpen: (p: ScheduledPost) => void; empty?: string; today?: string }) {
  return (
    <section aria-label={title}>
      <h2 className="label-eyebrow mb-3 flex items-center gap-2">
        <span className="h-1.5 w-1.5 rounded-full bg-chestnut" aria-hidden />
        {title}
      </h2>
      {groups.length === 0 ? <p className="rounded-card border border-dashed border-line-strong px-4 py-6 text-center text-[13px] text-muted">{empty}</p> : null}
      <div className="space-y-4">
        {groups.map((g) => (
          <div key={g.day ?? "drafts"}>
            {g.day ? (
              <h3 className="sticky top-0 z-[1] -mx-1 mb-1.5 bg-canvas/95 px-1 py-1 text-[13px] font-semibold text-ink backdrop-blur">
                {longDayLabel(g.day)}
                {g.day === today ? <span className="ml-2 rounded-full bg-chestnut px-2 py-0.5 text-2xs text-surface">Aujourd'hui</span> : null}
              </h3>
            ) : null}
            <ul className="divide-y divide-line overflow-hidden rounded-card border border-line bg-surface">
              {g.posts.map((p) => (
                <li key={p.id}>
                  <ListRow post={p} asset={assets[p.assetIds[0]]} count={p.assetIds.length} onOpen={onOpen} />
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </section>
  );
}

function ListRow({ post, asset, count, onOpen }: { post: ScheduledPost; asset: Asset | undefined; count: number; onOpen: (p: ScheduledPost) => void }) {
  const movable = post.status !== "published" && post.status !== "publishing";
  return (
    <button
      type="button"
      onClick={() => onOpen(post)}
      aria-label={postAriaLabel(post)}
      draggable={movable}
      onDragStart={(e) => {
        e.dataTransfer.setData(DRAG_POST_MIME, post.id);
        e.dataTransfer.effectAllowed = "move";
      }}
      className="flex w-full items-start gap-3 px-3 py-2.5 text-left transition-colors duration-fast hover:bg-hover sm:items-center sm:px-4"
    >
      <span className="relative">
        <Thumb asset={asset} className="h-12 w-10" rounded="rounded-md" />
        {count > 1 ? <span className="absolute -bottom-1 -right-1 rounded-full bg-ink px-1 text-[9.5px] font-bold text-surface">{count}</span> : null}
      </span>
      {post.scheduledFor ? <span className="hidden w-12 shrink-0 text-[13px] font-semibold tabular-nums text-ink sm:block">{zoned(post.scheduledFor).time}</span> : null}
      <span className="min-w-0 flex-1">
        <span className="flex items-center gap-2">
          <span className="flex min-w-0 flex-1 flex-wrap items-center gap-x-2 gap-y-0.5 text-[12px] text-muted">
            {post.scheduledFor ? <span className="font-semibold tabular-nums text-ink sm:hidden">{zoned(post.scheduledFor).time}</span> : null}
            {post.targets.length ? (
              post.targets.map((t) => (
                <span key={t.accountId} className="inline-flex items-center gap-1">
                  <PlatformGlyph platform={t.platform} className="h-3.5 w-3.5 text-ink" />
                  {t.username ? `@${t.username}` : null}
                </span>
              ))
            ) : (
              <span>Aucun compte choisi</span>
            )}
          </span>
          <StatusBadge post={post} className="sm:hidden" />
        </span>
        <span className="mt-0.5 line-clamp-2 text-[13.5px] leading-snug text-ink">{captionExcerpt(post.caption, 160) || <span className="text-muted">Sans légende</span>}</span>
        {post.error ? <span className="mt-0.5 line-clamp-1 text-[12px] text-terracotta">{post.error}</span> : null}
      </span>
      <StatusBadge post={post} className="hidden sm:inline-flex" />
    </button>
  );
}
