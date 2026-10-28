"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { ArrowRight, Bot, CalendarClock, Clapperboard, Database, FolderGit2, HardDrive, Info, KeyRound, Library, Palette, PlugZap, Users } from "lucide-react";
import { CopyButton } from "@/components/settings/CopyButton";
import { useScreenContext, useShell } from "@/components/shell/ShellContext";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { cx } from "@/components/ui/cx";
import { api, ApiError, errorMessage } from "@/lib/client/api";
import { useResource } from "@/lib/client/use-resource";
import { formatRelative } from "@/lib/shared/format";
import type { ActivityItem, Look, Skill } from "@/lib/shared/types";
import type { ConfigStatus } from "@/lib/server/env";

type Health = ConfigStatus & { databaseStatus: string };

interface EnvVar {
  name: string;
  hint: string;
  example?: string;
}

interface Connection {
  id: string;
  title: string;
  icon: React.ReactNode;
  ok: boolean;
  /** Ce qui tourne aujourd'hui (« PGlite local », « Cloudflare R2 »…). */
  current: string;
  text: React.ReactNode;
  vars: EnvVar[];
  extra?: React.ReactNode;
  test?: { label: string; run: () => Promise<string> };
}

const SECTIONS = [
  { id: "connexions", label: "Connexions" },
  { id: "equipe", label: "Équipe" },
  { id: "skills", label: "Skills" },
  { id: "looks", label: "Looks" },
  { id: "a-propos", label: "À propos" },
];

/** Réglages : état des intégrations (sans aucun secret), équipe, skills, looks, à propos. */
export function SettingsView() {
  useScreenContext({ page: "reglages" });
  const health = useResource<Health>("/api/health", []);
  const h = health.data;

  const connections = useMemo<Connection[]>(() => (h ? buildConnections(h) : []), [h]);

  return (
    <div className="mx-auto max-w-[1080px] px-4 pb-16 pt-6 sm:px-6 lg:px-8">
      <header className="max-w-2xl">
        <h1 className="page-title">Réglages</h1>
        <p className="mt-1.5 text-[13.5px] leading-relaxed text-muted">
          L&apos;état des branchements de l&apos;Atelier. Les clés se règlent dans les variables d&apos;environnement (fichier <code className="rounded bg-sunken px-1 text-[12.5px]">.env.local</code> en local, projet Vercel en
          ligne) : aucune clé n&apos;est jamais affichée ici.
        </p>
      </header>

      <nav aria-label="Sections des réglages" className="sticky top-0 z-10 -mx-4 mt-5 overflow-x-auto border-b border-line bg-canvas/95 px-4 py-2 backdrop-blur sm:-mx-6 sm:px-6 lg:-mx-8 lg:px-8">
        <ul className="flex w-max gap-1.5">
          {SECTIONS.map((s) => (
            <li key={s.id}>
              <a href={`#${s.id}`} className="inline-flex h-8 items-center rounded-full bg-sunken px-3.5 text-[12.5px] font-semibold text-ink hover:bg-hover">
                {s.label}
              </a>
            </li>
          ))}
        </ul>
      </nav>

      <section id="connexions" aria-labelledby="h-connexions" className="scroll-mt-16 pt-8">
        <SectionTitle id="h-connexions" icon={<PlugZap className="h-4 w-4" />} title="Connexions">
          {h ? (
            <>
              Mode <strong className="font-semibold text-ink">{h.mode === "cloud" ? "en ligne" : h.mode === "local" ? "local" : "mixte"}</strong> ·{" "}
              {connections.filter((c) => c.ok).length} sur {connections.length} branchées
            </>
          ) : null}
        </SectionTitle>
        {health.error && !h ? (
          <div role="alert" className="flex flex-wrap items-center justify-between gap-3 rounded-card border border-terracotta/30 bg-terracotta-soft/60 px-4 py-3 text-[13.5px] text-terracotta">
            <span>État indisponible : {health.error}</span>
            <Button size="sm" onClick={() => void health.reload()}>
              Réessayer
            </Button>
          </div>
        ) : !h ? (
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            {Array.from({ length: 6 }, (_, i) => (
              <div key={i} className="skeleton h-48 rounded-card" />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            {connections.map((c) => (
              <ConnectionCard key={c.id} c={c} />
            ))}
          </div>
        )}
      </section>

      <TeamSection team={h?.team ?? null} />
      <SkillsSection />
      <LooksSection />

      <section id="a-propos" aria-labelledby="h-a-propos" className="scroll-mt-16 pt-10">
        <SectionTitle id="h-a-propos" icon={<Info className="h-4 w-4" />} title="À propos" />
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          <div className="rounded-card border border-line bg-surface p-5 text-[13px] leading-relaxed text-muted">
            <h3 className="mb-1.5 text-[14px] font-semibold text-ink">Local ou en ligne</h3>
            <p>
              <strong className="font-semibold text-ink">En local</strong>, sans aucune clé : la base de données (PGlite) et les fichiers vivent dans le dossier <code className="rounded bg-sunken px-1">.atelier-data</code> de
              l&apos;ordinateur. Parfait pour essayer, rien ne sort de la machine.
            </p>
            <p className="mt-2">
              <strong className="font-semibold text-ink">En ligne</strong> : Supabase garde les informations (dossiers, mots-clés, montages, publications), Cloudflare R2 garde les photos et vidéos, Vercel fait tourner
              l&apos;Atelier. Le mode se choisit tout seul selon les variables présentes.
            </p>
          </div>
          <div className="rounded-card border border-line bg-surface p-5 text-[13px] leading-relaxed text-muted">
            <h3 className="mb-1.5 text-[14px] font-semibold text-ink">Comptes dédiés à June</h3>
            <p>
              Supabase, Zernio et R2 sont des comptes propres à June, réglés uniquement par les variables d&apos;environnement de ce projet. L&apos;Atelier ne se branche jamais sur d&apos;autres comptes, même
              ouverts sur le même ordinateur.
            </p>
            <p className="mt-2">
              Adresse de l&apos;Atelier : <code className="break-all rounded bg-sunken px-1">{h?.appUrl ?? "…"}</code>
              {h?.mode !== "cloud" ? " (à régler avec ATELIER_APP_URL une fois en ligne)" : ""}. Guide pas à pas dans <code className="rounded bg-sunken px-1">atelier/README.md</code>.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}

// ---------------------------------------------------------------------------------------------
// Connexions

function buildConnections(h: Health): Connection[] {
  const webhook = `${h.appUrl}/api/webhooks/zernio`;
  return [
    {
      id: "db",
      title: "Base de données",
      icon: <Database className="h-4 w-4" />,
      ok: h.database === "postgres" && h.databaseStatus === "ok",
      current: h.databaseStatus !== "ok" ? `Erreur : ${h.databaseStatus}` : h.database === "postgres" ? "Supabase Postgres" : "PGlite local (sur cet ordinateur)",
      text: "Garde les dossiers, mots-clés, analyses, montages, publications et le journal. En ligne : le Postgres du projet Supabase de June, par le pooler de transactions (port 6543). Les tables vivent dans le schéma « atelier », créé tout seul au premier lancement.",
      vars: [{ name: "DATABASE_URL", hint: "Chaîne de connexion Supabase (pooler, port 6543)", example: "postgresql://postgres.xxxx:MOT_DE_PASSE@aws-0-eu-west-3.pooler.supabase.com:6543/postgres" }],
      test: {
        label: "Tester",
        run: async () => {
          const r = await api.get<Health>("/api/health");
          if (r.databaseStatus !== "ok") throw new Error(r.databaseStatus);
          return r.database === "postgres" ? "Supabase répond." : "La base locale répond.";
        },
      },
    },
    {
      id: "storage",
      title: "Stockage des fichiers",
      icon: <HardDrive className="h-4 w-4" />,
      ok: h.storage === "s3",
      current: h.storage === "s3" ? `S3 · R2${h.storagePublicDomain ? " · domaine public" : " · liens signés"}` : "Disque local (.atelier-data/blobs)",
      text: "Les photos et vidéos partent directement du navigateur vers le stockage. Cloudflare R2 est recommandé (pas de frais de sortie). Un domaine public (bucket public ou domaine personnalisé) accélère l'affichage ; sinon l'Atelier signe des liens temporaires.",
      vars: [
        { name: "R2_ACCOUNT_ID", hint: "Identifiant du compte Cloudflare (ou S3_ENDPOINT)" },
        { name: "S3_ENDPOINT", hint: "Point d'accès S3 si ce n'est pas R2" },
        { name: "S3_BUCKET", hint: "Nom du bucket" },
        { name: "S3_ACCESS_KEY_ID", hint: "Clé d'accès du jeton R2" },
        { name: "S3_SECRET_ACCESS_KEY", hint: "Secret du jeton R2" },
        { name: "S3_PUBLIC_BASE_URL", hint: "Facultatif : domaine public des fichiers" },
      ],
      test: {
        label: "Tester",
        run: async () => {
          const r = await api.get<Health>("/api/health");
          return r.storage === "s3" ? `Stockage S3 configuré${r.storagePublicDomain ? " avec domaine public" : ""}.` : "Stockage local actif.";
        },
      },
    },
    {
      id: "ai",
      title: "Agent Claude",
      icon: <Bot className="h-4 w-4" />,
      ok: h.ai,
      current: h.ai ? `Clé présente · modèle ${h.model}` : "Aucune clé",
      text: "L'agent du panneau de droite, l'analyse des photos (titres, mots-clés, qualité) et les idées de légendes. Sans clé, tout le reste de l'Atelier fonctionne, Ménage compris.",
      vars: [
        { name: "ANTHROPIC_API_KEY", hint: "Clé d'API Anthropic" },
        { name: "ATELIER_MODEL", hint: "Facultatif : modèle utilisé", example: "claude-opus-5-5" },
      ],
      test: {
        label: "Tester",
        run: async () => {
          const r = await api.post<{ captions: string[] }>("/api/ai/captions", { assetIds: [], brief: "Test de connexion depuis les réglages : un petit-déjeuner en terrasse au soleil." });
          return r.captions?.[0] ? `Claude répond : « ${r.captions[0].slice(0, 90)}${r.captions[0].length > 90 ? "…" : ""} »` : "Claude répond.";
        },
      },
    },
    {
      id: "zernio",
      title: "Zernio (programmation)",
      icon: <CalendarClock className="h-4 w-4" />,
      ok: h.zernio,
      current: h.zernio ? `Clé présente · fuseau ${h.timezone}` : `Aucune clé · fuseau ${h.timezone}`,
      text: (
        <>
          Publie les posts, Reels et stories sur les comptes de June à l&apos;heure prévue. Sans clé, les publications restent des brouillons. Dans Zernio, ajoutez un webhook vers l&apos;adresse ci-dessous avec le même
          secret pour que les statuts (publié, échec) remontent.
        </>
      ),
      vars: [
        { name: "ZERNIO_API_KEY", hint: "Clé d'API Zernio" },
        { name: "ZERNIO_WEBHOOK_SECRET", hint: "Secret partagé du webhook" },
        { name: "ATELIER_TIMEZONE", hint: "Fuseau des horaires", example: "Europe/Paris" },
      ],
      extra: (
        <div className="flex items-center gap-2 rounded-lg bg-canvas px-2.5 py-1.5">
          <span className="text-2xs font-semibold uppercase tracking-[0.12em] text-faint">Webhook</span>
          <code className="min-w-0 flex-1 truncate text-[12px] text-ink" title={webhook}>
            {webhook}
          </code>
          <CopyButton text={webhook} label="Copier l'adresse du webhook" />
        </div>
      ),
      test: {
        label: "Tester",
        run: async () => {
          try {
            const r = await api.get<{ accounts?: unknown[] } | unknown[]>("/api/social/accounts");
            const n = Array.isArray(r) ? r.length : Array.isArray((r as { accounts?: unknown[] }).accounts) ? (r as { accounts: unknown[] }).accounts.length : 0;
            return n > 0 ? `Zernio répond : ${n} compte${n > 1 ? "s" : ""} connecté${n > 1 ? "s" : ""}.` : "Zernio répond, mais aucun compte n'est connecté.";
          } catch (err) {
            if (err instanceof ApiError && err.status === 404) throw new Error("Le module Programmation n'est pas encore installé dans cet Atelier.");
            throw err;
          }
        },
      },
    },
    {
      id: "render",
      title: "Rendu vidéo HyperFrames",
      icon: <Clapperboard className="h-4 w-4" />,
      ok: h.render !== "none",
      current: { local: "Sur cet ordinateur (Chrome + FFmpeg)", sandbox: "Vercel Sandbox", heygen: "HeyGen (cloud)", none: "Aucun moteur de rendu" }[h.render],
      text: "Transforme les montages en MP4. En local, l'ordinateur fait le rendu. En ligne, Vercel ne peut pas lancer Chrome : choisissez Vercel Sandbox ou HeyGen.",
      vars: [
        { name: "HYPERFRAMES_RENDER", hint: "local, sandbox, heygen ou none" },
        { name: "HEYGEN_API_KEY", hint: "Pour heygen" },
        { name: "VERCEL_TOKEN", hint: "Pour sandbox" },
        { name: "VERCEL_TEAM_ID", hint: "Pour sandbox" },
        { name: "VERCEL_PROJECT_ID", hint: "Pour sandbox" },
      ],
    },
    {
      id: "auth",
      title: "Mot de passe d'équipe",
      icon: <KeyRound className="h-4 w-4" />,
      ok: h.auth,
      current: h.auth ? "Accès protégé" : "Accès libre (local uniquement)",
      text: "Un mot de passe partagé, puis chacun choisit son prénom (il signe le journal d'activité). Obligatoire en ligne : sans lui, l'Atelier refuse de s'ouvrir.",
      vars: [
        { name: "ATELIER_PASSWORD", hint: "Mot de passe partagé" },
        { name: "ATELIER_SECRET", hint: "Secret de signature des sessions (long, aléatoire)" },
        { name: "ATELIER_TEAM", hint: "Prénoms proposés", example: "Ludivine,Robin" },
        { name: "ATELIER_APP_URL", hint: "Adresse publique de l'Atelier", example: "https://atelier.example.com" },
        { name: "ATELIER_NAME", hint: "Nom affiché du produit (logo, titres)", example: "Atelier" },
      ],
    },
  ];
}

function StatusPill({ ok }: { ok: boolean }) {
  return ok ? (
    <Badge tone="olive">
      <span className="h-1.5 w-1.5 rounded-full bg-olive" aria-hidden />
      Branché
    </Badge>
  ) : (
    <Badge tone="honey">
      <span className="h-1.5 w-1.5 rounded-full border border-[#7a5220]" aria-hidden />À configurer
    </Badge>
  );
}

function ConnectionCard({ c }: { c: Connection }) {
  const [state, setState] = useState<{ status: "idle" | "running" | "ok" | "error"; message?: string }>({ status: "idle" });
  const all = c.vars.map((v) => `${v.name}=${v.example ?? ""}`).join("\n");
  return (
    <article aria-labelledby={`c-${c.id}`} className="flex min-w-0 flex-col rounded-card border border-line bg-surface p-4 sm:p-5">
      <div className="flex items-start justify-between gap-3">
        <h3 id={`c-${c.id}`} className="flex items-center gap-2 text-[14.5px] font-semibold text-ink">
          <span className="flex h-7 w-7 items-center justify-center rounded-full bg-sunken text-chestnut" aria-hidden>
            {c.icon}
          </span>
          {c.title}
        </h3>
        <StatusPill ok={c.ok} />
      </div>
      <p className="mt-2 text-[12.5px] font-semibold text-ink">{c.current}</p>
      <p className="mt-1 text-[12.5px] leading-relaxed text-muted">{c.text}</p>
      {c.extra ? <div className="mt-3">{c.extra}</div> : null}
      <details className="group mt-3 rounded-lg border border-line bg-canvas/60 open:bg-canvas">
        <summary className="flex cursor-pointer list-none items-center justify-between gap-2 rounded-lg px-3 py-2 text-[12.5px] font-semibold text-ink hover:bg-hover [&::-webkit-details-marker]:hidden">
          <span>Variables d&apos;environnement · {c.vars.length}</span>
          <ArrowRight className="h-3.5 w-3.5 text-muted transition-transform group-open:rotate-90" aria-hidden />
        </summary>
        <ul className="space-y-1 px-2 pb-2">
          {c.vars.map((v) => (
            <li key={v.name} className="flex items-center gap-2 rounded-md px-1 py-0.5">
              <code className="shrink-0 rounded bg-sunken px-1.5 py-0.5 text-[11.5px] font-semibold text-ink">{v.name}</code>
              <span className="min-w-0 flex-1 truncate text-[11.5px] text-muted" title={v.hint}>
                {v.hint}
              </span>
              <CopyButton text={v.name} label={`Copier ${v.name}`} />
            </li>
          ))}
        </ul>
        <div className="flex justify-end border-t border-line px-2 py-1.5">
          <CopyButton text={all} label="Copier toutes les lignes pour .env.local">
            Copier pour .env
          </CopyButton>
        </div>
      </details>
      {c.test ? (
        <div className="mt-auto flex flex-wrap items-center gap-x-3 gap-y-2 pt-3">
          <Button
            size="sm"
            variant="secondary"
            loading={state.status === "running"}
            onClick={async () => {
              setState({ status: "running" });
              try {
                setState({ status: "ok", message: await c.test!.run() });
              } catch (err) {
                setState({ status: "error", message: errorMessage(err) });
              }
            }}
          >
            {c.test.label}
          </Button>
          {state.message ? (
            <p role="status" className={cx("min-w-0 flex-1 text-[12px] leading-snug", state.status === "ok" ? "text-olive" : "text-terracotta")}>
              <span className="font-semibold">{state.status === "ok" ? "Réussi · " : "Échec · "}</span>
              {state.message}
            </p>
          ) : null}
        </div>
      ) : null}
    </article>
  );
}

// ---------------------------------------------------------------------------------------------
// Équipe, skills, looks

function SectionTitle({ id, icon, title, children }: { id: string; icon: React.ReactNode; title: string; children?: React.ReactNode }) {
  return (
    <div className="mb-4 flex flex-wrap items-baseline justify-between gap-2">
      <h2 id={id} className="flex items-center gap-2 font-display text-[1.25rem] font-[400] text-ink">
        <span className="text-chestnut" aria-hidden>
          {icon}
        </span>
        {title}
      </h2>
      {children ? <p className="text-[12.5px] text-muted">{children}</p> : null}
    </div>
  );
}

function TeamSection({ team }: { team: string[] | null }) {
  const { actor } = useShell();
  const activity = useResource<{ items: ActivityItem[] }>("/api/activity?limit=200", ["assets", "stats"]);
  const lastSeen = useMemo(() => {
    const m = new Map<string, string>();
    for (const it of activity.data?.items ?? []) if (it.actor && !m.has(it.actor)) m.set(it.actor, it.createdAt);
    return m;
  }, [activity.data]);
  return (
    <section id="equipe" aria-labelledby="h-equipe" className="scroll-mt-16 pt-10">
      <SectionTitle id="h-equipe" icon={<Users className="h-4 w-4" />} title="Équipe">
        Prénoms réglés par ATELIER_TEAM
      </SectionTitle>
      <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {(team ?? []).map((name) => {
          const me = actor === name;
          const seen = lastSeen.get(name);
          const recent = seen ? Date.now() - new Date(seen).getTime() < 15 * 60_000 : false;
          return (
            <li key={name} className="flex items-center gap-3 rounded-card border border-line bg-surface px-4 py-3">
              <span className="relative flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-select text-[13px] font-bold text-chestnut" aria-hidden>
                {name.slice(0, 1).toUpperCase()}
                {me || recent ? <span className="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-surface bg-olive" /> : null}
              </span>
              <div className="min-w-0">
                <p className="text-[13.5px] font-semibold text-ink">
                  {name}
                  {me ? <span className="font-normal text-muted"> · vous</span> : null}
                </p>
                <p className="text-[12px] text-muted">{me ? "En ligne en ce moment" : seen ? `Dernière action ${formatRelative(seen)}` : "Pas encore d'activité"}</p>
              </div>
            </li>
          );
        })}
        {team && !actor ? (
          <li className="flex items-center rounded-card border border-dashed border-line-strong px-4 py-3 text-[12.5px] leading-relaxed text-muted sm:col-span-2 lg:col-span-1">
            Mode local sans mot de passe : personne n&apos;est connecté nommément. Avec ATELIER_PASSWORD, chacun choisit son prénom à la connexion.
          </li>
        ) : null}
      </ul>
    </section>
  );
}

function SkillsSection() {
  const skills = useResource<{ skills: Skill[] }>("/api/skills", ["skills"]);
  const list = skills.data?.skills ?? [];
  const edited = list.filter((s) => s.appEdited).length;
  const updates = list.filter((s) => s.repoUpdateAvailable).length;
  const cmd = "ATELIER_URL=https://votre-atelier ATELIER_PASSWORD=… npm run skills:pull";
  return (
    <section id="skills" aria-labelledby="h-skills" className="scroll-mt-16 pt-10">
      <SectionTitle id="h-skills" icon={<Library className="h-4 w-4" />} title="Skills">
        {skills.data ? `${list.length} skills · ${edited} amélioré${edited > 1 ? "s" : ""} ici${updates ? ` · ${updates} mise${updates > 1 ? "s" : ""} à jour du dépôt` : ""}` : null}
      </SectionTitle>
      <div className="rounded-card border border-line bg-surface p-5">
        <div className="grid grid-cols-1 gap-5 md:grid-cols-[minmax(0,1fr)_auto] md:items-start">
          <div className="min-w-0 max-w-2xl text-[13px] leading-relaxed text-muted">
            <p>
              Les skills portent le savoir-faire de June : styles de montage, voix des légendes, direction artistique, méthodes de tri et de programmation. Ils se <strong className="font-semibold text-ink">configurent
              depuis le dépôt</strong> (dossier <code className="rounded bg-sunken px-1">atelier/skills/</code>) et s&apos;<strong className="font-semibold text-ink">améliorent ici</strong>, à la main ou avec
              l&apos;agent : chaque modification crée une version, avec retour arrière possible.
            </p>
            <p className="mt-2">Pour rapatrier dans le dépôt les améliorations faites en ligne :</p>
            <div className="mt-2 flex items-center gap-2 rounded-lg bg-night px-3 py-2">
              <FolderGit2 className="h-3.5 w-3.5 shrink-0 text-honey" aria-hidden />
              <code className="min-w-0 flex-1 overflow-x-auto whitespace-nowrap text-[12px] text-surface">{cmd}</code>
              <CopyButton text={cmd} label="Copier la commande" className="text-surface/70 hover:bg-white/10 hover:text-surface" />
            </div>
          </div>
          <Link href="/skills" className="inline-flex h-9 items-center justify-center gap-2 self-start rounded-full border border-line-strong bg-surface px-3.5 text-[13.5px] font-semibold text-ink hover:bg-hover">
            Ouvrir les skills
            <ArrowRight className="h-4 w-4" aria-hidden />
          </Link>
        </div>
      </div>
    </section>
  );
}

function LooksSection() {
  const looks = useResource<{ looks: Look[] }>("/api/looks", ["looks"]);
  const notInstalled = looks.error !== null && !looks.data;
  const list = looks.data?.looks ?? [];
  return (
    <section id="looks" aria-labelledby="h-looks" className="scroll-mt-16 pt-10">
      <SectionTitle id="h-looks" icon={<Palette className="h-4 w-4" />} title="Looks">
        {looks.data ? `${list.filter((l) => l.builtin).length} intégrés · ${list.filter((l) => !l.builtin).length} de l'équipe` : null}
      </SectionTitle>
      <div className="rounded-card border border-line bg-surface p-5">
        <p className="max-w-2xl text-[13px] leading-relaxed text-muted">
          Les looks sont les réglages de lumière et de couleur « à l&apos;image de June ». Ouvrez une photo dans la <Link href="/mediatheque" className="font-semibold text-chestnut hover:underline">médiathèque</Link>{" "}
          puis « Retoucher » pour en appliquer un, ou enregistrez vos réglages comme nouveau look.
        </p>
        {notInstalled ? (
          <p className="mt-3 text-[12.5px] text-faint">La liste des looks n&apos;est pas disponible pour le moment.</p>
        ) : !looks.data ? (
          <div className="mt-4 flex flex-wrap gap-2">
            {Array.from({ length: 5 }, (_, i) => (
              <div key={i} className="skeleton h-8 w-28 rounded-full" />
            ))}
          </div>
        ) : (
          <ul className="mt-4 flex flex-wrap gap-2">
            {list.map((l) => (
              <li key={l.id} className={cx("inline-flex h-8 items-center gap-2 rounded-full border px-3 text-[12.5px]", l.builtin ? "border-line bg-canvas text-ink" : "border-chestnut/30 bg-select text-chestnut")}>
                <span className="h-3 w-3 rounded-full" style={{ background: swatch(l) }} aria-hidden />
                {l.name}
                {!l.builtin && l.createdBy ? <span className="text-2xs text-muted">· {l.createdBy}</span> : null}
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}

/** Pastille indicative : chaleur et lumière du look. */
function swatch(l: Look): string {
  const t = Math.max(-1, Math.min(1, ((l.params.temperature ?? 0) / 100) * 3));
  const e = Math.max(-1, Math.min(1, (l.params.exposure ?? 0) * 1.5 + (l.params.fade ?? 0) / 60));
  const sat = 1 + Math.max(-1, Math.min(1, (l.params.saturation ?? 0) / 40));
  const base = 170 + e * 45;
  const r = Math.round(Math.max(0, Math.min(255, base + 35 * sat + t * 30)));
  const g = Math.round(Math.max(0, Math.min(255, base + 5 * sat)));
  const b = Math.round(Math.max(0, Math.min(255, base - 25 * sat - t * 45)));
  return `rgb(${r}, ${g}, ${b})`;
}
