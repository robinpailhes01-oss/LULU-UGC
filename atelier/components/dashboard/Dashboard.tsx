"use client";

import { ClientScopeChip } from "@/components/clients/ClientScopeChip";
import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowRight, Brush, CalendarDays, Clapperboard, FolderOpen, HardDrive, Library, MessageSquareText, Sparkles, Tags, Upload, Wand2 } from "lucide-react";
import { MediaThumb } from "@/components/cleanup/MediaThumb";
import { useUploads } from "@/components/library/UploadProvider";
import { useScreenContext, useShell } from "@/components/shell/ShellContext";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Dialog } from "@/components/ui/Dialog";
import { cx } from "@/components/ui/cx";
import { useResource } from "@/lib/client/use-resource";
import { dimensions, formatBytes, formatDate, formatDuration, formatRelative, formatTime, plural } from "@/lib/shared/format";
import { MONTAGE_STATUS_LABEL, PLATFORM_LABEL, POST_STATUS_LABEL } from "@/lib/shared/labels";
import type { ActivityItem, Asset, Montage, MontageStatus, PostStatus, ScheduledPost } from "@/lib/shared/types";
import type { DashboardPayload } from "@/lib/server/services/stats";

const SORT_PROMPT = "Analyse les médias non triés, tague-les et range-les dans les bons dossiers";

/** Page d'accueil : salutation, raccourcis et l'état de l'atelier en un coup d'œil. */
export function Dashboard() {
  useScreenContext({ page: "tableau-de-bord" });
  const { actor, askAgent, setAgentOpen } = useShell();
  const { pickFiles } = useUploads();
  const stats = useResource<DashboardPayload>("/api/stats", ["assets", "stats", "posts", "montages", "cleanup", "skills", "folders"]);
  const [now, setNow] = useState<Date | null>(null);
  const [preview, setPreview] = useState<Asset | null>(null);
  useEffect(() => setNow(new Date()), []);

  const hello = now && (now.getHours() >= 18 || now.getHours() < 4) ? "Bonsoir" : "Bonjour";
  const dateLine = now ? new Intl.DateTimeFormat("fr-FR", { weekday: "long", day: "numeric", month: "long" }).format(now) : "";
  const d = stats.data;

  return (
    <div className="mx-auto max-w-[1240px] px-4 pb-16 pt-6 sm:px-6 lg:px-8">
      <header className="flex flex-wrap items-end justify-between gap-x-8 gap-y-5">
        <div className="min-w-0">
          <p className="label-eyebrow min-h-4 first-letter:uppercase">{dateLine}</p>
          <h1 className="mt-1.5 font-display text-[2.1rem] font-[340] leading-[1.05] tracking-[-0.02em] text-ink sm:text-[2.5rem]" style={{ fontVariationSettings: "'opsz' 144, 'SOFT' 30" }}>
            {hello}
            {actor ? (
              <>
                {" "}
                <em className="font-[380] text-chestnut">{actor}</em>
              </>
            ) : null}
          </h1>
          <div className="mt-2.5 flex flex-wrap items-center gap-x-3 gap-y-2">
            <ClientScopeChip />
            <p className="text-[13.5px] text-muted">{d ? summaryLine(d) : <span className="skeleton inline-block h-4 w-64 align-middle" />}</p>
          </div>
        </div>
        <nav aria-label="Raccourcis" className="flex w-full flex-wrap gap-2 sm:w-auto">
          <Button variant="primary" icon={<Upload className="h-4 w-4" />} onClick={() => pickFiles(null)}>
            Importer
          </Button>
          <Link href="/montage?nouveau=1" className={linkButton}>
            <Clapperboard className="h-4 w-4" aria-hidden />
            Nouveau montage
          </Link>
          <Link href="/programmation?nouveau=1" className={linkButton}>
            <CalendarDays className="h-4 w-4" aria-hidden />
            Programmer
          </Link>
          <Button variant="secondary" icon={<MessageSquareText className="h-4 w-4" />} onClick={() => setAgentOpen(true)}>
            Demander à l&apos;agent
          </Button>
        </nav>
      </header>

      {stats.error && !d ? (
        <div role="alert" className="mt-8 flex flex-wrap items-center justify-between gap-3 rounded-card border border-terracotta/30 bg-terracotta-soft/60 px-4 py-3 text-[13.5px] text-terracotta">
          <span>Le tableau de bord n&apos;a pas pu se charger : {stats.error}</span>
          <Button size="sm" onClick={() => void stats.reload()}>
            Réessayer
          </Button>
        </div>
      ) : null}

      <div className="mt-8 grid grid-cols-1 gap-4 md:grid-cols-3">
        {/* Chiffres clés */}
        <StatCard
          icon={<Tags className="h-4 w-4" />}
          title="À trier"
          loading={!d}
          value={d ? d.untagged.toLocaleString("fr-FR") : ""}
          caption={d ? (d.untagged > 0 ? `${d.untagged > 1 ? "médias" : "média"} sans mot-clé ni analyse` : "Tout est tagué et rangé") : ""}
          action={
            d && d.untagged > 0 ? (
              <Button size="sm" variant="accent" icon={<Sparkles className="h-3.5 w-3.5" />} onClick={() => askAgent(SORT_PROMPT)}>
                Trier avec l&apos;agent
              </Button>
            ) : null
          }
        />
        <StatCard
          icon={<Brush className="h-4 w-4" />}
          title="Ménage"
          loading={!d}
          value={d ? d.cleanupCandidates.toLocaleString("fr-FR") : ""}
          caption={d ? (d.cleanupCandidates > 0 ? `${d.cleanupCandidates > 1 ? "suggestions" : "suggestion"} · ${formatBytes(d.cleanupBytes)} récupérables` : "Aucun doublon ni photo ratée en vue") : ""}
          action={
            <Link href="/menage" className={smallLink}>
              {d && d.cleanupCandidates > 0 ? "Faire le ménage" : "Voir le ménage"}
              <ArrowRight className="h-3.5 w-3.5" aria-hidden />
            </Link>
          }
        />
        <StatCard
          icon={<HardDrive className="h-4 w-4" />}
          title="Stockage"
          loading={!d}
          value={d ? formatBytes(d.bytes) : ""}
          caption={
            d
              ? [plural(d.photos, "photo"), plural(d.videos, "vidéo"), d.audio ? plural(d.audio, "son") : null].filter(Boolean).join(" · ")
              : ""
          }
          action={
            d && d.trashed > 0 ? (
              <Link href="/corbeille" className={smallLink}>
                {plural(d.trashed, "média")} dans la corbeille
                <ArrowRight className="h-3.5 w-3.5" aria-hidden />
              </Link>
            ) : null
          }
        />

        {/* Colonne principale */}
        <div className="flex min-w-0 flex-col gap-4 md:col-span-2">
          <Card title="Cette semaine" icon={<CalendarDays className="h-4 w-4" />} href="/programmation" hrefLabel="Ouvrir la programmation">
            {!d ? <ListSkeleton rows={3} /> : d.upcomingPosts.length === 0 ? <EmptyWeek /> : <PostList posts={d.upcomingPosts} />}
          </Card>
          <Card title="Derniers imports" icon={<FolderOpen className="h-4 w-4" />} href="/mediatheque/recents" hrefLabel="Tous les récents">
            {!d ? (
              <div className="grid grid-cols-3 gap-2 sm:grid-cols-6">
                {Array.from({ length: 12 }, (_, i) => (
                  <div key={i} className="skeleton aspect-square rounded-lg" />
                ))}
              </div>
            ) : d.recentAssets.length === 0 ? (
              <p className="flex flex-wrap items-center gap-x-3 gap-y-2 py-4 text-[13.5px] text-muted">
                Aucun média pour l&apos;instant.
                <Button size="sm" icon={<Upload className="h-3.5 w-3.5" />} onClick={() => pickFiles(null)}>
                  Importer des photos et vidéos
                </Button>
              </p>
            ) : (
              <ul className="grid grid-cols-3 gap-2 sm:grid-cols-6">
                {d.recentAssets.slice(0, 12).map((a) => (
                  <li key={a.id}>
                    <button
                      type="button"
                      onClick={() => setPreview(a)}
                      className="block w-full overflow-hidden rounded-lg outline-none ring-offset-2 ring-offset-surface transition-transform duration-fast hover:scale-[1.02] focus-visible:ring-2 focus-visible:ring-chestnut"
                      aria-label={`Aperçu de « ${a.ai?.title ?? a.name} »`}
                      title={a.ai?.title ?? a.name}
                    >
                      <MediaThumb asset={a} className="aspect-square w-full" />
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </div>

        {/* Colonne latérale */}
        <div className="flex min-w-0 flex-col gap-4">
          <Card title="Montages" icon={<Clapperboard className="h-4 w-4" />} href="/montage" hrefLabel="Tous les montages">
            {!d ? <ListSkeleton rows={2} /> : d.montages.length === 0 ? <EmptyMontages /> : <MontageList montages={d.montages} />}
          </Card>
          <Card title="Activité de l'équipe" icon={<Wand2 className="h-4 w-4" />}>
            {!d ? <ListSkeleton rows={5} /> : d.activity.length === 0 ? <p className="py-2 text-[13px] text-muted">Rien encore : les imports, retouches et publications apparaîtront ici.</p> : <ActivityFeed items={d.activity} />}
          </Card>
        </div>
      </div>

      <PreviewDialog asset={preview} onClose={() => setPreview(null)} />
    </div>
  );
}

const linkButton =
  "inline-flex h-9 select-none items-center justify-center gap-2 whitespace-nowrap rounded-full border border-line-strong bg-surface px-3.5 text-[13.5px] font-semibold text-ink transition-colors duration-fast hover:bg-hover";
const smallLink = "inline-flex items-center gap-1 text-[12.5px] font-semibold text-chestnut underline-offset-2 hover:underline";

function summaryLine(d: DashboardPayload): string {
  const parts: string[] = [];
  const week = d.upcomingPosts.filter((p) => p.status === "scheduled" || p.status === "publishing").length;
  parts.push(week > 0 ? `${plural(week, "publication")} programmée${week > 1 ? "s" : ""} cette semaine` : "Aucune publication programmée cette semaine");
  if (d.untagged > 0) parts.push(`${plural(d.untagged, "média")} à trier`);
  if (d.cleanupCandidates > 0) parts.push(`${formatBytes(d.cleanupBytes)} à libérer`);
  return parts.join(" · ");
}

// ---------------------------------------------------------------------------------------------
// Cartes

function Card({ title, icon, href, hrefLabel, children, className }: { title: string; icon: React.ReactNode; href?: string; hrefLabel?: string; children: React.ReactNode; className?: string }) {
  const id = `card-${title.toLowerCase().replace(/[^a-z]+/g, "-")}`;
  return (
    <section aria-labelledby={id} className={cx("min-w-0 rounded-card border border-line bg-surface p-4 sm:p-5", className)}>
      <div className="mb-3 flex items-center justify-between gap-3">
        <h2 id={id} className="flex items-center gap-2 text-[14px] font-semibold text-ink">
          <span className="flex h-7 w-7 items-center justify-center rounded-full bg-sunken text-chestnut" aria-hidden>
            {icon}
          </span>
          {title}
        </h2>
        {href ? (
          <Link href={href} className={smallLink}>
            {hrefLabel}
            <ArrowRight className="h-3.5 w-3.5" aria-hidden />
          </Link>
        ) : null}
      </div>
      {children}
    </section>
  );
}

function StatCard({ icon, title, value, caption, action, loading }: { icon: React.ReactNode; title: string; value: string; caption: string; action?: React.ReactNode; loading: boolean }) {
  return (
    <section className="flex min-w-0 flex-col rounded-card border border-line bg-surface p-4 sm:p-5" aria-label={title}>
      <h2 className="flex items-center gap-2 text-[13px] font-semibold text-muted">
        <span className="text-chestnut" aria-hidden>
          {icon}
        </span>
        {title}
      </h2>
      {loading ? (
        <>
          <div className="skeleton mt-3 h-8 w-20" />
          <div className="skeleton mt-2 h-3.5 w-44" />
        </>
      ) : (
        <>
          <p className="mt-2 font-display text-[2rem] font-[360] leading-none tracking-[-0.02em] text-ink tabular-nums" style={{ fontVariationSettings: "'opsz' 96, 'SOFT' 30" }}>
            {value}
          </p>
          <p className="mt-1.5 text-[12.5px] text-muted">{caption}</p>
        </>
      )}
      {action ? <div className="mt-auto pt-3">{action}</div> : null}
    </section>
  );
}

function ListSkeleton({ rows }: { rows: number }) {
  return (
    <ul className="space-y-3" aria-hidden>
      {Array.from({ length: rows }, (_, i) => (
        <li key={i} className="flex items-center gap-3">
          <div className="skeleton h-11 w-11 shrink-0 rounded-lg" />
          <div className="flex-1 space-y-1.5">
            <div className="skeleton h-3.5 w-3/5" />
            <div className="skeleton h-3 w-2/5" />
          </div>
        </li>
      ))}
    </ul>
  );
}

// ---------------------------------------------------------------------------------------------
// Publications

const POST_TONE: Record<PostStatus, "neutral" | "plum" | "honey" | "olive" | "terracotta"> = {
  draft: "neutral",
  scheduled: "plum",
  publishing: "honey",
  published: "olive",
  failed: "terracotta",
  cancelled: "neutral",
};

function EmptyWeek() {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl bg-canvas px-4 py-5">
      <div>
        <p className="font-display text-[1.1rem] text-ink">Rien de programmé</p>
        <p className="mt-0.5 text-[12.5px] text-muted">Les publications des 7 prochains jours apparaîtront ici.</p>
      </div>
      <Link href="/programmation?nouveau=1" className={linkButton}>
        <CalendarDays className="h-4 w-4" aria-hidden />
        Programmer une publication
      </Link>
    </div>
  );
}

function dayLabel(iso: string): string {
  const d = new Date(iso);
  const today = new Date();
  const tomorrow = new Date(today.getTime() + 86_400_000);
  if (d.toDateString() === today.toDateString()) return "Aujourd'hui";
  if (d.toDateString() === tomorrow.toDateString()) return "Demain";
  const s = new Intl.DateTimeFormat("fr-FR", { weekday: "short", day: "numeric", month: "short" }).format(d);
  return s.charAt(0).toUpperCase() + s.slice(1);
}

function PostList({ posts }: { posts: ScheduledPost[] }) {
  return (
    <ul className="divide-y divide-line">
      {posts.map((p) => (
        <li key={p.id}>
          <Link href="/programmation" className="-mx-2 flex items-center gap-3 rounded-lg px-2 py-2.5 hover:bg-hover">
            <span className="h-12 w-12 shrink-0 overflow-hidden rounded-lg bg-sunken">
              {p.assetIds[0] ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={`/api/media/${p.assetIds[0]}/thumb`} alt="" className="h-full w-full object-cover" onError={(e) => ((e.target as HTMLImageElement).style.visibility = "hidden")} />
              ) : null}
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-[12.5px] font-semibold text-ink">
                {p.scheduledFor ? `${dayLabel(p.scheduledFor)} · ${formatTime(p.scheduledFor)}` : "Sans date"}
              </span>
              <span className="block truncate text-[12.5px] text-muted">{p.caption || "Sans légende"}</span>
              <span className="block truncate text-2xs text-faint">{p.targets.map((t) => (t.username ? `@${t.username}` : PLATFORM_LABEL[t.platform] ?? t.platform)).join(" · ") || "Aucun compte"}</span>
            </span>
            <Badge tone={POST_TONE[p.status]}>{POST_STATUS_LABEL[p.status]}</Badge>
          </Link>
        </li>
      ))}
    </ul>
  );
}

// ---------------------------------------------------------------------------------------------
// Montages

const MONTAGE_TONE: Record<MontageStatus, "neutral" | "honey" | "olive" | "terracotta"> = { draft: "neutral", rendering: "honey", rendered: "olive", failed: "terracotta" };

function EmptyMontages() {
  return (
    <div className="rounded-xl bg-canvas px-4 py-5">
      <p className="font-display text-[1.1rem] text-ink">Aucun montage en cours</p>
      <p className="mt-0.5 text-[12.5px] text-muted">Assemblez quelques plans, l&apos;agent peut proposer un premier jet.</p>
      <Link href="/montage?nouveau=1" className={cx(smallLink, "mt-3")}>
        Nouveau montage
        <ArrowRight className="h-3.5 w-3.5" aria-hidden />
      </Link>
    </div>
  );
}

function MontageList({ montages }: { montages: Montage[] }) {
  return (
    <ul className="divide-y divide-line">
      {montages.map((m) => {
        const first = m.spec.clips[0]?.assetId;
        const progress = m.status === "rendering" && m.render?.progress != null ? ` · ${Math.round(m.render.progress * 100)} %` : "";
        return (
          <li key={m.id}>
            <Link href={`/montage/${m.id}`} className="-mx-2 flex items-center gap-3 rounded-lg px-2 py-2.5 hover:bg-hover">
              <span className="h-12 w-9 shrink-0 overflow-hidden rounded-md bg-sunken">
                {first ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={`/api/media/${first}/thumb`} alt="" className="h-full w-full object-cover" onError={(e) => ((e.target as HTMLImageElement).style.visibility = "hidden")} />
                ) : null}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-[13px] font-semibold text-ink">{m.title || "Sans titre"}</span>
                <span className="block text-2xs text-faint">
                  {m.spec.format}
                  {m.durationS ? ` · ${formatDuration(m.durationS)}` : ""} · {formatRelative(m.updatedAt)}
                </span>
              </span>
              <Badge tone={MONTAGE_TONE[m.status]}>
                {m.status === "rendered" ? "Prêt à publier" : MONTAGE_STATUS_LABEL[m.status]}
                {progress}
              </Badge>
            </Link>
          </li>
        );
      })}
    </ul>
  );
}

// ---------------------------------------------------------------------------------------------
// Activité

function initials(name: string | null): string {
  if (!name) return "A";
  return name
    .split(/[\s-]+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]!.toUpperCase())
    .join("");
}

const AVATAR_TONES = ["bg-honey-soft text-[#7a5220]", "bg-olive-soft text-olive", "bg-plum-soft text-plum", "bg-terracotta-soft text-terracotta", "bg-select text-chestnut"];
function avatarTone(name: string | null): string {
  if (!name) return "bg-sunken text-muted";
  let h = 0;
  for (const c of name) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  return AVATAR_TONES[h % AVATAR_TONES.length];
}

function activityHref(item: ActivityItem): string | null {
  if (item.verb.includes("skill") && item.objectId) return `/skills/${encodeURIComponent(item.objectId)}`;
  if (item.objectType === "montage" && item.objectId) return `/montage/${item.objectId}`;
  if (item.objectType === "post") return "/programmation";
  if (item.objectType === "folder" && item.objectId) return `/mediatheque/dossier/${item.objectId}`;
  return null;
}

/** Regroupe les actions successives identiques (un import de 30 fichiers = une ligne). */
function collapse(items: ActivityItem[]): (ActivityItem & { more: number })[] {
  const out: (ActivityItem & { more: number })[] = [];
  for (const it of items) {
    const last = out[out.length - 1];
    if (
      last &&
      last.actor === it.actor &&
      last.verb === it.verb &&
      last.objectType === it.objectType &&
      !it.verb.includes("skill") &&
      Math.abs(new Date(last.createdAt).getTime() - new Date(it.createdAt).getTime()) < 30 * 60_000
    ) {
      last.more += 1;
      continue;
    }
    out.push({ ...it, more: 0 });
  }
  return out;
}

function ActivityFeed({ items }: { items: ActivityItem[] }) {
  return (
    <ol className="space-y-3">
      {collapse(items).slice(0, 8).map((it) => {
        const href = activityHref(it);
        const isSkill = it.verb.includes("skill");
        const text = (
          <>
            <span className="font-semibold text-ink">{it.actor ?? "L'atelier"}</span> {it.verb} <span className="text-ink">{it.summary}</span>
            {it.more > 0 ? ` et ${plural(it.more, "autre")}` : null}
          </>
        );
        return (
          <li key={it.id} className="flex items-start gap-2.5">
            <span className={cx("mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-2xs font-bold", avatarTone(it.actor))} aria-hidden>
              {initials(it.actor)}
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-[12.5px] leading-snug text-muted">
                {href ? (
                  <Link href={href} className="hover:underline">
                    {text}
                  </Link>
                ) : (
                  text
                )}
              </p>
              <p className="mt-0.5 flex items-center gap-1.5 text-2xs text-faint">
                {isSkill ? (
                  <Badge tone="honey" className="!px-1.5 !py-0">
                    <Library className="h-2.5 w-2.5" aria-hidden />
                    Skill
                  </Badge>
                ) : null}
                <time dateTime={it.createdAt} title={formatDate(it.createdAt)}>
                  {formatRelative(it.createdAt)}
                </time>
              </p>
            </div>
          </li>
        );
      })}
    </ol>
  );
}

// ---------------------------------------------------------------------------------------------
// Aperçu d'un import récent

function PreviewDialog({ asset, onClose }: { asset: Asset | null; onClose: () => void }) {
  const { folders } = useShell();
  const folder = asset?.folderId ? folders.find((f) => f.id === asset.folderId) : null;
  return (
    <Dialog
      open={asset !== null}
      onClose={onClose}
      dark
      size="xl"
      title={asset ? (asset.ai?.title ?? asset.name) : ""}
      description={asset ? [dimensions(asset.width, asset.height), formatBytes(asset.sizeBytes), `importé ${formatRelative(asset.createdAt)}`].filter(Boolean).join(" · ") : undefined}
      footer={
        asset ? (
          <>
            {asset.kind === "photo" ? (
              <Link href={`/retouche/${asset.id}`} className="inline-flex h-9 items-center gap-2 rounded-full px-3.5 text-[13.5px] font-semibold text-surface hover:bg-white/10">
                <Wand2 className="h-4 w-4" aria-hidden />
                Retoucher
              </Link>
            ) : null}
            <Link href={asset.folderId ? `/mediatheque/dossier/${asset.folderId}` : "/mediatheque"} className="inline-flex h-9 items-center gap-2 rounded-full bg-surface px-4 text-[13.5px] font-semibold text-ink hover:bg-canvas">
              <FolderOpen className="h-4 w-4" aria-hidden />
              {folder ? `Ouvrir « ${folder.name} »` : "Ouvrir la médiathèque"}
            </Link>
          </>
        ) : null
      }
    >
      {asset ? (
        <div className="flex h-[min(70vh,720px)] items-center justify-center bg-night p-2">
          {asset.kind === "video" ? (
            <video src={asset.urls.original} poster={asset.urls.poster ?? undefined} controls playsInline className="max-h-full max-w-full" />
          ) : asset.kind === "photo" ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={asset.urls.original} alt={asset.ai?.alt ?? asset.name} className="max-h-full max-w-full object-contain" />
          ) : (
            <audio src={asset.urls.original} controls />
          )}
        </div>
      ) : null}
    </Dialog>
  );
}
