"use client";

import Link from "next/link";
import { useState } from "react";
import { CalendarDays, Clock, Globe, Images, Plus, Users } from "lucide-react";
import { ClientAvatar } from "@/components/clients/ClientAvatar";
import { PlatformGlyph } from "@/components/schedule/PlatformGlyph";
import { useScreenContext, useShell } from "@/components/shell/ShellContext";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { cx } from "@/components/ui/cx";
import { EmptyState } from "@/components/ui/EmptyState";
import { useResource } from "@/lib/client/use-resource";
import { displayUrl, SOCIAL_LABEL } from "@/lib/shared/clients";
import { formatRelative, plural } from "@/lib/shared/format";
import type { ClientSummary } from "@/lib/shared/types";

/** Liste des clients de l'agence : cartes, archives, « Nouveau client ». */
export function ClientsView() {
  useScreenContext({ page: "clients" });
  const { client: current, setNewClientOpen } = useShell();
  const [archived, setArchived] = useState(false);
  const res = useResource<{ clients: ClientSummary[] }>(`/api/clients${archived ? "?archived=1" : ""}`, ["clients", "assets", "posts"]);
  const list = res.data?.clients;

  return (
    <div className="mx-auto max-w-[1240px] px-4 pb-16 pt-6 sm:px-6 lg:px-8">
      <header className="mb-6 flex flex-wrap items-end justify-between gap-x-6 gap-y-4">
        <div className="min-w-0">
          <h1 className="page-title">Clients</h1>
          <p className="mt-1 text-[13px] text-muted">
            {list ? (archived ? (list.length ? plural(list.length, "client archivé", "clients archivés") : "Aucun client archivé") : list.length ? plural(list.length, "client actif", "clients actifs") : "Chaque client a sa fiche, ses médias, ses montages et son planning.") : <span className="skeleton inline-block h-3 w-32 align-middle" />}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div role="tablist" aria-label="Clients affichés" className="inline-flex rounded-full bg-sunken p-0.5">
            {[
              { v: false, label: "Actifs" },
              { v: true, label: "Archivés" },
            ].map((t) => (
              <button
                key={t.label}
                type="button"
                role="tab"
                aria-selected={archived === t.v}
                onClick={() => setArchived(t.v)}
                className={cx("h-8 rounded-full px-3.5 text-[13px] font-semibold transition-colors", archived === t.v ? "bg-surface text-ink shadow-card" : "text-muted hover:text-ink")}
              >
                {t.label}
              </button>
            ))}
          </div>
          <Button variant="primary" icon={<Plus className="h-4 w-4" />} onClick={() => setNewClientOpen(true)}>
            Nouveau client
          </Button>
        </div>
      </header>

      {res.error && !list ? (
        <div role="alert" className="rounded-card border border-terracotta/30 bg-terracotta-soft/60 px-4 py-3 text-[13.5px] text-terracotta">
          Les clients n&apos;ont pas pu se charger : {res.error}
        </div>
      ) : null}

      {!list ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 3 }, (_, i) => (
            <div key={i} className="skeleton h-[188px] rounded-card" />
          ))}
        </div>
      ) : list.length === 0 ? (
        archived ? (
          <EmptyState icon={<Users className="h-6 w-6" />} title="Aucun client archivé">
            Un client archivé disparaît du sélecteur ; ses médias, montages et publications restent intacts.
          </EmptyState>
        ) : (
          <EmptyState icon={<Users className="h-6 w-6" />} title="Aucun client pour le moment">
            Créez la fiche de votre premier client : ses réseaux, son site, puis ses médias et son planning.
          </EmptyState>
        )
      ) : (
        <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {list.map((c) => (
            <li key={c.id}>
              <ClientCard client={c} current={current?.id === c.id} />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function ClientCard({ client: c, current }: { client: ClientSummary; current: boolean }) {
  return (
    <Link
      href={`/clients/${c.id}`}
      className={cx("group flex h-full min-w-0 flex-col rounded-card border bg-surface p-4 transition-shadow hover:shadow-card sm:p-5", current ? "border-chestnut/40 ring-1 ring-chestnut/20" : "border-line")}
      aria-label={`${c.name}${c.sector ? `, ${c.sector}` : ""}${current ? " (client courant)" : ""}`}
    >
      <div className="flex items-start gap-3">
        <ClientAvatar client={c} size="lg" />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <h2 className="truncate text-[15px] font-semibold text-ink group-hover:text-chestnut">{c.name}</h2>
            {current ? <Badge tone="chestnut">Client courant</Badge> : null}
            {c.status === "archived" ? <Badge>Archivé</Badge> : null}
          </div>
          <p className="truncate text-[13px] text-muted">{c.sector || "Secteur à préciser"}</p>
          {c.website ? (
            <p className="mt-0.5 flex min-w-0 items-center gap-1 text-[12.5px] text-muted">
              <Globe className="h-3.5 w-3.5 shrink-0" aria-hidden />
              <span className="truncate">{displayUrl(c.website)}</span>
            </p>
          ) : null}
        </div>
      </div>

      <div className="mt-3 flex min-h-7 flex-wrap gap-1.5">
        {c.socials.length ? (
          c.socials.map((s) => (
            <span key={s.platform} className="inline-flex h-7 max-w-full items-center gap-1.5 rounded-full bg-sunken px-2.5 text-[12px] text-ink" title={s.url ?? undefined}>
              <PlatformGlyph platform={s.platform} title={false} className="h-3.5 w-3.5 text-muted" />
              <span className="truncate">{s.handle ? `@${s.handle}` : SOCIAL_LABEL[s.platform]}</span>
            </span>
          ))
        ) : (
          <span className="text-[12.5px] text-faint">Aucun réseau renseigné</span>
        )}
      </div>

      <dl className="mt-auto grid grid-cols-3 gap-2 border-t border-line pt-3 text-[12px]">
        <div className="min-w-0">
          <dt className="flex items-center gap-1 text-muted">
            <Images className="h-3.5 w-3.5" aria-hidden /> Médias
          </dt>
          <dd className="mt-0.5 text-[14px] font-semibold tabular-nums text-ink">{c.stats.media.toLocaleString("fr-FR")}</dd>
        </div>
        <div className="min-w-0">
          <dt className="flex items-center gap-1 text-muted">
            <CalendarDays className="h-3.5 w-3.5" aria-hidden /> Programmés
          </dt>
          <dd className="mt-0.5 text-[14px] font-semibold tabular-nums text-ink">{c.stats.scheduledPosts.toLocaleString("fr-FR")}</dd>
        </div>
        <div className="min-w-0">
          <dt className="flex items-center gap-1 text-muted">
            <Clock className="h-3.5 w-3.5" aria-hidden /> Activité
          </dt>
          <dd className="mt-0.5 truncate text-[13px] font-semibold text-ink">{c.stats.lastActivityAt ? formatRelative(c.stats.lastActivityAt) : "—"}</dd>
        </div>
      </dl>
    </Link>
  );
}
