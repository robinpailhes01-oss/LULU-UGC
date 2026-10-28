"use client";

import { ClientScopeChip } from "@/components/clients/ClientScopeChip";
import Link from "next/link";
import { useMemo, useState } from "react";
import { FolderGit2, Gauge, Library, Palette, Plus, RefreshCw, Search, Shuffle, Timer, X } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { cx } from "@/components/ui/cx";
import { EmptyState } from "@/components/ui/EmptyState";
import { useScreenContext } from "@/components/shell/ShellContext";
import { Segmented, Switch } from "@/components/skills/controls";
import { KindIcon } from "@/components/skills/KindIcon";
import { NewSkillDialog } from "@/components/skills/NewSkillDialog";
import { ClientSkillBadge, KindBadge, SourceBadge, StateBadges } from "@/components/skills/SkillBadges";
import { useShell } from "@/components/shell/ShellContext";
import { StructureTimeline } from "@/components/skills/StructureTimeline";
import { useResource } from "@/lib/client/use-resource";
import { lastChangeLabel, matchesFilter, SKILL_FILTERS, type SkillFilter } from "@/lib/client/skills/kinds";
import { montageSummary } from "@/lib/client/skills/montage-style";
import { formatRelative } from "@/lib/shared/format";
import type { MontageStyleData, Skill, SkillKind } from "@/lib/shared/types";

function norm(s: string) {
  return s.normalize("NFD").replace(/\p{M}/gu, "").toLowerCase();
}

/** Écran /skills : le savoir-faire de June, par type, avec création d'un nouveau skill. */
export function SkillsView() {
  useScreenContext({ page: "skills" });
  const [showDisabled, setShowDisabled] = useState(false);
  const [filter, setFilter] = useState<SkillFilter>("all");
  const [q, setQ] = useState("");
  const [creating, setCreating] = useState(false);
  const { data, error, loading, reload } = useResource<{ skills: Skill[] }>(showDisabled ? "/api/skills?all=1" : "/api/skills", ["skills"]);

  const skills = useMemo(() => data?.skills ?? [], [data]);
  const searched = useMemo(() => {
    const words = norm(q).trim().split(/\s+/).filter(Boolean);
    if (words.length === 0) return skills;
    return skills.filter((s) => {
      const hay = norm(`${s.name} ${s.slug} ${s.description}`);
      return words.every((w) => hay.includes(w));
    });
  }, [skills, q]);
  const counts = useMemo(() => Object.fromEntries(SKILL_FILTERS.map((f) => [f.id, searched.filter((s) => matchesFilter(s, f.id)).length])) as Record<SkillFilter, number>, [searched]);
  const visible = useMemo(() => searched.filter((s) => matchesFilter(s, filter)), [searched, filter]);

  const groups = useMemo(() => {
    if (filter !== "all") return [{ id: filter, label: null as string | null, items: visible }];
    return SKILL_FILTERS.filter((f) => f.id !== "all")
      .map((f) => ({ id: f.id, label: f.label as string | null, items: visible.filter((s) => matchesFilter(s, f.id)) }))
      .filter((g) => g.items.length > 0);
  }, [filter, visible]);

  const updates = skills.filter((s) => s.repoUpdateAvailable).length;
  const filterOptions = SKILL_FILTERS.map((f) => ({ id: f.id, label: f.label, count: data ? counts[f.id] : undefined }));
  const initialKind: SkillKind | undefined = SKILL_FILTERS.find((f) => f.id === filter)?.kinds?.[0];

  return (
    <div className="mx-auto max-w-[1240px] px-4 pb-16 pt-6 sm:px-6 lg:px-8">
      <header className="flex flex-wrap items-end justify-between gap-x-6 gap-y-4">
        <div className="min-w-0 max-w-2xl">
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5">
            <h1 className="page-title">Skills</h1>
            <ClientScopeChip />
          </div>
          <p className="mt-1.5 text-[13.5px] leading-relaxed text-muted">
            Le savoir-faire que l'agent applique : styles de montage, voix, méthodes, références. Ceux de l'agence servent à tous les clients ; un skill créé avec un client choisi lui est propre. Chaque changement est conservé.
          </p>
        </div>
        <div className="flex w-full flex-wrap items-center gap-3 sm:w-auto">
          <div className="relative min-w-0 flex-1 sm:w-56 sm:flex-none">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-faint" aria-hidden />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Filtrer les skills"
              aria-label="Filtrer les skills par nom ou description"
              className="h-9 w-full rounded-full border border-transparent bg-sunken pl-9 pr-8 text-[13px] placeholder:text-faint focus:border-line-strong focus:bg-surface focus:outline-none"
            />
            {q ? (
              <button type="button" aria-label="Effacer le filtre" onClick={() => setQ("")} className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full p-1 text-faint hover:text-ink">
                <X className="h-3.5 w-3.5" />
              </button>
            ) : null}
          </div>
          <Button variant="primary" icon={<Plus className="h-4 w-4" />} onClick={() => setCreating(true)}>
            Nouveau skill
          </Button>
        </div>
      </header>

      <div className="mt-6 flex flex-wrap items-center gap-x-4 gap-y-3 border-b border-line pb-4">
        <div className="-mx-1 min-w-0 max-w-[calc(100%+8px)] overflow-x-auto px-1 py-0.5">
          <Segmented options={filterOptions} value={filter} onChange={setFilter} label="Filtrer par type" />
        </div>
        <Switch checked={showDisabled} onChange={setShowDisabled} label="Afficher les désactivés" className="sm:ml-auto" />
      </div>

      {updates > 0 ? (
        <p className="mt-4 flex items-center gap-2 rounded-xl bg-honey-soft/70 px-3.5 py-2.5 text-[13px] text-[#6d4a1d]">
          <FolderGit2 className="h-4 w-4 shrink-0" aria-hidden />
          {updates === 1 ? "Un skill a une version plus récente dans le dépôt." : `${updates} skills ont une version plus récente dans le dépôt.`} Ouvrez-le pour comparer et choisir.
        </p>
      ) : null}

      <div className="mt-5">
        {error && !data ? (
          <EmptyState
            icon={<Library className="h-6 w-6" />}
            title="Les skills n'ont pas pu être chargés"
            action={
              <Button icon={<RefreshCw className="h-4 w-4" />} onClick={() => void reload()}>
                Réessayer
              </Button>
            }
          >
            {error}
          </EmptyState>
        ) : loading && !data ? (
          <SkeletonGrid />
        ) : visible.length === 0 ? (
          <EmptyState
            icon={<Library className="h-6 w-6" />}
            title={q ? "Aucun skill ne correspond" : "Aucun skill de ce type"}
            action={
              q ? (
                <Button onClick={() => setQ("")}>Effacer le filtre</Button>
              ) : (
                <Button icon={<Plus className="h-4 w-4" />} onClick={() => setCreating(true)}>
                  Créer un skill
                </Button>
              )
            }
          >
            {q ? "Essayez un autre mot, ou affichez les skills désactivés." : "Créez-en un : l'agent saura l'appliquer dès qu'il est enregistré."}
          </EmptyState>
        ) : (
          <div className="space-y-8">
            {groups.map((g) => (
              <section key={g.id} aria-labelledby={g.label ? `grp-${g.id}` : undefined}>
                {g.label ? (
                  <h2 id={`grp-${g.id}`} className="label-eyebrow mb-3 flex items-center gap-2">
                    <span className="h-1.5 w-1.5 rounded-full bg-chestnut" aria-hidden />
                    {g.label}
                    <span className="font-normal tracking-normal text-faint">{g.items.length}</span>
                  </h2>
                ) : null}
                <ul className="grid grid-cols-[repeat(auto-fill,minmax(min(100%,330px),1fr))] gap-3">
                  {g.items.map((s) => (
                    <li key={s.slug} className="flex">
                      <SkillCard skill={s} />
                    </li>
                  ))}
                </ul>
              </section>
            ))}
          </div>
        )}
      </div>

      <p className="mt-10 flex items-start gap-2 text-[12px] leading-relaxed text-faint">
        <FolderGit2 className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden />
        <span>
          « Dépôt » : écrit par Robin dans le code de l'Atelier. Vos améliorations ici ne sont jamais écrasées : quand le dépôt change, l'Atelier vous le signale et vous choisissez.
        </span>
      </p>

      <NewSkillDialog open={creating} onClose={() => setCreating(false)} skills={skills} initialKind={initialKind} />
    </div>
  );
}

function SkillCard({ skill }: { skill: Skill }) {
  const { clients } = useShell();
  const d = (skill.data ?? {}) as MontageStyleData;
  const summary = skill.kind === "montage" ? montageSummary(skill.data) : [];
  const icons = { pacing: Gauge, duration: Timer, transition: Shuffle, look: Palette };
  const colors = d.colors ? [d.colors.background, d.colors.plate, d.colors.accent, d.colors.text].filter((c) => typeof c === "string") : [];
  return (
    <Link
      href={`/skills/${skill.slug}`}
      className={cx(
        "group flex w-full flex-col rounded-card border border-line bg-surface p-4 transition-[box-shadow,border-color] duration-base hover:border-line-strong hover:shadow-card focus-visible:shadow-card",
        !skill.enabled && "bg-surface/60",
      )}
    >
      <div className={cx("flex items-start gap-3", !skill.enabled && "opacity-60")}>
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-sunken text-chestnut transition-colors group-hover:bg-select">
          <KindIcon kind={skill.kind} />
        </span>
        <div className="min-w-0 flex-1">
          <h3 className="truncate text-[14.5px] font-semibold text-ink" title={skill.name}>
            {skill.name}
          </h3>
          <p className="mt-1 line-clamp-3 text-[12.5px] leading-relaxed text-muted">{skill.description || <span className="italic text-faint">Pas encore de description.</span>}</p>
        </div>
      </div>

      {summary.length > 0 || (d.structure?.length ?? 0) > 0 ? (
        <div className={cx("mt-3 space-y-2 rounded-xl bg-canvas px-3 py-2.5", !skill.enabled && "opacity-60")}>
          {summary.length > 0 ? (
            <p className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[12px] text-ink">
              {summary.map((part) => {
                const Icon = icons[part.kind];
                return (
                  <span key={part.kind} className="inline-flex items-center gap-1" title={part.title}>
                    <Icon className="h-3.5 w-3.5 text-faint" aria-hidden />
                    <span className="sr-only">{part.title} : </span>
                    {part.text}
                  </span>
                );
              })}
            </p>
          ) : null}
          {d.structure?.length ? (
            <div className="flex items-center gap-2.5">
              <div className="min-w-0 flex-1">
                <StructureTimeline structure={d.structure} target={d.targetDurationS} compact />
              </div>
              <span className="shrink-0 text-2xs text-muted">{d.structure.length} plan{d.structure.length > 1 ? "s" : ""}</span>
              {colors.length ? (
                <span className="flex shrink-0 -space-x-1" aria-hidden>
                  {colors.map((c, i) => (
                    <span key={i} className="h-3.5 w-3.5 rounded-full border border-surface ring-1 ring-ink/15" style={{ backgroundColor: c }} />
                  ))}
                </span>
              ) : null}
            </div>
          ) : null}
        </div>
      ) : null}

      <div className="mt-3 flex flex-wrap items-center gap-1.5">
        <KindBadge kind={skill.kind} />
        <ClientSkillBadge clientName={skill.clientId ? clients.find((c) => c.id === skill.clientId)?.name ?? "autre client" : null} />
        <SourceBadge source={skill.source} />
        <StateBadges skill={skill} />
      </div>

      <div className="mt-auto pt-3">
        <p className="truncate border-t border-line pt-2.5 text-2xs text-faint">
          <span className="font-semibold text-muted">v{skill.version}</span> · {lastChangeLabel(skill, (iso) => formatRelative(iso))}
        </p>
      </div>
    </Link>
  );
}

function SkeletonGrid() {
  return (
    <div className="space-y-8" aria-busy="true" aria-label="Chargement des skills">
      {[0, 1].map((g) => (
        <div key={g}>
          <div className="skeleton mb-3 h-3 w-32" />
          <div className="grid grid-cols-[repeat(auto-fill,minmax(min(100%,330px),1fr))] gap-3">
            {Array.from({ length: g === 0 ? 3 : 2 }).map((_, i) => (
              <div key={i} className="rounded-card border border-line bg-surface p-4">
                <div className="flex gap-3">
                  <div className="skeleton h-9 w-9 rounded-full" />
                  <div className="flex-1 space-y-2">
                    <div className="skeleton h-4 w-2/3" />
                    <div className="skeleton h-3 w-full" />
                    <div className="skeleton h-3 w-5/6" />
                  </div>
                </div>
                <div className="mt-4 flex gap-1.5">
                  <div className="skeleton h-5 w-24 rounded-full" />
                  <div className="skeleton h-5 w-16 rounded-full" />
                </div>
                <div className="skeleton mt-4 h-3 w-1/2" />
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
