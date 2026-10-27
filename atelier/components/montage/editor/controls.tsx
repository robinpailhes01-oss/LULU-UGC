"use client";

import { useEffect, useId, useState } from "react";
import { cx } from "@/components/ui/cx";

/** Section repliable de l'inspecteur. */
export function Section({ title, children, aside, className }: { title: string; children: React.ReactNode; aside?: React.ReactNode; className?: string }) {
  return (
    <section className={cx("border-b border-line px-4 py-4 last:border-b-0", className)}>
      <div className="mb-3 flex items-center justify-between gap-2">
        <h3 className="label-eyebrow">{title}</h3>
        {aside}
      </div>
      {children}
    </section>
  );
}

/** Choix exclusif en pastilles (format, position, style de texte…). */
export function Segmented<T extends string>({
  label,
  value,
  options,
  onChange,
  size = "md",
  className,
}: {
  label: string;
  value: T;
  options: { value: T; label: React.ReactNode; title?: string }[];
  onChange: (v: T) => void;
  size?: "sm" | "md";
  className?: string;
}) {
  return (
    <div role="radiogroup" aria-label={label} className={cx("flex flex-wrap gap-1", className)}>
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          role="radio"
          aria-checked={value === o.value}
          title={o.title}
          onClick={() => onChange(o.value)}
          onKeyDown={(e) => {
            if (e.key !== "ArrowRight" && e.key !== "ArrowLeft") return;
            e.preventDefault();
            const i = options.findIndex((x) => x.value === value);
            const next = options[(i + (e.key === "ArrowRight" ? 1 : options.length - 1)) % options.length];
            onChange(next.value);
          }}
          className={cx(
            "rounded-full font-semibold transition-colors",
            size === "sm" ? "h-7 px-2.5 text-[12px]" : "h-8 px-3 text-[12.5px]",
            value === o.value ? "bg-ink text-surface" : "bg-sunken text-ink hover:bg-hover",
          )}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

/** Champ numérique en secondes, validé à la sortie du champ ou sur Entrée. */
export function SecondsField({
  label,
  value,
  min,
  max,
  step = 0.1,
  onCommit,
  className,
  suffix = "s",
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  onCommit: (v: number) => void;
  className?: string;
  suffix?: string;
}) {
  const id = useId();
  const [draft, setDraft] = useState(fmt(value));
  useEffect(() => setDraft(fmt(value)), [value]);
  const commit = () => {
    const v = Number(draft.replace(",", "."));
    if (!Number.isFinite(v)) return setDraft(fmt(value));
    const clamped = Math.min(max, Math.max(min, Math.round(v * 100) / 100));
    setDraft(fmt(clamped));
    if (clamped !== value) onCommit(clamped);
  };
  return (
    <div className={className}>
      <label htmlFor={id} className="mb-1 block text-[12px] text-muted">
        {label}
      </label>
      <div className="relative">
        <input
          id={id}
          inputMode="decimal"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onBlur={commit}
          onKeyDown={(e) => {
            if (e.key === "Enter") commit();
            if (e.key === "ArrowUp" || e.key === "ArrowDown") {
              e.preventDefault();
              const v = Math.min(max, Math.max(min, Math.round((value + (e.key === "ArrowUp" ? step : -step)) * 100) / 100));
              onCommit(v);
            }
          }}
          className="h-8 w-full rounded-lg border border-line bg-surface pl-2.5 pr-6 text-[13px] tabular-nums text-ink focus:border-chestnut focus:outline-none focus:ring-2 focus:ring-chestnut/20"
        />
        <span className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-[12px] text-faint">{suffix}</span>
      </div>
    </div>
  );
}

function fmt(v: number): string {
  return (Math.round(v * 100) / 100).toLocaleString("fr-FR", { maximumFractionDigits: 2 });
}

/** « 0:03,2 » : minutes, secondes et dixième, pour la timeline. */
export function formatTimecode(t: number): string {
  const s = Math.max(0, t);
  const m = Math.floor(s / 60);
  const r = s - m * 60;
  return `${m}:${Math.floor(r).toString().padStart(2, "0")},${Math.floor((r % 1) * 10)}`;
}

export function formatSeconds(t: number): string {
  return `${(Math.round(t * 10) / 10).toLocaleString("fr-FR", { maximumFractionDigits: 1 })} s`;
}
