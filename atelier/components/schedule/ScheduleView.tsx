"use client";

import Link from "next/link";
import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { CalendarDays, ChevronLeft, ChevronRight, Plus, RefreshCw, RotateCw, TriangleAlert } from "lucide-react";
import { Button, IconButton } from "@/components/ui/Button";
import { cx } from "@/components/ui/cx";
import { EmptyState } from "@/components/ui/EmptyState";
import { useToast } from "@/components/ui/Toast";
import { useScreenContext } from "@/components/shell/ShellContext";
import { ListView, MonthView, WeekView } from "@/components/schedule/CalendarViews";
import { Composer, type ComposerInitial } from "@/components/schedule/Composer";
import { Segmented } from "@/components/schedule/controls";
import { LEGEND, STATUS_STYLE } from "@/components/schedule/status";
import { addDays, addMonths, dayRangeIso, isWeekend, monthGrid, monthLabel, monthName, startOfWeek, todayDay, weekLabel, whenLabel, zoned, zonedToIso } from "@/components/schedule/dates";
import { DRAG_POST_MIME, Thumb, captionExcerpt, type AccountsResponse, type PostsResponse } from "@/components/schedule/shared";
import { PlatformGlyphs } from "@/components/schedule/PlatformGlyph";
import { api, errorMessage } from "@/lib/client/api";
import { emitRefresh } from "@/lib/client/refresh";
import { useResource } from "@/lib/client/use-resource";
import { POST_STATUS_LABEL } from "@/lib/shared/labels";
import type { ScheduledPost } from "@/lib/shared/types";

type View = "month" | "week" | "list";
const VIEW_KEY = "atelier:programmation-vue";
const SYNC_MS = 60_000;

/** Écran /programmation : calendrier (mois, semaine, liste), brouillons, compositeur. */
export function ScheduleView() {
  return (
    <Suspense fallback={<ScreenSkeleton />}>
      <ScheduleScreen />
    </Suspense>
  );
}

function ScreenSkeleton() {
  return (
    <div className="mx-auto max-w-[1440px] px-4 pb-16 pt-6 sm:px-6 lg:px-8" aria-hidden>
      <div className="skeleton h-8 w-48" />
      <div className="skeleton mt-6 h-[560px] w-full rounded-card" />
    </div>
  );
}

interface ComposerState {
  open: boolean;
  post: ScheduledPost | null;
  initial: ComposerInitial | null;
  key: number;
}

function ScheduleScreen() {
  const router = useRouter();
  const sp = useSearchParams();
  const toast = useToast();
  const [view, setViewState] = useState<View>("month");
  const [anchor, setAnchor] = useState(() => todayDay());
  const [today, setToday] = useState(() => todayDay());
  const [composer, setComposer] = useState<ComposerState>({ open: false, post: null, initial: null, key: 0 });
  const [syncing, setSyncing] = useState(false);

  // Vue mémorisée (liste par défaut sur téléphone).
  useEffect(() => {
    try {
      const v = window.localStorage.getItem(VIEW_KEY) as View | null;
      if (v === "month" || v === "week" || v === "list") setViewState(v);
      else if (window.innerWidth < 640) setViewState("list");
    } catch {
      /* stockage indisponible */
    }
  }, []);
  const setView = useCallback((v: View) => {
    setViewState(v);
    try {
      window.localStorage.setItem(VIEW_KEY, v);
    } catch {
      /* stockage indisponible */
    }
  }, []);

  useEffect(() => {
    const t = window.setInterval(() => setToday(todayDay()), 60_000);
    return () => window.clearInterval(t);
  }, []);

  // Intervalle chargé selon la vue.
  const range = useMemo(() => {
    if (view === "month") {
      const g = monthGrid(anchor);
      return dayRangeIso(g[0], g[g.length - 1]);
    }
    if (view === "week") {
      const s = startOfWeek(anchor);
      return dayRangeIso(s, addDays(s, 6));
    }
    return dayRangeIso(addDays(today, -60), addDays(today, 180));
  }, [view, anchor, today]);
  const posts = useResource<PostsResponse>(`/api/posts?from=${encodeURIComponent(range.from)}&to=${encodeURIComponent(range.to)}&drafts=1`, ["posts"]);
  const accounts = useResource<AccountsResponse>("/api/social/accounts", []);
  const configured = accounts.data?.configured ?? false;
  const rules = accounts.data?.rules;

  const all = useMemo(() => posts.data?.posts ?? [], [posts.data]);
  const assets = useMemo(() => posts.data?.assets ?? {}, [posts.data]);
  const dated = useMemo(() => all.filter((p) => p.scheduledFor), [all]);
  const drafts = useMemo(() => all.filter((p) => !p.scheduledFor), [all]);
  const failed = dated.filter((p) => p.status === "failed");

  useScreenContext({ page: "programmation", postId: composer.open ? composer.post?.id ?? null : null });

  // --- compositeur ----------------------------------------------------------------------------
  const openNew = useCallback((initial: ComposerInitial = {}) => setComposer((c) => ({ open: true, post: null, initial, key: c.key + 1 })), []);
  const openPost = useCallback((post: ScheduledPost, initial: ComposerInitial | null = null) => setComposer((c) => ({ open: true, post, initial, key: c.key + 1 })), []);
  const close = useCallback(() => setComposer((c) => ({ ...c, open: false })), []);

  // Liens profonds : ?nouveau=1&assets=a,b&date=AAAA-MM-JJ, ?post=<id>
  const handledLink = useRef<string | null>(null);
  useEffect(() => {
    const key = sp.toString();
    if (!key || handledLink.current === key) return;
    handledLink.current = key;
    const date = sp.get("date");
    const validDate = date && /^\d{4}-\d{2}-\d{2}$/.test(date) ? date : null;
    if (sp.get("nouveau") === "1") {
      const ids = (sp.get("assets") ?? "").split(",").filter((s) => /^[0-9a-f-]{36}$/i.test(s));
      openNew({ day: validDate, assetIds: ids });
      if (validDate) setAnchor(validDate);
    } else if (sp.get("post")) {
      api
        .get<{ post: ScheduledPost }>(`/api/posts/${encodeURIComponent(sp.get("post")!)}`)
        .then(({ post }) => {
          if (post.scheduledFor) setAnchor(zoned(post.scheduledFor).day);
          openPost(post);
        })
        .catch((err) => toast(errorMessage(err), { tone: "error" }));
    } else if (validDate) setAnchor(validDate);
    router.replace("/programmation", { scroll: false });
  }, [sp, router, openNew, openPost, toast]);

  const onDone = useCallback(
    (post: ScheduledPost | null, message: string) => {
      close();
      emitRefresh("posts", "stats");
      toast(message, { durationMs: message.length > 80 ? 7000 : 4000 });
      if (post?.scheduledFor && view !== "list") setAnchor(zoned(post.scheduledFor).day);
    },
    [close, toast, view],
  );

  // --- synchronisation avec Zernio ------------------------------------------------------------
  const sync = useCallback(
    async (manual: boolean) => {
      if (manual) setSyncing(true);
      try {
        const r = await api.post<{ configured: boolean; updated: number }>("/api/posts/sync");
        if (r.updated > 0) emitRefresh("posts", "stats");
        if (manual) toast(r.updated ? `${r.updated} publication${r.updated > 1 ? "s" : ""} mise${r.updated > 1 ? "s" : ""} à jour.` : "Tout est à jour.");
      } catch (err) {
        if (manual) toast(`Synchronisation impossible : ${errorMessage(err)}`, { tone: "error" });
      } finally {
        if (manual) setSyncing(false);
      }
    },
    [toast],
  );
  useEffect(() => {
    if (!configured) return;
    void sync(false);
    const t = window.setInterval(() => {
      if (document.visibilityState === "visible") void sync(false);
    }, SYNC_MS);
    const onVisible = () => document.visibilityState === "visible" && void sync(false);
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      window.clearInterval(t);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [configured, sync]);

  // --- création et glisser-déposer ------------------------------------------------------------
  const onCreate = useCallback(
    (day: string, time?: string) => {
      if (day < today) {
        toast("Ce jour est passé : choisissez une date à venir.", { tone: "info" });
        return;
      }
      openNew({ day, time: time ?? null });
    },
    [today, openNew, toast],
  );

  const onDropPost = useCallback(
    async (id: string, day: string, time?: string) => {
      const post = all.find((p) => p.id === id);
      if (!post) return;
      if (day < today) {
        toast("Ce jour est passé : choisissez une date à venir.", { tone: "info" });
        return;
      }
      const keepTime = time ?? (post.scheduledFor ? zoned(post.scheduledFor).time : rules ? (isWeekend(day) ? rules.defaultTime.weekend : rules.defaultTime.weekday) : "18:00");
      // Un brouillon se programme dans le compositeur (vérification et confirmation).
      if (post.status === "draft" || post.status === "cancelled") {
        openPost(post, { day, time: keepTime });
        return;
      }
      if (post.status !== "scheduled" && post.status !== "failed") return;
      const before = post.scheduledFor;
      const iso = zonedToIso(day, keepTime);
      try {
        await api.patch<ScheduledPost>(`/api/posts/${id}`, { scheduledFor: iso });
        emitRefresh("posts", "stats");
        toast(`Déplacé ${whenLabel(iso)}.`, {
          durationMs: 8000,
          action: before
            ? {
                label: "Annuler",
                onClick: () => {
                  void api
                    .patch(`/api/posts/${id}`, { scheduledFor: before })
                    .then(() => emitRefresh("posts", "stats"))
                    .catch((err) => toast(errorMessage(err), { tone: "error" }));
                },
              }
            : undefined,
        });
      } catch (err) {
        toast(errorMessage(err), { tone: "error" });
      }
    },
    [all, today, rules, openPost, toast],
  );

  // --- navigation -----------------------------------------------------------------------------
  const step = (dir: 1 | -1) => setAnchor((a) => (view === "week" ? addDays(a, 7 * dir) : addMonths(a, dir)));
  const periodLabel = view === "week" ? weekLabel(anchor) : view === "month" ? monthLabel(anchor) : "Toutes les publications";
  const monthCount = dated.filter((p) => p.status !== "cancelled" && p.status !== "draft").length;

  return (
    <div className="mx-auto max-w-[1440px] px-4 pb-16 pt-6 sm:px-6 lg:px-8">
      <header className="flex flex-wrap items-end justify-between gap-x-6 gap-y-4">
        <div className="min-w-0">
          <h1 className="page-title">Programmation</h1>
          <p className="mt-1 text-[13.5px] text-muted">
            {view === "list" ? "À venir puis passées, jour par jour" : `${monthCount} publication${monthCount > 1 ? "s" : ""} sur la période`}
            {rules?.postsPerWeek ? ` · rythme visé : ${rules.postsPerWeek.min} à ${rules.postsPerWeek.max} par semaine` : ""}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {configured ? (
            <IconButton label="Synchroniser avec Zernio" onClick={() => void sync(true)} disabled={syncing}>
              <RotateCw className={cx("h-4 w-4", syncing && "motion-safe:animate-spin")} />
            </IconButton>
          ) : null}
          <Button variant="primary" icon={<Plus className="h-4 w-4" />} onClick={() => openNew({ day: null })}>
            Nouvelle publication
          </Button>
        </div>
      </header>

      {accounts.data && !configured ? (
        <div className="mt-4 flex flex-wrap items-center gap-x-3 gap-y-1 rounded-xl bg-honey-soft px-3.5 py-2.5 text-[13px] text-[#6d4a1d]" role="status">
          <TriangleAlert className="h-4 w-4 shrink-0" aria-hidden />
          <span className="flex-1">Zernio n'est pas connecté : les publications restent en brouillon. Le calendrier fonctionne normalement.</span>
          <Link href="/reglages" className="font-semibold underline underline-offset-2">
            Ouvrir les réglages
          </Link>
        </div>
      ) : null}
      {accounts.data?.error ? (
        <p className="mt-4 rounded-xl bg-terracotta-soft px-3.5 py-2.5 text-[13px] text-[#7f341d]" role="status">
          Comptes Zernio indisponibles : {accounts.data.error}
        </p>
      ) : null}
      {failed.length ? (
        <div className="mt-4 flex flex-wrap items-center gap-x-3 gap-y-1 rounded-xl bg-terracotta-soft px-3.5 py-2.5 text-[13px] text-[#7f341d]" role="status">
          <TriangleAlert className="h-4 w-4 shrink-0" aria-hidden />
          <span className="flex-1">
            {failed.length} publication{failed.length > 1 ? "s" : ""} en échec sur la période.
          </span>
          <button type="button" className="font-semibold underline underline-offset-2" onClick={() => openPost(failed[0])}>
            Voir
          </button>
        </div>
      ) : null}

      <div className="mt-5 flex flex-wrap items-center gap-x-3 gap-y-3">
        {view !== "list" ? (
          <div className="flex items-center gap-1">
            <IconButton label={view === "week" ? "Semaine précédente" : "Mois précédent"} onClick={() => step(-1)}>
              <ChevronLeft className="h-4 w-4" />
            </IconButton>
            <Button size="sm" variant="secondary" onClick={() => setAnchor(todayDay())}>
              Aujourd'hui
            </Button>
            <IconButton label={view === "week" ? "Semaine suivante" : "Mois suivant"} onClick={() => step(1)}>
              <ChevronRight className="h-4 w-4" />
            </IconButton>
          </div>
        ) : null}
        <h2 className="min-w-0 text-[17px] font-semibold first-letter:uppercase" aria-live="polite">
          {periodLabel}
        </h2>
        <div className="ml-auto flex items-center gap-3">
          <ul className="hidden items-center gap-3 text-2xs font-semibold text-muted xl:flex" aria-label="Légende des statuts">
            {LEGEND.map((s) => (
              <li key={s} className="inline-flex items-center gap-1.5">
                <span className={cx("h-2 w-2 rounded-full", STATUS_STYLE[s].dot)} aria-hidden />
                {POST_STATUS_LABEL[s]}
              </li>
            ))}
          </ul>
          <Segmented
            label="Affichage"
            value={view}
            onChange={setView}
            options={[
              { id: "month", label: "Mois" },
              { id: "week", label: "Semaine" },
              { id: "list", label: "Liste" },
            ]}
          />
        </div>
      </div>

      <div className={cx("mt-4", view !== "list" && "xl:grid xl:grid-cols-[minmax(0,1fr)_260px] xl:gap-5")}>
        <div className="min-w-0">
          {posts.error && !posts.data ? (
            <EmptyState
              icon={<CalendarDays className="h-6 w-6" />}
              title="Le calendrier n'a pas pu être chargé"
              action={
                <Button icon={<RefreshCw className="h-4 w-4" />} onClick={() => void posts.reload()}>
                  Réessayer
                </Button>
              }
            >
              {posts.error}
            </EmptyState>
          ) : view === "month" ? (
            <>
              <MonthView anchor={anchor} today={today} posts={dated} assets={assets} loading={posts.loading && !posts.data} onCreate={onCreate} onOpen={openPost} onDropPost={(id, d, t) => void onDropPost(id, d, t)} />
              {posts.data && dated.filter((p) => p.scheduledFor && zoned(p.scheduledFor).day.slice(0, 7) === anchor.slice(0, 7)).length === 0 ? (
                <p className="mt-3 text-center text-[13px] text-muted">Rien de programmé en {monthName(anchor)}. Choisissez un jour du calendrier ou créez une publication.</p>
              ) : null}
            </>
          ) : view === "week" ? (
            <WeekView anchor={anchor} today={today} posts={dated} assets={assets} loading={posts.loading && !posts.data} onCreate={onCreate} onOpen={openPost} onDropPost={(id, d, t) => void onDropPost(id, d, t)} />
          ) : (
            <ListView today={today} posts={dated} drafts={drafts} assets={assets} loading={posts.loading && !posts.data} onOpen={openPost} />
          )}
        </div>
        {view !== "list" ? <DraftsColumn drafts={drafts} assets={assets} loading={posts.loading && !posts.data} onOpen={openPost} /> : null}
      </div>

      <Composer
        key={composer.key}
        open={composer.open}
        onClose={close}
        post={composer.post}
        knownAssets={assets}
        initial={composer.initial}
        accounts={accounts.data}
        onReloadAccounts={() => {
          void api
            .get<AccountsResponse>("/api/social/accounts?refresh=1")
            .then((a) => accounts.mutate(a))
            .catch((err) => toast(errorMessage(err), { tone: "error" }));
        }}
        onDone={onDone}
        onDuplicate={(p) =>
          openNew({ day: null, assetIds: p.assetIds, caption: p.caption, firstComment: p.firstComment, targets: p.targets, options: { ...p.options, tiktokConsent: undefined } })
        }
      />
    </div>
  );
}

/** Colonne des brouillons sans date : glisser un brouillon sur un jour pour le programmer. */
function DraftsColumn({ drafts, assets, loading, onOpen }: { drafts: ScheduledPost[]; assets: PostsResponse["assets"]; loading: boolean; onOpen: (p: ScheduledPost) => void }) {
  return (
    <aside aria-labelledby="drafts-title" className="mt-6 xl:mt-0">
      <div className="rounded-card border border-line bg-surface p-3 xl:sticky xl:top-4">
        <h2 id="drafts-title" className="flex items-baseline justify-between px-1 text-[13px] font-semibold text-ink">
          Brouillons
          <span className="text-[12px] font-normal tabular-nums text-muted">{drafts.length}</span>
        </h2>
        <p className="mt-0.5 px-1 text-[12px] leading-snug text-muted">Glissez un brouillon sur un jour pour le programmer.</p>
        {loading ? (
          <div className="mt-3 space-y-2" aria-hidden>
            <span className="skeleton block h-14 w-full rounded-xl" />
            <span className="skeleton block h-14 w-full rounded-xl" />
          </div>
        ) : drafts.length === 0 ? (
          <p className="mt-3 rounded-xl border border-dashed border-line-strong px-3 py-4 text-center text-[12.5px] text-muted">Aucun brouillon.</p>
        ) : (
          <ul className="mt-3 grid max-h-[60vh] gap-1.5 overflow-y-auto pr-0.5 sm:grid-cols-2 xl:grid-cols-1">
            {drafts.map((d) => (
              <li key={d.id}>
                <DraftCard post={d} asset={assets[d.assetIds[0]]} onOpen={onOpen} />
              </li>
            ))}
          </ul>
        )}
      </div>
    </aside>
  );
}

function DraftCard({ post, asset, onOpen }: { post: ScheduledPost; asset: PostsResponse["assets"][string] | undefined; onOpen: (p: ScheduledPost) => void }) {
  const n = post.assetIds.length;
  return (
    <button
      type="button"
      draggable
      onDragStart={(e) => {
        e.dataTransfer.setData(DRAG_POST_MIME, post.id);
        e.dataTransfer.effectAllowed = "move";
      }}
      onClick={() => onOpen(post)}
      aria-label={`Brouillon : « ${captionExcerpt(post.caption, 50) || "sans légende"} », ${n} média${n > 1 ? "s" : ""}`}
      className="flex w-full cursor-grab items-start gap-2.5 rounded-xl border border-line bg-surface p-2 text-left transition-colors duration-fast hover:border-line-strong hover:bg-hover active:cursor-grabbing"
    >
      <Thumb asset={asset} className="h-12 w-10" rounded="rounded-md" />
      <span className="min-w-0 flex-1">
        <span className="line-clamp-2 text-[12.5px] leading-snug text-ink">{captionExcerpt(post.caption, 90) || <span className="text-muted">Sans légende</span>}</span>
        <span className="mt-0.5 flex items-center gap-1.5 text-[11.5px] text-muted">
          {n} média{n > 1 ? "s" : ""}
          {post.targets.length ? <PlatformGlyphs platforms={post.targets.map((t) => t.platform)} className="h-3 w-3" /> : null}
        </span>
      </span>
    </button>
  );
}
