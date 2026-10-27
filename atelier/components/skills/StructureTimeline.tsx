"use client";

import { cx } from "@/components/ui/cx";
import { formatSeconds, structureTotal } from "@/lib/client/skills/montage-style";
import type { MontageStyleData } from "@/lib/shared/types";

const TONES = ["bg-chestnut text-surface", "bg-honey text-ink", "bg-olive text-surface", "bg-plum text-surface", "bg-terracotta text-surface", "bg-[#B9925F] text-ink"];

export function segmentTone(i: number): string {
  return TONES[i % TONES.length];
}

type Row = NonNullable<MontageStyleData["structure"]>[number];

/** Durée affichée d'un plan sans durée : une part égale de ce qui reste, au moins 1 s. */
function displayDurations(rows: Row[], target: { min: number; max: number } | undefined): number[] {
  const { total, unknown } = structureTotal(rows);
  const room = target && Number.isFinite(target.max) ? Math.max(target.max - total, 0) : 0;
  const share = unknown > 0 ? Math.max(room / unknown, 1) : 0;
  return rows.map((r) => (typeof r.durationS === "number" && Number.isFinite(r.durationS) && r.durationS > 0 ? r.durationS : share));
}

/**
 * Frise proportionnelle du déroulé : un segment par plan, comparée à la durée visée.
 * `compact` : simple barre décorative (cartes de la liste).
 */
export function StructureTimeline({
  structure,
  target,
  compact,
  activeIndex,
  onSelect,
}: {
  structure: Row[];
  target?: { min: number; max: number };
  compact?: boolean;
  activeIndex?: number | null;
  onSelect?: (index: number) => void;
}) {
  const rows = structure ?? [];
  const validTarget = target && Number.isFinite(target.min) && Number.isFinite(target.max) && target.min <= target.max ? target : undefined;
  const durations = displayDurations(rows, validTarget);
  const { total, unknown } = structureTotal(rows);
  const shown = durations.reduce((a, b) => a + b, 0);
  const scale = Math.max(shown, validTarget?.max ?? 0, 0.001);

  if (compact) {
    if (rows.length === 0) return null;
    return (
      <div className="flex h-1.5 w-full gap-px overflow-hidden rounded-full bg-sunken" aria-hidden>
        {rows.map((r, i) => (
          <span key={i} className={cx("h-full", segmentTone(i).split(" ")[0], typeof r.durationS !== "number" && "opacity-40")} style={{ width: `${(durations[i] / scale) * 100}%` }} />
        ))}
      </div>
    );
  }

  let status: { text: string; tone: "ok" | "warn" } | null = null;
  if (validTarget && rows.length > 0) {
    const range = validTarget.min === validTarget.max ? formatSeconds(validTarget.min) : `${validTarget.min.toLocaleString("fr-FR")}–${validTarget.max.toLocaleString("fr-FR")} s`;
    if (total > validTarget.max) status = { text: `Trop long de ${formatSeconds(Math.round((total - validTarget.max) * 10) / 10)} par rapport à la durée visée (${range}).`, tone: "warn" };
    else if (total < validTarget.min && unknown === 0) status = { text: `Il manque ${formatSeconds(Math.round((validTarget.min - total) * 10) / 10)} pour atteindre la durée visée (${range}).`, tone: "warn" };
    else status = { text: `Dans la durée visée (${range}).`, tone: "ok" };
  }

  return (
    <figure className="space-y-1.5">
      {rows.length === 0 ? (
        <div className="flex h-9 w-full items-center justify-center rounded-lg border border-dashed border-line-strong text-[12px] text-faint">Aucun plan pour l'instant</div>
      ) : (
        <ol className="flex h-9 w-full gap-[3px]" aria-label="Frise du déroulé">
          {rows.map((r, i) => {
            const pct = (durations[i] / scale) * 100;
            const known = typeof r.durationS === "number" && Number.isFinite(r.durationS);
            return (
              <li key={i} className="h-full min-w-[6px]" style={{ width: `${pct}%` }}>
                <button
                  type="button"
                  onClick={() => onSelect?.(i)}
                  title={`${i + 1}. ${r.role || "Plan"} — ${known ? formatSeconds(r.durationS) : "durée libre"}`}
                  aria-label={`Aller au plan ${i + 1}, ${r.role || "sans rôle"}, ${known ? formatSeconds(r.durationS) : "durée libre"}`}
                  className={cx(
                    "relative flex h-full w-full items-center overflow-hidden rounded-md px-1.5 text-left text-[11px] font-semibold transition-[filter] hover:brightness-110",
                    segmentTone(i),
                    !known && "bg-[repeating-linear-gradient(135deg,transparent_0_5px,rgba(255,255,255,.35)_5px_9px)] opacity-60",
                    activeIndex === i && "ring-2 ring-ink ring-offset-1 ring-offset-surface",
                  )}
                >
                  <span className="truncate">{pct > 9 ? r.role || "plan" : ""}</span>
                </button>
              </li>
            );
          })}
        </ol>
      )}
      {validTarget ? (
        <div className="relative h-3" aria-hidden>
          <div className="absolute inset-x-0 top-1/2 h-px -translate-y-1/2 bg-line-strong" />
          <div
            className="absolute top-0 h-3 rounded-sm border border-honey bg-honey-soft/80"
            style={{ left: `${(validTarget.min / scale) * 100}%`, width: `${Math.max(((validTarget.max - validTarget.min) / scale) * 100, 0.6)}%` }}
          />
          <div className="absolute top-[-2px] h-4 w-[2px] rounded bg-ink" style={{ left: `calc(${Math.min((total / scale) * 100, 100)}% - 1px)` }} />
        </div>
      ) : null}
      <figcaption className="flex flex-wrap items-center justify-between gap-x-3 gap-y-0.5 text-[12px]">
        <span className="font-semibold tabular-nums text-ink">
          Total : {formatSeconds(total) || "0 s"}
          {unknown > 0 ? <span className="font-normal text-muted"> + {unknown} plan{unknown > 1 ? "s" : ""} sans durée</span> : null}
        </span>
        {status ? <span className={cx(status.tone === "ok" ? "text-olive" : "font-medium text-terracotta")}>{status.tone === "ok" ? "✓ " : "! "}{status.text}</span> : validTarget ? null : <span className="text-muted">Indiquez une durée visée pour comparer.</span>}
      </figcaption>
    </figure>
  );
}
