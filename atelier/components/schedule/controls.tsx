"use client";

import { useRef } from "react";
import { cx } from "@/components/ui/cx";

/** Choix exclusif (radiogroup) : Mois / Semaine / Liste, Publication / Reel / Story… */
export function Segmented<T extends string>({
  options,
  value,
  onChange,
  label,
  className,
  disabled,
}: {
  options: { id: T; label: React.ReactNode; title?: string; disabled?: boolean }[];
  value: T;
  onChange: (v: T) => void;
  label: string;
  className?: string;
  disabled?: boolean;
}) {
  const refs = useRef<(HTMLButtonElement | null)[]>([]);
  const enabled = options.filter((o) => !o.disabled);
  const move = (dir: 1 | -1) => {
    const i = enabled.findIndex((o) => o.id === value);
    const next = enabled[(i + dir + enabled.length) % enabled.length];
    if (!next) return;
    onChange(next.id);
    refs.current[options.indexOf(next)]?.focus();
  };
  return (
    <div role="radiogroup" aria-label={label} className={cx("inline-flex rounded-full bg-sunken p-0.5", disabled && "opacity-60", className)}>
      {options.map((o, i) => {
        const active = o.id === value;
        return (
          <button
            key={o.id}
            ref={(el) => {
              refs.current[i] = el;
            }}
            type="button"
            role="radio"
            aria-checked={active}
            tabIndex={active ? 0 : -1}
            title={o.title}
            disabled={disabled || o.disabled}
            onClick={() => onChange(o.id)}
            onKeyDown={(e) => {
              if (e.key === "ArrowRight" || e.key === "ArrowDown") {
                e.preventDefault();
                move(1);
              } else if (e.key === "ArrowLeft" || e.key === "ArrowUp") {
                e.preventDefault();
                move(-1);
              }
            }}
            className={cx(
              "inline-flex h-8 items-center gap-1.5 whitespace-nowrap rounded-full px-3 text-[13px] font-semibold transition-colors duration-fast disabled:cursor-not-allowed disabled:opacity-50",
              active ? "bg-surface text-ink shadow-card" : "text-muted hover:text-ink",
            )}
          >
            {o.label}
          </button>
        );
      })}
    </div>
  );
}

export function Section({ title, children, aside, id, className }: { title: string; children: React.ReactNode; aside?: React.ReactNode; id?: string; className?: string }) {
  return (
    <section aria-labelledby={id} className={cx("space-y-2.5", className)}>
      <div className="flex items-baseline justify-between gap-3">
        <h3 id={id} className="text-[12.5px] font-semibold text-ink">
          {title}
        </h3>
        {aside ? <div className="text-[12px] text-muted">{aside}</div> : null}
      </div>
      {children}
    </section>
  );
}

export function IssueList({ issues, tone }: { issues: { message: string }[]; tone: "error" | "warning" }) {
  if (issues.length === 0) return null;
  return (
    <ul data-issue={tone} className={cx("space-y-1 text-[12.5px] leading-snug", tone === "error" ? "text-[#7f341d]" : "text-[#6d4a1d]")} role={tone === "error" ? "alert" : undefined}>
      {issues.map((i) => (
        <li key={i.message} className="flex gap-1.5">
          <span aria-hidden className={cx("mt-[6px] h-1.5 w-1.5 shrink-0 rounded-full", tone === "error" ? "bg-terracotta" : "bg-honey")} />
          <span>
            <span className="sr-only">{tone === "error" ? "À corriger : " : "Conseil : "}</span>
            {i.message}
          </span>
        </li>
      ))}
    </ul>
  );
}

export function Toggle({ checked, onChange, label, disabled, hint }: { checked: boolean; onChange: (v: boolean) => void; label: React.ReactNode; disabled?: boolean; hint?: React.ReactNode }) {
  return (
    <label className={cx("flex cursor-pointer select-none items-start gap-2.5 text-[13.5px]", disabled && "cursor-not-allowed opacity-60")}>
      <span className="relative mt-0.5 inline-flex shrink-0">
        <input type="checkbox" role="switch" className="peer sr-only" checked={checked} disabled={disabled} onChange={(e) => onChange(e.target.checked)} />
        <span className="h-5 w-9 rounded-full bg-[#cfc2af] transition-colors peer-checked:bg-chestnut peer-focus-visible:ring-2 peer-focus-visible:ring-chestnut peer-focus-visible:ring-offset-2" />
        <span className="absolute left-0.5 top-0.5 h-4 w-4 rounded-full bg-surface shadow transition-transform peer-checked:translate-x-4" />
      </span>
      <span>
        {label}
        {hint ? <span className="block text-[12px] text-muted">{hint}</span> : null}
      </span>
    </label>
  );
}
