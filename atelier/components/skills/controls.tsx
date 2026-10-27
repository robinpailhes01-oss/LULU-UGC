"use client";

import { useEffect, useId, useRef, useState } from "react";
import { TriangleAlert, X } from "lucide-react";
import { cx } from "@/components/ui/cx";
import { formatNumber, parseDecimal } from "@/lib/client/skills/montage-style";

// ---------------------------------------------------------------------------------------------
// Interrupteur

export function Switch({
  checked,
  onChange,
  label,
  description,
  disabled,
  className,
  hideLabel,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  label: string;
  description?: string;
  disabled?: boolean;
  className?: string;
  hideLabel?: boolean;
}) {
  const id = useId();
  return (
    <div className={cx("inline-flex items-center gap-2.5", className)}>
      <button
        id={id}
        type="button"
        role="switch"
        aria-checked={checked}
        aria-label={hideLabel ? label : undefined}
        aria-describedby={description ? `${id}-d` : undefined}
        disabled={disabled}
        onClick={() => onChange(!checked)}
        className={cx(
          "relative inline-flex h-5 w-9 shrink-0 items-center rounded-full border transition-colors duration-fast disabled:cursor-not-allowed disabled:opacity-50",
          checked ? "border-ink bg-ink" : "border-line-strong bg-sunken",
        )}
      >
        <span className={cx("absolute h-3.5 w-3.5 rounded-full shadow-sm transition-transform duration-fast", checked ? "translate-x-[18px] bg-surface" : "translate-x-[2px] bg-surface")} />
      </button>
      {hideLabel ? null : (
        <label htmlFor={id} className="cursor-pointer select-none text-[13px] text-ink">
          {label}
          {description ? (
            <span id={`${id}-d`} className="block text-2xs text-muted">
              {description}
            </span>
          ) : null}
        </label>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------------------------
// Choix segmenté (radiogroup, flèches du clavier)

export interface SegmentOption<T extends string> {
  id: T;
  label: React.ReactNode;
  count?: number;
  title?: string;
}

export function Segmented<T extends string>({
  options,
  value,
  onChange,
  label,
  size = "md",
  className,
  invalid,
}: {
  options: SegmentOption<T>[];
  value: T | null | undefined;
  onChange: (v: T) => void;
  label: string;
  size?: "sm" | "md";
  className?: string;
  invalid?: boolean;
}) {
  const refs = useRef<(HTMLButtonElement | null)[]>([]);
  const current = options.findIndex((o) => o.id === value);
  const focusable = current >= 0 ? current : 0;
  return (
    <div
      role="radiogroup"
      aria-label={label}
      aria-invalid={invalid || undefined}
      className={cx("inline-flex max-w-full items-center gap-0.5 rounded-full bg-sunken p-0.5", invalid && "ring-2 ring-terracotta/50", className)}
    >
      {options.map((o, i) => {
        const on = o.id === value;
        return (
          <button
            key={o.id}
            ref={(el) => {
              refs.current[i] = el;
            }}
            type="button"
            role="radio"
            aria-checked={on}
            title={o.title}
            tabIndex={i === focusable ? 0 : -1}
            onClick={() => onChange(o.id)}
            onKeyDown={(e) => {
              const delta = e.key === "ArrowRight" || e.key === "ArrowDown" ? 1 : e.key === "ArrowLeft" || e.key === "ArrowUp" ? -1 : 0;
              if (!delta) return;
              e.preventDefault();
              const next = (i + delta + options.length) % options.length;
              onChange(options[next].id);
              refs.current[next]?.focus();
            }}
            className={cx(
              "inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full font-semibold transition-colors duration-fast",
              size === "sm" ? "h-7 px-2.5 text-[12px]" : "h-8 px-3 text-[12.5px]",
              on ? "bg-surface text-ink shadow-card" : "text-muted hover:text-ink",
            )}
          >
            {o.label}
            {o.count !== undefined ? <span className={cx("tabular-nums", on ? "text-chestnut" : "text-faint")}>{o.count}</span> : null}
          </button>
        );
      })}
    </div>
  );
}

// ---------------------------------------------------------------------------------------------
// Champ nombre (virgule acceptée), avec unité et message d'erreur

export function NumberField({
  id,
  value,
  onChange,
  unit,
  placeholder,
  error,
  disabled,
  className,
  label,
  "aria-label": ariaLabel,
  min,
  max,
  step = 0.1,
}: {
  id?: string;
  value: number | undefined | null;
  /** undefined = champ vidé ; NaN = saisie qui n'est pas un nombre (signalée par la validation). */
  onChange: (v: number | undefined) => void;
  unit?: string;
  placeholder?: string;
  error?: string | null;
  disabled?: boolean;
  className?: string;
  label?: string;
  "aria-label"?: string;
  min?: number;
  max?: number;
  step?: number;
}) {
  const auto = useId();
  const inputId = id ?? auto;
  const [text, setText] = useState(formatNumber(value ?? undefined));

  useEffect(() => {
    if (value === undefined || value === null) {
      if (text.trim() !== "" && parseDecimal(text) !== null) setText("");
      return;
    }
    if (Number.isNaN(value)) return;
    if (parseDecimal(text) !== value) setText(formatNumber(value));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  const nudge = (dir: 1 | -1) => {
    const cur = typeof value === "number" && Number.isFinite(value) ? value : (min ?? 0);
    let next = Math.round((cur + dir * step) * 1000) / 1000;
    if (min !== undefined) next = Math.max(min, next);
    if (max !== undefined) next = Math.min(max, next);
    setText(formatNumber(next));
    onChange(next);
  };

  return (
    <div className={className}>
      {label ? (
        <label htmlFor={inputId} className="mb-1 block text-[12px] font-semibold text-ink">
          {label}
        </label>
      ) : null}
      <div className={cx("flex h-9 items-center rounded-lg border bg-surface pr-2.5 transition-colors focus-within:ring-2", error ? "border-terracotta focus-within:ring-terracotta/20" : "border-line focus-within:border-chestnut focus-within:ring-chestnut/20", disabled && "opacity-60")}>
        <input
          id={inputId}
          type="text"
          inputMode="decimal"
          autoComplete="off"
          aria-label={label ? undefined : ariaLabel}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? `${inputId}-err` : undefined}
          disabled={disabled}
          value={text}
          placeholder={placeholder}
          onChange={(e) => {
            const t = e.target.value;
            setText(t);
            if (t.trim() === "") onChange(undefined);
            else {
              const n = parseDecimal(t);
              onChange(n === null ? Number.NaN : n);
            }
          }}
          onKeyDown={(e) => {
            if (e.key === "ArrowUp") {
              e.preventDefault();
              nudge(1);
            } else if (e.key === "ArrowDown") {
              e.preventDefault();
              nudge(-1);
            }
          }}
          className="h-full w-full min-w-0 rounded-lg bg-transparent px-2.5 text-[13.5px] tabular-nums text-ink placeholder:text-faint focus:outline-none focus-visible:outline-none"
        />
        {unit ? <span className="shrink-0 text-[12px] text-faint">{unit}</span> : null}
      </div>
      {error ? <FieldError id={`${inputId}-err`}>{error}</FieldError> : null}
    </div>
  );
}

export function FieldError({ id, children }: { id?: string; children: React.ReactNode }) {
  return (
    <p id={id} role="alert" className="mt-1 flex items-start gap-1 text-[11.5px] font-medium leading-snug text-terracotta">
      <TriangleAlert className="mt-px h-3 w-3 shrink-0" aria-hidden />
      <span>{children}</span>
    </p>
  );
}

// ---------------------------------------------------------------------------------------------
// Panneau latéral (basé sur <dialog> : focus piégé, Échap natif)

export function Drawer({ open, onClose, title, children, labelledBy, widthClass = "w-[min(980px,100vw)]" }: { open: boolean; onClose: () => void; title: React.ReactNode; children: React.ReactNode; labelledBy?: string; widthClass?: string }) {
  const ref = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (open && !el.open) el.showModal();
    if (!open && el.open) el.close();
  }, [open]);
  return (
    <dialog
      ref={ref}
      aria-labelledby={labelledBy ?? titleId}
      onClose={onClose}
      onCancel={(e) => {
        e.preventDefault();
        onClose();
      }}
      onMouseDown={(e) => {
        if (e.target === ref.current) onClose();
      }}
      className={cx("z-modal m-0 ml-auto h-dvh max-h-none max-w-none overflow-hidden bg-surface p-0 text-ink shadow-pop backdrop:bg-night/35 open:animate-fade-in", widthClass)}
    >
      {open ? (
        <div className="flex h-full flex-col">
          <header className="flex h-14 shrink-0 items-center justify-between gap-3 border-b border-line px-4 sm:px-5">
            <h2 id={titleId} className="min-w-0 truncate text-[15px] font-semibold">
              {title}
            </h2>
            <button type="button" onClick={onClose} aria-label="Fermer" className="rounded-full p-1.5 text-muted hover:bg-hover hover:text-ink">
              <X className="h-4 w-4" />
            </button>
          </header>
          <div className="min-h-0 flex-1">{children}</div>
        </div>
      ) : null}
    </dialog>
  );
}

// ---------------------------------------------------------------------------------------------
// Petit panneau flottant ancré (enregistrement, agent)

export function Popover({ open, onClose, children, className, align = "right", label }: { open: boolean; onClose: () => void; children: React.ReactNode; className?: string; align?: "left" | "right"; label: string }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      const el = ref.current;
      if (el && !el.contains(e.target as Node) && !(e.target as HTMLElement).closest?.("[data-popover-anchor]")) onClose();
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.stopPropagation();
        onClose();
      }
    };
    window.addEventListener("mousedown", onDown);
    window.addEventListener("keydown", onKey, true);
    return () => {
      window.removeEventListener("mousedown", onDown);
      window.removeEventListener("keydown", onKey, true);
    };
  }, [open, onClose]);

  // À la fermeture, le focus revient au bouton qui a ouvert le panneau.
  useEffect(() => {
    if (!open) return;
    const anchor = ref.current?.parentElement?.querySelector<HTMLElement>("[data-popover-anchor]") ?? null;
    return () => {
      const active = document.activeElement;
      if (anchor && (!active || active === document.body)) anchor.focus();
    };
  }, [open]);

  if (!open) return null;
  return (
    <div
      ref={ref}
      role="dialog"
      aria-label={label}
      className={cx(
        "absolute top-[calc(100%+8px)] z-menu w-[min(360px,calc(100vw-24px))] animate-rise-in rounded-xl border border-line bg-surface p-3.5 text-left shadow-pop max-sm:fixed max-sm:inset-x-3 max-sm:top-[120px] max-sm:w-auto",
        align === "right" ? "right-0" : "left-0",
        className,
      )}
    >
      {children}
    </div>
  );
}

/** Carte de section du panneau de droite / de gauche. */
export function Panel({ title, icon, actions, children, className, description, id }: { title: React.ReactNode; icon?: React.ReactNode; actions?: React.ReactNode; children: React.ReactNode; className?: string; description?: React.ReactNode; id?: string }) {
  return (
    <section id={id} className={cx("rounded-card border border-line bg-surface", className)} aria-labelledby={id ? `${id}-t` : undefined}>
      <header className="flex flex-wrap items-center gap-2 border-b border-line px-4 py-3">
        {icon ? <span className="text-chestnut [&>svg]:h-4 [&>svg]:w-4">{icon}</span> : null}
        <div className="min-w-0 flex-1">
          <h2 id={id ? `${id}-t` : undefined} className="text-[13.5px] font-semibold text-ink">
            {title}
          </h2>
          {description ? <p className="text-[12px] text-muted">{description}</p> : null}
        </div>
        {actions ? <div className="flex flex-wrap items-center gap-1.5">{actions}</div> : null}
      </header>
      <div className="p-4">{children}</div>
    </section>
  );
}
