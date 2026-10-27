"use client";

import { useMemo, useState } from "react";
import { ChevronsUpDown } from "lucide-react";
import { cx } from "@/components/ui/cx";
import { chunkDiff, diffStats, diffText, prettyJson, sameJson, type DiffLine } from "@/lib/client/skills/diff";

/** Contenu comparable d'un skill (version, dépôt, état actuel). */
export interface ComparableSkill {
  name: string;
  description: string;
  body: string;
  data: Record<string, unknown> | null;
  files: Record<string, string>;
  referenceAssetIds?: string[];
}

/** Diff ligne à ligne : lignes retirées sur fond terracotta clair, ajoutées sur fond olive clair. */
export function DiffBlock({ before, after }: { before: string; after: string }) {
  const lines = useMemo(() => diffText(before, after), [before, after]);
  const chunks = useMemo(() => chunkDiff(lines, 3), [lines]);
  const [opened, setOpened] = useState<Set<number>>(new Set());
  return (
    <div className="overflow-x-auto rounded-lg border border-line bg-surface">
      <table className="w-full border-collapse font-mono text-[12px] leading-[1.6]">
        <tbody>
          {chunks.map((c, ci) =>
            c.kind === "skip" && !opened.has(ci) ? (
              <tr key={ci}>
                <td colSpan={4} className="border-y border-line bg-sunken/50 p-0">
                  <button
                    type="button"
                    onClick={() => setOpened((s) => new Set(s).add(ci))}
                    className="flex w-full items-center gap-2 px-3 py-1 font-sans text-[11.5px] font-semibold text-muted hover:bg-hover hover:text-ink"
                  >
                    <ChevronsUpDown className="h-3.5 w-3.5" aria-hidden />
                    Afficher {c.lines.length} ligne{c.lines.length > 1 ? "s" : ""} identique{c.lines.length > 1 ? "s" : ""}
                  </button>
                </td>
              </tr>
            ) : (
              c.lines.map((l, li) => <DiffRow key={`${ci}-${li}`} line={l} />)
            ),
          )}
        </tbody>
      </table>
    </div>
  );
}

function DiffRow({ line }: { line: DiffLine }) {
  return (
    <tr className={cx(line.op === "add" && "bg-olive-soft", line.op === "del" && "bg-terracotta-soft")}>
      <td className="w-9 select-none border-r border-line/60 px-1.5 text-right align-top text-faint">{line.oldNo ?? ""}</td>
      <td className="w-9 select-none border-r border-line/60 px-1.5 text-right align-top text-faint">{line.newNo ?? ""}</td>
      <td className={cx("w-5 select-none text-center align-top font-bold", line.op === "add" ? "text-olive" : line.op === "del" ? "text-terracotta" : "text-faint")}>
        {line.op === "add" ? "+" : line.op === "del" ? "−" : ""}
        <span className="sr-only">{line.op === "add" ? "ajouté" : line.op === "del" ? "retiré" : ""}</span>
      </td>
      <td className={cx("whitespace-pre-wrap break-words px-2 align-top", line.op === "same" ? "text-muted" : "text-ink")}>{line.text || " "}</td>
    </tr>
  );
}

function Stats({ lines }: { lines: DiffLine[] }) {
  const { added, removed } = diffStats(lines);
  return (
    <span className="flex items-center gap-1.5 font-mono text-[11px] font-semibold" title={`${added} ligne(s) ajoutée(s), ${removed} retirée(s)`}>
      {added ? <span className="rounded bg-olive-soft px-1.5 text-olive">+{added}</span> : null}
      {removed ? <span className="rounded bg-terracotta-soft px-1.5 text-terracotta">−{removed}</span> : null}
    </span>
  );
}

function Section({ title, before, after, open = true }: { title: string; before: string; after: string; open?: boolean }) {
  const lines = useMemo(() => diffText(before, after), [before, after]);
  return (
    <details open={open} className="group rounded-xl border border-line bg-canvas/50">
      <summary className="flex cursor-pointer list-none items-center gap-2 rounded-xl px-3.5 py-2.5 text-[13px] font-semibold text-ink hover:bg-hover [&::-webkit-details-marker]:hidden">
        <span className="inline-block w-3 text-faint transition-transform group-open:rotate-90" aria-hidden>
          ›
        </span>
        <span className="flex-1">{title}</span>
        <Stats lines={lines} />
      </summary>
      <div className="px-3 pb-3">
        <DiffBlock before={before} after={after} />
      </div>
    </details>
  );
}

/**
 * Toutes les différences entre deux contenus de skill, section par section. `a` = avant
 * (lignes retirées), `b` = après (lignes ajoutées).
 */
export function SkillDiff({ a, b, aLabel, bLabel }: { a: ComparableSkill; b: ComparableSkill; aLabel: string; bLabel: string }) {
  const sections: { title: string; before: string; after: string }[] = [];
  if (a.name !== b.name) sections.push({ title: "Nom", before: a.name, after: b.name });
  if (a.description !== b.description) sections.push({ title: "Description", before: a.description, after: b.description });
  if (a.body !== b.body) sections.push({ title: "Consignes", before: a.body, after: b.body });
  if (!sameJson(a.data, b.data)) sections.push({ title: "Paramètres", before: prettyJson(a.data), after: prettyJson(b.data) });
  const names = [...new Set([...Object.keys(a.files), ...Object.keys(b.files)])].sort();
  for (const n of names) {
    if (a.files[n] === b.files[n]) continue;
    const label = a.files[n] === undefined ? `Fichier ${n} (ajouté)` : b.files[n] === undefined ? `Fichier ${n} (retiré)` : `Fichier ${n}`;
    sections.push({ title: label, before: a.files[n] ?? "", after: b.files[n] ?? "" });
  }
  const refsA = a.referenceAssetIds;
  const refsB = b.referenceAssetIds;
  const refsChanged = refsA && refsB && refsA.join(",") !== refsB.join(",");

  return (
    <div className="space-y-3">
      <p className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[12px] text-muted">
        <span className="inline-flex items-center gap-1.5">
          <span className="rounded bg-terracotta-soft px-1.5 font-mono font-bold text-terracotta">−</span>
          {aLabel}
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="rounded bg-olive-soft px-1.5 font-mono font-bold text-olive">+</span>
          {bLabel}
        </span>
      </p>
      {sections.length === 0 && !refsChanged ? (
        <p className="rounded-xl border border-dashed border-line-strong px-4 py-6 text-center text-[13px] text-muted">Aucune différence : le contenu est identique.</p>
      ) : null}
      {sections.map((s) => (
        <Section key={s.title} title={s.title} before={s.before} after={s.after} />
      ))}
      {refsChanged ? (
        <p className="rounded-xl border border-line bg-canvas/50 px-3.5 py-2.5 text-[13px] text-ink">
          <span className="font-semibold">Médias de référence</span> : {refsA!.length} → {refsB!.length} média{refsB!.length > 1 ? "s" : ""}
        </p>
      ) : null}
    </div>
  );
}
