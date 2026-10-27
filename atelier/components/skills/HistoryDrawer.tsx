"use client";

import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, FolderGit2, History, RefreshCw, RotateCcw } from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { cx } from "@/components/ui/cx";
import { Spinner } from "@/components/ui/Spinner";
import { Drawer, Segmented } from "@/components/skills/controls";
import { SkillDiff } from "@/components/skills/DiffView";
import { useResource } from "@/lib/client/use-resource";
import { prettyJson } from "@/lib/client/skills/diff";
import { Markdown } from "@/lib/client/skills/markdown";
import { formatDateTime, formatRelative } from "@/lib/shared/format";
import type { Skill, SkillVersion } from "@/lib/shared/types";

function authorLabel(v: SkillVersion): string {
  if (v.createdBy) return v.createdBy;
  if (v.note && /dépôt/i.test(v.note)) return "Dépôt";
  return "Atelier";
}

/** Historique des versions : liste, contenu en lecture seule, différences avec la version actuelle, retour arrière. */
export function HistoryDrawer({ open, onClose, skill, onRevert, reverting }: { open: boolean; onClose: () => void; skill: Skill; onRevert: (v: SkillVersion) => void; reverting: boolean }) {
  const { data, error, loading, reload } = useResource<{ versions: SkillVersion[] }>(open ? `/api/skills/${encodeURIComponent(skill.slug)}/versions` : null, ["skills"]);
  const versions = useMemo(() => data?.versions ?? [], [data]);
  const [selected, setSelected] = useState<number | null>(null);
  const [tab, setTab] = useState<"diff" | "content">("diff");
  const [mobileDetail, setMobileDetail] = useState(false);

  useEffect(() => {
    if (!open) {
      setMobileDetail(false);
      return;
    }
    if (versions.length && (selected === null || !versions.some((v) => v.version === selected))) {
      setSelected(versions.find((v) => v.version !== skill.version)?.version ?? versions[0].version);
    }
  }, [open, versions, selected, skill.version]);

  const v = versions.find((x) => x.version === selected) ?? null;
  const isCurrent = v?.version === skill.version;

  return (
    <Drawer
      open={open}
      onClose={onClose}
      title={
        <span className="flex items-center gap-2">
          <History className="h-4 w-4 text-chestnut" aria-hidden />
          Historique <span className="font-normal text-muted">· {skill.name}</span>
        </span>
      }
    >
      <div className="grid h-full md:grid-cols-[270px_minmax(0,1fr)]">
        <nav aria-label="Versions" className={cx("min-h-0 overflow-y-auto border-line md:block md:border-r", mobileDetail ? "hidden" : "block")}>
          {loading && !data ? (
            <div className="flex justify-center py-10">
              <Spinner />
            </div>
          ) : error && !data ? (
            <div className="space-y-2 p-4 text-[13px] text-muted">
              <p>{error}</p>
              <Button size="sm" icon={<RefreshCw className="h-4 w-4" />} onClick={() => void reload()}>
                Réessayer
              </Button>
            </div>
          ) : (
            <ol className="space-y-0.5 p-2">
              {versions.map((x) => {
                const on = x.version === selected;
                return (
                  <li key={x.id}>
                    <button
                      type="button"
                      aria-current={on ? "true" : undefined}
                      onClick={() => {
                        setSelected(x.version);
                        setMobileDetail(true);
                      }}
                      className={cx("w-full rounded-xl px-3 py-2.5 text-left transition-colors", on ? "bg-select" : "hover:bg-hover")}
                    >
                      <span className="flex items-center gap-2">
                        <span className={cx("font-mono text-[12.5px] font-bold", on ? "text-chestnut" : "text-ink")}>v{x.version}</span>
                        {x.version === skill.version ? <Badge tone="olive">Actuelle</Badge> : null}
                        <span className="ml-auto text-[11.5px] text-faint" title={formatDateTime(x.createdAt)}>
                          {formatRelative(x.createdAt)}
                        </span>
                      </span>
                      <span className="mt-0.5 line-clamp-2 block text-[12.5px] text-ink">{x.note || <span className="italic text-faint">Sans note</span>}</span>
                      <span className="mt-0.5 flex items-center gap-1 text-[11.5px] text-muted">
                        {authorLabel(x) === "Dépôt" ? <FolderGit2 className="h-3 w-3" aria-hidden /> : null}
                        {authorLabel(x)}
                      </span>
                    </button>
                  </li>
                );
              })}
            </ol>
          )}
        </nav>

        <section className={cx("min-h-0 overflow-y-auto", mobileDetail ? "block" : "hidden md:block")} aria-live="polite">
          {v ? (
            <div className="space-y-4 p-4 sm:p-5">
              <button type="button" onClick={() => setMobileDetail(false)} className="flex items-center gap-1.5 text-[13px] font-semibold text-chestnut md:hidden">
                <ArrowLeft className="h-4 w-4" aria-hidden /> Toutes les versions
              </button>
              <header className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <h3 className="flex items-center gap-2 text-[16px] font-semibold text-ink">
                    Version {v.version}
                    {isCurrent ? <Badge tone="olive">Actuelle</Badge> : null}
                  </h3>
                  <p className="text-[12.5px] text-muted">
                    {formatDateTime(v.createdAt)} · {authorLabel(v)}
                  </p>
                  {v.note ? <p className="mt-1.5 max-w-prose text-[13px] text-ink">« {v.note} »</p> : null}
                </div>
                {isCurrent ? (
                  <p className="rounded-full bg-sunken px-3 py-1.5 text-[12px] text-muted">C'est la version en service</p>
                ) : (
                  <Button icon={<RotateCcw className="h-4 w-4" />} loading={reverting} onClick={() => onRevert(v)}>
                    Revenir à cette version
                  </Button>
                )}
              </header>

              <Segmented
                label="Affichage"
                size="sm"
                options={[
                  { id: "diff", label: isCurrent ? "Différences" : "Différences avec l'actuelle" },
                  { id: "content", label: "Contenu" },
                ]}
                value={tab}
                onChange={setTab}
              />

              {tab === "diff" ? (
                isCurrent ? (
                  <p className="rounded-xl border border-dashed border-line-strong px-4 py-6 text-center text-[13px] text-muted">Choisissez une version plus ancienne pour voir ce qui a changé depuis.</p>
                ) : (
                  <SkillDiff a={v} b={skill} aLabel={`Version ${v.version}`} bLabel={`Actuelle (v${skill.version})`} />
                )
              ) : (
                <div className="space-y-4">
                  <div>
                    <p className="label-eyebrow mb-1">Nom</p>
                    <p className="text-[14px] font-semibold text-ink">{v.name}</p>
                  </div>
                  <div>
                    <p className="label-eyebrow mb-1">Description</p>
                    <p className="text-[13.5px] leading-relaxed text-ink">{v.description || <span className="italic text-faint">Vide</span>}</p>
                  </div>
                  <div>
                    <p className="label-eyebrow mb-1">Consignes</p>
                    <div className="rounded-xl border border-line bg-canvas/40 px-4 py-3">{v.body.trim() ? <Markdown source={v.body} /> : <p className="italic text-faint">Vides</p>}</div>
                  </div>
                  {v.data ? (
                    <div>
                      <p className="label-eyebrow mb-1">Paramètres</p>
                      <pre className="overflow-x-auto rounded-xl border border-line bg-sunken/50 p-3 font-mono text-[12px] leading-relaxed text-ink">{prettyJson(v.data)}</pre>
                    </div>
                  ) : null}
                  {Object.keys(v.files).length ? (
                    <div>
                      <p className="label-eyebrow mb-1">Fichiers annexes</p>
                      <ul className="space-y-1 text-[13px]">
                        {Object.entries(v.files).map(([n, t]) => (
                          <li key={n}>
                            <span className="font-mono font-semibold">{n}</span> <span className="text-faint">· {t.split("\n").length} lignes</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  ) : null}
                  <p className="text-[12.5px] text-muted">
                    {v.referenceAssetIds.length} média{v.referenceAssetIds.length > 1 ? "s" : ""} de référence
                  </p>
                </div>
              )}
            </div>
          ) : loading ? null : (
            <p className="p-6 text-[13px] text-muted">Aucune version.</p>
          )}
        </section>
      </div>
    </Drawer>
  );
}
