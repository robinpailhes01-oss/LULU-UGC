"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
  Archive,
  ArchiveRestore,
  ArrowLeft,
  ArrowRight,
  CalendarDays,
  Clapperboard,
  Clock,
  ExternalLink,
  Globe,
  Images,
  Link2,
  MoreHorizontal,
  Palette,
  RefreshCw,
  Sparkles,
  Swords,
} from "lucide-react";
import { ClientAvatar } from "@/components/clients/ClientAvatar";
import { ColorField, draftToPayload, SectorField, SocialFields, socialErrors, socialsToDraft, type SocialDraft } from "@/components/clients/ClientForm";
import { PlatformGlyph, PlatformGlyphs } from "@/components/schedule/PlatformGlyph";
import { useScreenContext, useShell } from "@/components/shell/ShellContext";
import { Badge } from "@/components/ui/Badge";
import { Button, IconButton } from "@/components/ui/Button";
import { cx } from "@/components/ui/cx";
import { ConfirmDialog } from "@/components/ui/Dialog";
import { EmptyState } from "@/components/ui/EmptyState";
import { Input, Label, Textarea } from "@/components/ui/Field";
import { useMenu } from "@/components/ui/Menu";
import { useToast } from "@/components/ui/Toast";
import { api, errorMessage } from "@/lib/client/api";
import { emitRefresh } from "@/lib/client/refresh";
import { useResource } from "@/lib/client/use-resource";
import { clientColor, displayUrl, normalizeWebsite, SOCIAL_LABEL, SOCIAL_PLATFORMS } from "@/lib/shared/clients";
import { formatDateTime, formatRelative } from "@/lib/shared/format";
import type { ActivityItem, Asset, AssetPage, Client, ScheduledPost, SocialAccount, SocialPlatform } from "@/lib/shared/types";

type Numbers = { photos: number; videos: number; montages: number; scheduledPosts: number; drafts: number; publishedPosts: number; lastActivityAt: string | null };
type Account = SocialAccount & { needsReconnection: boolean; platformLabel: string };
type Connections = { configured: boolean; profileId: string | null; accounts: Account[]; error: string | null };
type Tab = "apercu" | "marque" | "concurrents";
const EMPTY_NUMBERS: Numbers = { photos: 0, videos: 0, montages: 0, scheduledPosts: 0, drafts: 0, publishedPosts: 0, lastActivityAt: null };

const TABS: { id: Tab; label: string }[] = [
  { id: "apercu", label: "Aperçu" },
  { id: "marque", label: "Marque" },
  { id: "concurrents", label: "Concurrents" },
];

/** Fiche client : identité, réseaux et comptes Zernio, chiffres, médias, planning, activité ; marque et concurrents à venir. */
export function ClientSheet({ id }: { id: string }) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const toast = useToast();
  const menu = useMenu();
  const { client: current, switchClient, reloadClients } = useShell();
  const res = useResource<{ client: Client; numbers: Numbers }>(`/api/clients/${id}`, ["clients", "assets", "posts", "montages"]);
  const conn = useResource<Connections>(`/api/clients/${id}/connections`, ["clients"]);
  const [archiveOpen, setArchiveOpen] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const tabParam = params.get("tab");
  const tab: Tab = tabParam === "marque" || tabParam === "concurrents" ? tabParam : "apercu";
  const client = res.data?.client;
  const isCurrent = current?.id === id;

  useScreenContext({ page: "client" });

  // Retour du flux de connexion Zernio : ?connected=instagram&username=… ou ?error=…&platform=…
  useEffect(() => {
    const connected = params.get("connected");
    const error = params.get("error");
    if (!connected && !error) return;
    const platform = (connected ?? params.get("platform") ?? "") as SocialPlatform;
    const label = SOCIAL_LABEL[platform] ?? platform;
    if (connected) toast(`Compte ${label}${params.get("username") ? ` @${params.get("username")}` : ""} connecté`);
    else toast(`Connexion ${label} interrompue : ${params.get("error_message") ?? error}`, { tone: "error" });
    void api.get<Connections>(`/api/clients/${id}/connections?refresh=1`).then((c) => conn.mutate(c)).catch(() => undefined);
    emitRefresh("posts");
    router.replace(`${pathname}${tab !== "apercu" ? `?tab=${tab}` : ""}`);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params]);

  const setTab = (t: Tab) => router.replace(`${pathname}${t === "apercu" ? "" : `?tab=${t}`}`, { scroll: false });

  async function goTo(href: string) {
    try {
      if (!isCurrent) await switchClient(id);
      router.push(href);
    } catch (err) {
      toast(errorMessage(err), { tone: "error" });
    }
  }

  async function makeCurrent() {
    setBusy("switch");
    try {
      await switchClient(id);
      toast(`Client courant : ${client?.name ?? ""}`);
    } catch (err) {
      toast(errorMessage(err), { tone: "error" });
    } finally {
      setBusy(null);
    }
  }

  async function setArchived(archived: boolean) {
    if (!client) return;
    setBusy("archive");
    try {
      const next = await api.patch<Client>(`/api/clients/${id}`, { status: archived ? "archived" : "active" });
      res.mutate((p) => ({ numbers: p?.numbers ?? EMPTY_NUMBERS, client: next }));
      await reloadClients();
      emitRefresh("clients");
      if (archived && isCurrent) await switchClient(null);
      toast(archived ? `« ${client.name} » archivé${isCurrent ? " : retour à tous les clients" : ""}` : `« ${client.name} » réactivé`);
    } catch (err) {
      toast(errorMessage(err), { tone: "error" });
    } finally {
      setBusy(null);
      setArchiveOpen(false);
    }
  }

  if (res.error && !client) {
    return (
      <div className="mx-auto max-w-[1240px] px-4 pt-6 sm:px-6 lg:px-8">
        <EmptyState title="Client introuvable" action={<Link href="/clients" className="font-semibold text-chestnut hover:underline">Tous les clients</Link>}>
          {res.error}
        </EmptyState>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-[1240px] px-4 pb-16 pt-5 sm:px-6 lg:px-8">
      <Link href="/clients" className="mb-3 inline-flex items-center gap-1 rounded-md text-[13px] text-muted hover:text-ink">
        <ArrowLeft className="h-3.5 w-3.5" aria-hidden /> Clients
      </Link>

      <header className="flex items-start justify-between gap-x-6 gap-y-4">
        <div className="flex min-w-0 flex-1 items-center gap-4">
          {client ? <ClientAvatar client={client} size="xl" /> : <div className="skeleton h-16 w-16 rounded-full" />}
          <div className="min-w-0">
            {client ? (
              <>
                <div className="flex flex-wrap items-center gap-2">
                  <h1 className="page-title break-words">{client.name}</h1>
                  {isCurrent ? <Badge tone="chestnut">Client courant</Badge> : null}
                  {client.status === "archived" ? <Badge>Archivé</Badge> : null}
                </div>
                <p className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-[13px] text-muted">
                  <span>{client.sector || "Secteur à préciser"}</span>
                  {client.website ? (
                    <a href={client.website} target="_blank" rel="noreferrer" className="inline-flex min-w-0 items-center gap-1 hover:text-chestnut">
                      <Globe className="h-3.5 w-3.5" aria-hidden />
                      <span className="truncate">{displayUrl(client.website)}</span>
                      <span className="sr-only">(nouvel onglet)</span>
                    </a>
                  ) : null}
                </p>
              </>
            ) : (
              <>
                <div className="skeleton h-8 w-56" />
                <div className="skeleton mt-2 h-4 w-40" />
              </>
            )}
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          {client && !isCurrent && client.status === "active" ? (
            <Button variant="primary" className="hidden sm:inline-flex" loading={busy === "switch"} onClick={() => void makeCurrent()}>
              Travailler sur ce client
            </Button>
          ) : null}
          {client ? (
            <IconButton
              label="Plus d'actions"
              onClick={(e) =>
                menu.openBelow(
                  e.currentTarget,
                  [
                    client.status === "archived"
                      ? { label: "Réactiver le client", icon: <ArchiveRestore />, onSelect: () => void setArchived(false) }
                      : { label: "Archiver le client", icon: <Archive />, onSelect: () => setArchiveOpen(true) },
                  ],
                  "right",
                )
              }
            >
              <MoreHorizontal className="h-5 w-5" />
            </IconButton>
          ) : null}
        </div>
      </header>

      {client && !isCurrent && client.status === "active" ? (
        <Button variant="primary" className="mt-4 w-full sm:hidden" loading={busy === "switch"} onClick={() => void makeCurrent()}>
          Travailler sur ce client
        </Button>
      ) : null}

      {/* Raccourcis : ouvrent l'écran dans ce client */}
      <nav aria-label="Ouvrir dans ce client" className="mt-5 flex flex-wrap gap-2">
        {[
          { href: "/mediatheque", label: "Médias", icon: Images },
          { href: "/montage", label: "Montages", icon: Clapperboard },
          { href: "/programmation", label: "Planning", icon: CalendarDays },
        ].map((l) => (
          <button key={l.href} type="button" onClick={() => void goTo(l.href)} className="inline-flex h-9 items-center gap-2 rounded-full border border-line-strong bg-surface px-3.5 text-[13.5px] font-semibold text-ink hover:bg-hover">
            <l.icon className="h-4 w-4 text-chestnut" aria-hidden />
            {l.label}
            <ArrowRight className="h-3.5 w-3.5 text-muted" aria-hidden />
          </button>
        ))}
      </nav>

      <div role="tablist" aria-label="Sections de la fiche" className="mt-6 flex gap-1 overflow-x-auto border-b border-line">
        {TABS.map((t) => (
          <button
            key={t.id}
            id={`tab-${t.id}`}
            role="tab"
            type="button"
            aria-selected={tab === t.id}
            aria-controls={`panel-${t.id}`}
            onClick={() => setTab(t.id)}
            className={cx("-mb-px h-10 shrink-0 border-b-2 px-3 text-[13.5px] font-semibold transition-colors", tab === t.id ? "border-chestnut text-ink" : "border-transparent text-muted hover:text-ink")}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div id={`panel-${tab}`} role="tabpanel" aria-labelledby={`tab-${tab}`} className="pt-5">
        {!client ? (
          <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
            <div className="skeleton h-80 rounded-card" />
            <div className="skeleton h-80 rounded-card" />
          </div>
        ) : tab === "apercu" ? (
          <Overview client={client} numbers={res.data!.numbers} connections={conn.data} reloadConnections={() => void api.get<Connections>(`/api/clients/${id}/connections?refresh=1`).then((c) => conn.mutate(c))} onSaved={(c) => res.mutate((p) => ({ numbers: p?.numbers ?? EMPTY_NUMBERS, client: c }))} />
        ) : tab === "marque" ? (
          <BrandTab client={client} />
        ) : (
          <CompetitorsTab client={client} />
        )}
      </div>

      <ConfirmDialog open={archiveOpen} onClose={() => setArchiveOpen(false)} onConfirm={() => void setArchived(true)} title={`Archiver « ${client?.name ?? ""} » ?`} confirmLabel="Archiver" loading={busy === "archive"}>
        Le client disparaît du sélecteur. Ses médias, montages, publications et conversations restent intacts, et vous pourrez le réactiver depuis Clients → Archivés.
      </ConfirmDialog>
    </div>
  );
}

// ---------------------------------------------------------------------------------------------
// Aperçu

function Section({ title, icon, children, action, className }: { title: string; icon: React.ReactNode; children: React.ReactNode; action?: React.ReactNode; className?: string }) {
  const hid = `sec-${title.toLowerCase().normalize("NFD").replace(/\p{M}/gu, "").replace(/[^a-z]+/g, "-")}`;
  return (
    <section aria-labelledby={hid} className={cx("min-w-0 rounded-card border border-line bg-surface p-4 sm:p-5", className)}>
      <div className="mb-3 flex items-center justify-between gap-3">
        <h2 id={hid} className="flex items-center gap-2 text-[14px] font-semibold text-ink">
          <span className="flex h-7 w-7 items-center justify-center rounded-full bg-sunken text-chestnut" aria-hidden>
            {icon}
          </span>
          {title}
        </h2>
        {action}
      </div>
      {children}
    </section>
  );
}

function Overview({ client, numbers, connections, reloadConnections, onSaved }: { client: Client; numbers: Numbers; connections: Connections | undefined; reloadConnections: () => void; onSaved: (c: Client) => void }) {
  const fromNow = useMemo(() => new Date(Date.now() - 3_600_000).toISOString(), []);
  const toLater = useMemo(() => new Date(Date.now() + 45 * 86_400_000).toISOString(), []);
  const media = useResource<AssetPage>(`/api/assets?client=${client.id}&limit=8&sort=recent`, ["assets"]);
  const posts = useResource<{ posts: ScheduledPost[]; assets: Record<string, Asset> }>(`/api/posts?client=${client.id}&from=${encodeURIComponent(fromNow)}&to=${encodeURIComponent(toLater)}&status=scheduled,publishing,failed`, ["posts"]);
  const activity = useResource<{ items: ActivityItem[] }>(`/api/activity?client=${client.id}&limit=12`, ["assets", "posts", "montages", "clients", "folders", "activity"]);

  return (
    <div className="grid gap-4 lg:grid-cols-[minmax(0,1.05fr)_minmax(0,1fr)]">
      <div className="flex min-w-0 flex-col gap-4">
        <IdentityForm client={client} onSaved={onSaved} />
        <Networks client={client} connections={connections} reload={reloadConnections} />
      </div>
      <div className="flex min-w-0 flex-col gap-4">
        <Section title="Chiffres clés" icon={<Sparkles className="h-4 w-4" />}>
          <dl className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            <Stat label="Photos" value={numbers.photos} />
            <Stat label="Vidéos" value={numbers.videos} />
            <Stat label="Montages" value={numbers.montages} />
            <Stat label="Programmées" value={numbers.scheduledPosts} />
            <Stat label="Brouillons" value={numbers.drafts} />
            <Stat label="Publiées" value={numbers.publishedPosts} />
          </dl>
        </Section>

        <Section title="Médias récents" icon={<Images className="h-4 w-4" />} action={client.rootFolderId ? <Link href={`/mediatheque/dossier/${client.rootFolderId}`} className="text-[12.5px] font-semibold text-chestnut hover:underline">Dossier du client</Link> : undefined}>
          {!media.data ? (
            <div className="grid grid-cols-4 gap-2">
              {Array.from({ length: 4 }, (_, i) => (
                <div key={i} className="skeleton aspect-square rounded-lg" />
              ))}
            </div>
          ) : media.data.items.length === 0 ? (
            <p className="py-2 text-[13px] text-muted">Aucun média pour l&apos;instant. Importez les rushes du client dans son dossier.</p>
          ) : (
            <ul className="grid grid-cols-4 gap-2">
              {media.data.items.map((a) => (
                <li key={a.id}>
                  <Link href={a.folderId ? `/mediatheque/dossier/${a.folderId}` : "/mediatheque"} className="block overflow-hidden rounded-lg bg-sunken" title={a.name}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    {a.urls.thumb || a.urls.poster ? <img src={a.urls.thumb ?? a.urls.poster ?? ""} alt={a.ai?.alt ?? a.name} className="aspect-square w-full object-cover" loading="lazy" /> : <span className="flex aspect-square items-center justify-center text-2xs text-muted">{a.kind}</span>}
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Section>

        <Section title="Prochaines publications" icon={<CalendarDays className="h-4 w-4" />}>
          {!posts.data ? (
            <div className="skeleton h-12 rounded-lg" />
          ) : posts.data.posts.length === 0 ? (
            <p className="py-2 text-[13px] text-muted">Rien de programmé dans les six prochaines semaines.</p>
          ) : (
            <ul className="divide-y divide-line">
              {posts.data.posts.slice(0, 6).map((p) => (
                <li key={p.id} className="flex items-center gap-3 py-2">
                  <span className="w-[92px] shrink-0 text-[12.5px] font-semibold tabular-nums text-ink">{formatDateTime(p.scheduledFor)}</span>
                  <PlatformGlyphs platforms={p.targets.map((t) => t.platform)} className="h-3.5 w-3.5 text-muted" />
                  <span className="min-w-0 flex-1 truncate text-[13px] text-muted">{p.caption || "Sans légende"}</span>
                  {p.status === "failed" ? <Badge tone="terracotta">Échec</Badge> : null}
                </li>
              ))}
            </ul>
          )}
        </Section>

        <Section title="Activité" icon={<Clock className="h-4 w-4" />}>
          {!activity.data ? (
            <div className="skeleton h-12 rounded-lg" />
          ) : activity.data.items.length === 0 ? (
            <p className="py-2 text-[13px] text-muted">Pas encore d&apos;activité.</p>
          ) : (
            <ul className="space-y-1.5">
              {activity.data.items.map((it) => (
                <li key={it.id} className="flex gap-2 text-[13px] leading-snug">
                  <span className="min-w-0 flex-1 text-ink">
                    <span className="font-semibold">{it.actor ?? "L'Atelier"}</span> {it.verb} <span className="text-muted">{it.summary}</span>
                  </span>
                  <span className="shrink-0 text-2xs text-faint">{formatRelative(it.createdAt)}</span>
                </li>
              ))}
            </ul>
          )}
        </Section>
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-lg bg-canvas px-3 py-2.5">
      <dt className="text-[12px] text-muted">{label}</dt>
      <dd className="mt-0.5 text-[1.25rem] font-semibold tabular-nums text-ink">{value.toLocaleString("fr-FR")}</dd>
    </div>
  );
}

function IdentityForm({ client, onSaved }: { client: Client; onSaved: (c: Client) => void }) {
  const toast = useToast();
  const { reloadClients } = useShell();
  const [name, setName] = useState(client.name);
  const [sector, setSector] = useState(client.sector);
  const [website, setWebsite] = useState(client.website ?? "");
  const [description, setDescription] = useState(client.description);
  const [color, setColor] = useState(clientColor(client));
  const [socials, setSocials] = useState<SocialDraft>(socialsToDraft(client.socials));
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    setName(client.name);
    setSector(client.sector);
    setWebsite(client.website ?? "");
    setDescription(client.description);
    setColor(clientColor(client));
    setSocials(socialsToDraft(client.socials));
  }, [client]);

  const initial = useMemo(() => JSON.stringify([client.name, client.sector, client.website ?? "", client.description, clientColor(client), socialsToDraft(client.socials)]), [client]);
  const dirty = JSON.stringify([name, sector, website, description, color, socials]) !== initial;
  const errors = socialErrors(socials);
  let websiteError: string | null = null;
  try {
    normalizeWebsite(website);
  } catch (err) {
    websiteError = err instanceof Error ? err.message : "Adresse illisible.";
  }
  const invalid = !name.trim() || Object.keys(errors).length > 0 || Boolean(websiteError);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (invalid || !dirty) return;
    setBusy(true);
    try {
      const next = await api.patch<Client>(`/api/clients/${client.id}`, { name: name.trim(), sector: sector.trim(), website: website.trim() || null, description: description.trim(), color, socials: draftToPayload(socials) });
      onSaved(next);
      await reloadClients();
      emitRefresh("clients", "folders");
      toast("Fiche enregistrée");
    } catch (err) {
      toast(errorMessage(err), { tone: "error" });
    } finally {
      setBusy(false);
    }
  }

  return (
    <Section title="Identité" icon={<Palette className="h-4 w-4" />}>
      <form onSubmit={save} className="grid gap-4" noValidate>
        <div>
          <Label htmlFor="cs-name">Nom</Label>
          <Input id="cs-name" value={name} onChange={(e) => setName(e.target.value)} maxLength={120} aria-invalid={!name.trim() ? true : undefined} />
        </div>
        <div>
          <Label htmlFor="cs-sector">Secteur</Label>
          <SectorField id="cs-sector" value={sector} onChange={setSector} />
        </div>
        <div>
          <Label htmlFor="cs-site">Site web</Label>
          <Input id="cs-site" value={website} onChange={(e) => setWebsite(e.target.value)} placeholder="lecomptoirduport.fr" inputMode="url" spellCheck={false} aria-invalid={websiteError ? true : undefined} />
          {websiteError ? <p className="mt-1 text-[12px] text-terracotta">{websiteError}</p> : null}
        </div>
        <fieldset>
          <legend className="mb-2 text-[12.5px] font-semibold text-ink">Réseaux sociaux</legend>
          <SocialFields idPrefix="cs" value={socials} onChange={setSocials} />
        </fieldset>
        <div>
          <Label htmlFor="cs-desc">Description courte</Label>
          <Textarea id="cs-desc" value={description} onChange={(e) => setDescription(e.target.value)} rows={3} maxLength={2000} placeholder="Ce que fait le client, où, pour qui." />
        </div>
        <div>
          <p className="mb-2 text-[12.5px] font-semibold text-ink">Couleur</p>
          <ColorField value={color} onChange={setColor} />
        </div>
        <div className="flex items-center justify-end gap-2">
          {dirty ? (
            <Button
              variant="ghost"
              onClick={() => {
                setName(client.name);
                setSector(client.sector);
                setWebsite(client.website ?? "");
                setDescription(client.description);
                setColor(clientColor(client));
                setSocials(socialsToDraft(client.socials));
              }}
            >
              Annuler
            </Button>
          ) : null}
          <Button variant="secondary" type="submit" loading={busy} disabled={!dirty || invalid}>
            Enregistrer
          </Button>
        </div>
      </form>
    </Section>
  );
}

function Networks({ client, connections, reload }: { client: Client; connections: Connections | undefined; reload: () => void }) {
  const toast = useToast();
  const [busy, setBusy] = useState<string | null>(null);
  const configured = connections?.configured ?? false;
  const accounts = connections?.accounts ?? [];

  async function connect(platform: SocialPlatform) {
    setBusy(platform);
    try {
      const { authUrl } = await api.post<{ authUrl: string }>(`/api/clients/${client.id}/connect`, { platform });
      window.location.href = authUrl;
    } catch (err) {
      toast(errorMessage(err), { tone: "error" });
      setBusy(null);
    }
  }

  return (
    <Section
      title="Réseaux et comptes"
      icon={<Link2 className="h-4 w-4" />}
      action={
        configured && client.zernioProfileId ? (
          <IconButton label="Actualiser les comptes" size="sm" onClick={reload}>
            <RefreshCw className="h-3.5 w-3.5" />
          </IconButton>
        ) : undefined
      }
    >
      {connections && !configured ? (
        <p className="mb-3 rounded-lg bg-honey-soft/70 px-3 py-2 text-[12.5px] leading-relaxed text-[#6d4a1c]">
          Connectez Zernio pour publier sur les comptes du client : ajoutez la clé <code className="font-semibold">ZERNIO_API_KEY</code> dans{" "}
          <Link href="/reglages" className="font-semibold underline">
            Réglages
          </Link>
          . Les réseaux ci-dessous restent enregistrés sur la fiche.
        </p>
      ) : null}
      {connections?.error ? <p className="mb-3 rounded-lg bg-terracotta-soft px-3 py-2 text-[12.5px] text-terracotta">{connections.error}</p> : null}
      <ul className="divide-y divide-line">
        {SOCIAL_PLATFORMS.map((p) => {
          const social = client.socials.find((s) => s.platform === p);
          const linked = accounts.filter((a) => a.platform === p);
          return (
            <li key={p} className="flex flex-wrap items-center gap-x-3 gap-y-1.5 py-2.5">
              <span className="flex w-[104px] shrink-0 items-center gap-2 text-[13px] font-semibold text-ink">
                <PlatformGlyph platform={p} title={false} className="text-muted" />
                {SOCIAL_LABEL[p]}
              </span>
              <span className="min-w-0 flex-1 text-[13px]">
                {social ? (
                  social.url ? (
                    <a href={social.url} target="_blank" rel="noreferrer" className="inline-flex max-w-full items-center gap-1 text-ink hover:text-chestnut">
                      <span className="truncate">{social.handle ? `@${social.handle}` : displayUrl(social.url)}</span>
                      <ExternalLink className="h-3 w-3 shrink-0 text-muted" aria-hidden />
                      <span className="sr-only">(nouvel onglet)</span>
                    </a>
                  ) : (
                    <span>@{social.handle}</span>
                  )
                ) : (
                  <span className="text-faint">Non renseigné</span>
                )}
                {linked.length ? (
                  <span className="mt-0.5 flex flex-wrap gap-1">
                    {linked.map((a) => (
                      <Badge key={a.id} tone={a.needsReconnection ? "terracotta" : "olive"}>
                        {a.needsReconnection ? "À reconnecter" : "Connecté"} · @{a.username}
                      </Badge>
                    ))}
                  </span>
                ) : null}
              </span>
              {configured ? (
                <Button size="sm" variant={linked.length ? "ghost" : "secondary"} loading={busy === p} onClick={() => void connect(p)}>
                  {linked.length ? (linked.some((a) => a.needsReconnection) ? "Reconnecter" : "Ajouter") : "Connecter"}
                </Button>
              ) : null}
            </li>
          );
        })}
      </ul>
      {configured && !client.zernioProfileId ? <p className="mt-2 text-[12px] text-muted">Le profil Zernio du client sera créé à la première connexion.</p> : null}
    </Section>
  );
}

// ---------------------------------------------------------------------------------------------
// Marque et concurrents (étapes à venir)

function BrandTab({ client }: { client: Client }) {
  return (
    <div className="grid gap-4">
      <Placeholder icon={<Sparkles className="h-6 w-6" />} title="Analyse de la marque">
        Bientôt : l&apos;agent lira le site et les réseaux pour écrire la fiche marque et la voix du client.
      </Placeholder>
      {client.brand ? (
        <Section title="Fiche marque enregistrée" icon={<Palette className="h-4 w-4" />}>
          {client.brand.summary ? <p className="mb-3 whitespace-pre-line text-[13.5px] leading-relaxed text-ink">{String(client.brand.summary)}</p> : null}
          <pre className="max-h-[420px] overflow-auto rounded-lg bg-canvas p-3 text-[12px] leading-relaxed text-muted">{JSON.stringify(client.brand, null, 2)}</pre>
        </Section>
      ) : null}
    </div>
  );
}

function CompetitorsTab({ client }: { client: Client }) {
  return (
    <Placeholder icon={<Swords className="h-6 w-6" />} title="Concurrents et Reels gagnants">
      Bientôt : repérez les concurrents de {client.name}, l&apos;agent analysera leurs Reels qui marchent et en tirera des idées de contenus et des styles de montage.
    </Placeholder>
  );
}

function Placeholder({ icon, title, children }: { icon: React.ReactNode; title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-card border border-dashed border-line-strong bg-surface/60 px-6 py-10 text-center">
      <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-sunken text-chestnut">{icon}</div>
      <h2 className="font-display text-[1.25rem] font-[400] text-ink">{title}</h2>
      <p className="mx-auto mt-2 max-w-md text-[13.5px] leading-relaxed text-muted">{children}</p>
      <p className="mt-4">
        <Badge tone="honey">Prochaine étape</Badge>
      </p>
    </section>
  );
}
