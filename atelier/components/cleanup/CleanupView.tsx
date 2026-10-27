"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Check, Columns2, EyeOff, RefreshCw, Sparkles, Star, Trash2, X } from "lucide-react";
import { MediaThumb } from "@/components/cleanup/MediaThumb";
import { CompareDialog } from "@/components/cleanup/CompareDialog";
import { useScreenContext } from "@/components/shell/ShellContext";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { useToast } from "@/components/ui/Toast";
import { cx } from "@/components/ui/cx";
import { api, errorMessage } from "@/lib/client/api";
import { emitRefresh } from "@/lib/client/refresh";
import { useResource } from "@/lib/client/use-resource";
import { formatBytes, formatRelative, plural } from "@/lib/shared/format";
import { CLEANUP_LABEL } from "@/lib/shared/labels";
import type { Asset, CleanupGroup, CleanupKind, CleanupReport } from "@/lib/shared/types";

const DUP_KINDS: CleanupKind[] = ["exact_duplicates", "near_duplicates"];
const ISSUE_KINDS: CleanupKind[] = ["blurry", "underexposed", "overexposed", "low_resolution", "short_video"];
const ALL_KINDS = [...DUP_KINDS, ...ISSUE_KINDS];

const KIND_HINT: Record<CleanupKind, string> = {
  exact_duplicates: "Le même fichier importé plusieurs fois. On garde l'original le plus ancien.",
  near_duplicates: "Des photos presque identiques (recadrées, recompressées, éclaircies). On garde la plus nette, en meilleure résolution.",
  blurry: "Netteté nettement sous celle de vos autres photos (bougé, mise au point manquée).",
  underexposed: "Images très sombres ou aux noirs bouchés.",
  overexposed: "Images très claires ou aux blancs brûlés.",
  low_resolution: "Trop petites pour Instagram : moins de 1080 px pour une photo, 720 px pour une vidéo.",
  short_video: "Vidéos de moins de 2 secondes, souvent déclenchées par erreur.",
};

type Filter = "all" | CleanupKind;

/** Ménage : doublons, quasi-doublons, photos floues, sombres, claires, petites, vidéos très courtes. */
export function CleanupView() {
  const report = useResource<CleanupReport>("/api/cleanup", ["assets", "cleanup"]);
  const toast = useToast();
  const [filter, setFilter] = useState<Filter>("all");
  const [rescanning, setRescanning] = useState(false);
  const [busy, setBusy] = useState(false);
  /** Médias cochés pour la corbeille dans chaque groupe de doublons. */
  const [dupChoice, setDupChoice] = useState<Record<string, string[]>>({});
  /** Médias cochés dans les listes de problèmes individuels. */
  const [picked, setPicked] = useState<Set<string>>(new Set());
  const [comparing, setComparing] = useState<CleanupGroup | null>(null);

  const data = report.data;

  // Choix par défaut des groupes de doublons : tout sauf la copie conseillée et les favoris.
  useEffect(() => {
    if (!data) return;
    setDupChoice((prev) => {
      const next: Record<string, string[]> = {};
      for (const g of data.groups) {
        if (!DUP_KINDS.includes(g.kind)) continue;
        const kept = prev[g.id]?.filter((id) => g.assetIds.includes(id));
        next[g.id] = kept && kept.length > 0 ? kept : g.assetIds.filter((id) => id !== g.keepId && !data.assets[id]?.starred);
      }
      return next;
    });
    setPicked((prev) => new Set([...prev].filter((id) => data.assets[id])));
  }, [data]);

  const byKind = useMemo(() => {
    const m = new Map<CleanupKind, CleanupGroup[]>();
    for (const k of ALL_KINDS) m.set(k, []);
    for (const g of data?.groups ?? []) m.get(g.kind)?.push(g);
    return m;
  }, [data]);

  /** Médias proposés par type, recalculés depuis les groupes affichés (à jour après une action). */
  const counts = useMemo(() => {
    const c = Object.fromEntries(ALL_KINDS.map((k) => [k, 0])) as Record<CleanupKind, number>;
    for (const g of data?.groups ?? []) c[g.kind] += g.assetIds.filter((id) => id !== g.keepId).length;
    return c;
  }, [data]);

  const total = useMemo(() => {
    const s = new Set<string>();
    for (const g of data?.groups ?? []) for (const id of g.assetIds) if (id !== g.keepId) s.add(id);
    return s.size;
  }, [data]);

  useScreenContext({ page: "menage", selectedAssetIds: [...picked].slice(0, 50) });

  /** Retire tout de suite des médias du rapport affiché (le serveur recalcule ensuite). */
  const dropLocally = useCallback(
    (ids: string[]) => {
      const gone = new Set(ids);
      report.mutate((prev) => {
        if (!prev) return prev as unknown as CleanupReport;
        const groups = prev.groups
          .map((g) => ({ ...g, assetIds: g.assetIds.filter((id) => !gone.has(id)) }))
          .filter((g) => (g.keepId ? g.assetIds.length > 1 : g.assetIds.length > 0));
        return { ...prev, groups };
      });
      setPicked((prev) => new Set([...prev].filter((id) => !gone.has(id))));
    },
    [report],
  );

  const refreshAll = () => emitRefresh("assets", "cleanup", "stats");

  const trash = useCallback(
    async (ids: string[], what?: string) => {
      if (ids.length === 0) return;
      setBusy(true);
      try {
        const bytes = ids.reduce((s, id) => s + (data?.assets[id]?.sizeBytes ?? 0), 0);
        await api.post("/api/assets/bulk", { ids, op: { action: "trash" } });
        dropLocally(ids);
        refreshAll();
        toast(`${what ?? plural(ids.length, "média")} à la corbeille · ${formatBytes(bytes)} libérés`, {
          action: {
            label: "Annuler",
            onClick: async () => {
              try {
                await api.post("/api/assets/bulk", { ids, op: { action: "restore" } });
                refreshAll();
                toast("Médias restaurés.", { tone: "info" });
              } catch (err) {
                toast(errorMessage(err), { tone: "error" });
              }
            },
          },
          durationMs: 7000,
        });
      } catch (err) {
        toast(errorMessage(err), { tone: "error" });
      } finally {
        setBusy(false);
      }
    },
    [data, dropLocally, toast],
  );

  const ignore = useCallback(
    async (ids: string[], message: string) => {
      if (ids.length === 0) return;
      setBusy(true);
      try {
        await api.post("/api/cleanup/ignore", { ids });
        dropLocally(ids);
        refreshAll();
        toast(message, {
          action: {
            label: "Annuler",
            onClick: async () => {
              try {
                await api.del(`/api/cleanup/ignore?ids=${ids.join(",")}`);
                refreshAll();
              } catch (err) {
                toast(errorMessage(err), { tone: "error" });
              }
            },
          },
          durationMs: 7000,
        });
      } catch (err) {
        toast(errorMessage(err), { tone: "error" });
      } finally {
        setBusy(false);
      }
    },
    [dropLocally, toast],
  );

  const rescan = async () => {
    setRescanning(true);
    try {
      const fresh = await api.get<CleanupReport>("/api/cleanup?fresh=1");
      report.mutate(fresh);
      emitRefresh("stats");
      const n = new Set(fresh.groups.flatMap((g) => g.assetIds.filter((id) => id !== g.keepId))).size;
      toast(n > 0 ? `Analyse terminée : ${plural(n, "suggestion")}.` : "Analyse terminée : tout est rangé.", { tone: "info" });
    } catch (err) {
      toast(errorMessage(err), { tone: "error" });
    } finally {
      setRescanning(false);
    }
  };

  const reclaimable = useMemo(() => {
    const s = new Set<string>();
    for (const g of data?.groups ?? []) for (const id of g.assetIds) if (id !== g.keepId) s.add(id);
    return [...s].reduce((sum, id) => sum + (data?.assets[id]?.sizeBytes ?? 0), 0);
  }, [data]);

  useEffect(() => {
    if (filter !== "all" && data && counts[filter] === 0) setFilter("all");
  }, [filter, counts, data]);

  const visibleKinds = filter === "all" ? ALL_KINDS : [filter];
  const pickedBytes = [...picked].reduce((s, id) => s + (data?.assets[id]?.sizeBytes ?? 0), 0);

  return (
    <div className="mx-auto max-w-[1240px] px-4 pb-16 pt-6 sm:px-6 lg:px-8">
      <header className="flex flex-wrap items-end justify-between gap-x-6 gap-y-4">
        <div className="min-w-0 max-w-2xl">
          <h1 className="page-title">Ménage</h1>
          <p className="mt-1.5 text-[13.5px] leading-relaxed text-muted" aria-live="polite">
            {data ? (
              total > 0 ? (
                <>
                  <span className="font-semibold text-ink">{plural(total, "suggestion")}</span> · {formatBytes(reclaimable)} à libérer
                  <span className="text-faint"> · analysé {formatRelative(data.generatedAt)}</span>
                </>
              ) : (
                "Aucune suggestion pour le moment."
              )
            ) : report.error ? (
              "Analyse indisponible."
            ) : (
              <span className="skeleton inline-block h-4 w-56 align-middle" />
            )}
          </p>
        </div>
        <Button variant="primary" icon={<RefreshCw className={cx("h-4 w-4", rescanning && "animate-spin")} />} onClick={() => void rescan()} disabled={rescanning}>
          Relancer l&apos;analyse
        </Button>
      </header>

      <p className="mt-4 flex items-start gap-2 rounded-xl bg-sunken/60 px-3.5 py-2.5 text-[12.5px] leading-relaxed text-muted">
        <Sparkles className="mt-0.5 h-3.5 w-3.5 shrink-0 text-chestnut" aria-hidden />
        <span>
          Pas besoin de l&apos;IA ici : l&apos;analyse s&apos;appuie sur les mesures prises à l&apos;import (empreinte du fichier, empreinte visuelle, netteté, exposition, taille). Rien n&apos;est supprimé
          définitivement : tout passe par la <Link href="/corbeille" className="font-semibold text-chestnut underline-offset-2 hover:underline">corbeille</Link>.
        </span>
      </p>

      {data && total > 0 ? (
        <div className="-mx-1 mt-5 overflow-x-auto px-1 pb-1">
          <div role="tablist" aria-label="Types de suggestions" className="flex w-max gap-1.5">
            <FilterChip active={filter === "all"} onClick={() => setFilter("all")} label="Tout" count={total} />
            {ALL_KINDS.filter((k) => counts[k] > 0).map((k) => (
              <FilterChip key={k} active={filter === k} onClick={() => setFilter(k)} label={CLEANUP_LABEL[k]} count={counts[k]} />
            ))}
          </div>
        </div>
      ) : null}

      {picked.size > 0 ? (
        <div className="sticky top-2 z-10 mt-4">
          <div role="region" aria-label="Sélection" className="flex w-full flex-wrap items-center gap-2 rounded-2xl border border-line bg-surface px-3 py-2 shadow-card sm:flex-nowrap sm:rounded-full sm:pl-5">
            <p className="mr-auto text-[13px] text-ink">
              <span className="font-semibold">{picked.size} sélectionné{picked.size > 1 ? "s" : ""}</span>
              <span className="text-muted"> · {formatBytes(pickedBytes)}</span>
            </p>
            <Button size="sm" variant="ghost" icon={<X className="h-3.5 w-3.5" />} onClick={() => setPicked(new Set())}>
              Désélectionner
            </Button>
            <Button size="sm" variant="secondary" icon={<EyeOff className="h-3.5 w-3.5" />} disabled={busy} onClick={() => void ignore([...picked], `${plural(picked.size, "média")} gardé${picked.size > 1 ? "s" : ""} : plus proposé${picked.size > 1 ? "s" : ""} au ménage.`)}>
              Ignorer
            </Button>
            <Button size="sm" variant="danger" icon={<Trash2 className="h-3.5 w-3.5" />} loading={busy} onClick={() => void trash([...picked])}>
              Mettre la sélection à la corbeille
            </Button>
          </div>
        </div>
      ) : null}
      <div className="mt-6">
        {report.error && !data ? (
          <EmptyState icon={<RefreshCw className="h-6 w-6" />} title="L'analyse n'a pas pu se charger" action={<Button onClick={() => void report.reload()}>Réessayer</Button>}>
            {report.error}
          </EmptyState>
        ) : !data ? (
          <CleanupSkeleton />
        ) : total === 0 ? (
          <EmptyState icon={<Check className="h-6 w-6" />} title="Tout est rangé">
            Pas de doublon, pas de photo ratée en vue. Revenez après votre prochain import : l&apos;analyse se met à jour toute seule.
          </EmptyState>
        ) : (
          <div className="space-y-10">
            {visibleKinds.map((kind) => {
              const groups = byKind.get(kind) ?? [];
              if (groups.length === 0) return null;
              return DUP_KINDS.includes(kind) ? (
                <section key={kind} aria-labelledby={`k-${kind}`}>
                  <SectionHead id={`k-${kind}`} kind={kind} count={counts[kind]} />
                  <ul className="space-y-3">
                    {groups.map((g) => (
                      <DuplicateGroupRow
                        key={g.id}
                        group={g}
                        assets={data.assets}
                        choice={dupChoice[g.id] ?? []}
                        busy={busy}
                        onToggle={(id) =>
                          setDupChoice((prev) => {
                            const cur = new Set(prev[g.id] ?? []);
                            if (cur.has(id)) cur.delete(id);
                            else if (cur.size < g.assetIds.length - 1) cur.add(id);
                            else toast("Gardez au moins une copie.", { tone: "info" });
                            return { ...prev, [g.id]: [...cur] };
                          })
                        }
                        onApply={() => void trash(dupChoice[g.id] ?? [], plural((dupChoice[g.id] ?? []).length, "copie"))}
                        onKeepAll={() => void ignore(g.assetIds, "Groupe gardé tel quel : il ne sera plus proposé.")}
                        onCompare={() => setComparing(g)}
                      />
                    ))}
                  </ul>
                </section>
              ) : (
                <section key={kind} aria-labelledby={`k-${kind}`}>
                  <SectionHead
                    id={`k-${kind}`}
                    kind={kind}
                    count={counts[kind]}
                    action={
                      <SelectAllButton
                        ids={groups.flatMap((g) => g.assetIds)}
                        picked={picked}
                        onChange={(ids, on) =>
                          setPicked((prev) => {
                            const next = new Set(prev);
                            for (const id of ids) {
                              if (on) next.add(id);
                              else next.delete(id);
                            }
                            return next;
                          })
                        }
                      />
                    }
                  />
                  <ul className="grid grid-cols-2 gap-3 sm:grid-cols-[repeat(auto-fill,minmax(176px,1fr))]">
                    {groups.map((g) => {
                      const a = data.assets[g.assetIds[0]];
                      if (!a) return null;
                      return (
                        <IssueCard
                          key={g.id}
                          asset={a}
                          reason={g.reason}
                          checked={picked.has(a.id)}
                          onToggle={() =>
                            setPicked((prev) => {
                              const next = new Set(prev);
                              if (next.has(a.id)) next.delete(a.id);
                              else next.add(a.id);
                              return next;
                            })
                          }
                        />
                      );
                    })}
                  </ul>
                </section>
              );
            })}
          </div>
        )}
      </div>


      <CompareDialog
        group={comparing}
        assets={data?.assets ?? {}}
        open={comparing !== null}
        onClose={() => setComparing(null)}
        onKeep={(keepId) => {
          const g = comparing;
          setComparing(null);
          if (g) void trash(g.assetIds.filter((id) => id !== keepId), plural(g.assetIds.length - 1, "copie"));
        }}
      />
    </div>
  );
}

// ---------------------------------------------------------------------------------------------

function FilterChip({ active, onClick, label, count }: { active: boolean; onClick: () => void; label: string; count: number }) {
  return (
    <button
      type="button"
      role="tab"
      aria-selected={active}
      onClick={onClick}
      className={cx("inline-flex h-8 items-center gap-1.5 whitespace-nowrap rounded-full px-3.5 text-[12.5px] font-semibold transition-colors", active ? "bg-ink text-surface" : "bg-sunken text-ink hover:bg-hover")}
    >
      {label}
      <span className={cx("tabular-nums", active ? "text-surface/70" : "text-muted")}>{count}</span>
    </button>
  );
}

function SectionHead({ id, kind, count, action }: { id: string; kind: CleanupKind; count: number; action?: React.ReactNode }) {
  return (
    <div className="mb-3 flex flex-wrap items-end justify-between gap-2">
      <div>
        <h2 id={id} className="label-eyebrow flex items-center gap-2">
          <span className="h-1.5 w-1.5 rounded-full bg-chestnut" aria-hidden />
          {CLEANUP_LABEL[kind]}
          <span className="font-normal tracking-normal text-faint">{count}</span>
        </h2>
        <p className="mt-1 text-[12.5px] text-muted">{KIND_HINT[kind]}</p>
      </div>
      {action}
    </div>
  );
}

function SelectAllButton({ ids, picked, onChange }: { ids: string[]; picked: Set<string>; onChange: (ids: string[], on: boolean) => void }) {
  const all = ids.length > 0 && ids.every((id) => picked.has(id));
  return (
    <Button size="sm" variant="ghost" onClick={() => onChange(ids, !all)}>
      {all ? "Tout désélectionner" : "Tout sélectionner"}
    </Button>
  );
}

function DuplicateGroupRow({
  group,
  assets,
  choice,
  busy,
  onToggle,
  onApply,
  onKeepAll,
  onCompare,
}: {
  group: CleanupGroup;
  assets: Record<string, Asset>;
  choice: string[];
  busy: boolean;
  onToggle: (id: string) => void;
  onApply: () => void;
  onKeepAll: () => void;
  onCompare: () => void;
}) {
  const chosen = new Set(choice);
  const isDefault = choice.length === group.assetIds.length - 1 && !chosen.has(group.keepId ?? "");
  const bytes = choice.reduce((s, id) => s + (assets[id]?.sizeBytes ?? 0), 0);
  return (
    <li className="rounded-card border border-line bg-surface p-3 sm:p-4">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
        <div className="-mx-1 min-w-0 flex-1 overflow-x-auto px-1 py-1">
          <ul className="flex w-max gap-2.5">
            {group.assetIds.map((id) => {
              const a = assets[id];
              if (!a) return null;
              const trashIt = chosen.has(id);
              const keep = id === group.keepId;
              return (
                <li key={id} className="w-[132px] sm:w-[148px]">
                  <label className={cx("group relative block cursor-pointer overflow-hidden rounded-xl ring-offset-2 ring-offset-surface focus-within:ring-2 focus-within:ring-chestnut", !trashIt && "ring-2 ring-olive/60")}>
                    <input type="checkbox" className="peer sr-only" checked={trashIt} onChange={() => onToggle(id)} aria-label={`${trashIt ? "Ne pas mettre" : "Mettre"} « ${a.name} » à la corbeille`} />
                    <MediaThumb asset={a} className={cx("aspect-square w-full transition-opacity", trashIt && "opacity-60")} />
                    <span className={cx("absolute left-1.5 top-1.5 flex h-6 w-6 items-center justify-center rounded-full border-2", trashIt ? "border-terracotta bg-terracotta text-surface" : "border-surface/90 bg-night/25 text-transparent")}>
                      <Trash2 className="h-3 w-3" aria-hidden />
                    </span>
                    {keep ? (
                      <span className="absolute bottom-1.5 left-1.5">
                        <Badge tone="olive">
                          <Check className="h-3 w-3" aria-hidden />À garder
                        </Badge>
                      </span>
                    ) : null}
                    {a.starred ? <Star className="absolute right-1.5 top-1.5 h-4 w-4 fill-honey text-honey drop-shadow" aria-label="Favori" /> : null}
                  </label>
                  <p className="mt-1 truncate text-[11.5px] text-muted" title={a.name}>
                    {a.name}
                  </p>
                  <p className="text-2xs text-faint">
                    {a.width && a.height ? `${a.width}×${a.height} · ` : ""}
                    {formatBytes(a.sizeBytes)}
                  </p>
                </li>
              );
            })}
          </ul>
        </div>
        <div className="flex shrink-0 flex-col gap-2 lg:w-60">
          <p className="text-[12.5px] leading-snug text-muted">{group.reason}.</p>
          <div className="flex flex-wrap gap-2">
            <Button size="sm" variant="accent" icon={<Check className="h-3.5 w-3.5" />} disabled={busy || choice.length === 0} onClick={onApply}>
              {isDefault ? "Garder la meilleure" : `Retirer ${choice.length}`}
            </Button>
            <Button size="sm" variant="secondary" onClick={onKeepAll} disabled={busy}>
              Tout garder
            </Button>
            {group.assetIds.length >= 2 ? (
              <Button size="sm" variant="ghost" icon={<Columns2 className="h-3.5 w-3.5" />} onClick={onCompare}>
                Comparer
              </Button>
            ) : null}
          </div>
          {choice.length > 0 ? <p className="text-2xs text-faint">{formatBytes(bytes)} libérés</p> : null}
        </div>
      </div>
    </li>
  );
}

function IssueCard({ asset, reason, checked, onToggle }: { asset: Asset; reason: string; checked: boolean; onToggle: () => void }) {
  return (
    <li>
      <label className={cx("group block cursor-pointer rounded-xl ring-offset-2 ring-offset-canvas focus-within:ring-2 focus-within:ring-chestnut")}>
        <span className={cx("relative block overflow-hidden rounded-xl", checked && "ring-[3px] ring-chestnut")}>
          <input type="checkbox" className="sr-only" checked={checked} onChange={onToggle} aria-label={`Sélectionner « ${asset.name} »`} />
          <MediaThumb asset={asset} className="aspect-[4/3] w-full" />
          <span className={cx("absolute left-2 top-2 flex h-6 w-6 items-center justify-center rounded-full border-2 transition-colors", checked ? "border-chestnut bg-chestnut text-surface" : "border-surface/90 bg-night/25 text-transparent group-hover:bg-night/40")}>
            <Check className="h-3.5 w-3.5" aria-hidden />
          </span>
        </span>
        <span className="mt-1.5 block truncate text-[12.5px] font-semibold text-ink" title={asset.name}>
          {asset.name}
        </span>
        <span className="block text-[12px] leading-snug text-muted">{reason}</span>
      </label>
    </li>
  );
}

function CleanupSkeleton() {
  return (
    <div className="space-y-4" aria-hidden>
      <div className="skeleton h-4 w-40" />
      {[0, 1].map((i) => (
        <div key={i} className="flex gap-2.5 rounded-card border border-line bg-surface p-4">
          {[0, 1, 2].map((j) => (
            <div key={j} className="skeleton aspect-square w-[132px] rounded-xl" />
          ))}
        </div>
      ))}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-[repeat(auto-fill,minmax(176px,1fr))]">
        {Array.from({ length: 6 }, (_, i) => (
          <div key={i} className="skeleton aspect-[4/3] rounded-xl" />
        ))}
      </div>
    </div>
  );
}
