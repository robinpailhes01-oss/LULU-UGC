"use client";

import { forwardRef } from "react";
import { cx } from "@/components/ui/cx";

const base =
  "w-full rounded-lg border border-line bg-surface px-3 text-[14px] text-ink placeholder:text-faint transition-colors focus:border-chestnut focus:outline-none focus-visible:outline-none focus:ring-2 focus:ring-chestnut/20 disabled:opacity-60";

export const Input = forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(function Input({ className, ...rest }, ref) {
  return <input ref={ref} className={cx(base, "h-9", className)} {...rest} />;
});

export const Textarea = forwardRef<HTMLTextAreaElement, React.TextareaHTMLAttributes<HTMLTextAreaElement>>(function Textarea({ className, ...rest }, ref) {
  return <textarea ref={ref} className={cx(base, "min-h-[88px] py-2 leading-relaxed", className)} {...rest} />;
});

export const Select = forwardRef<HTMLSelectElement, React.SelectHTMLAttributes<HTMLSelectElement>>(function Select({ className, children, ...rest }, ref) {
  return (
    <select ref={ref} className={cx(base, "h-9 pr-8", className)} {...rest}>
      {children}
    </select>
  );
});

export function Label({ children, htmlFor, hint }: { children: React.ReactNode; htmlFor?: string; hint?: React.ReactNode }) {
  return (
    <label htmlFor={htmlFor} className="mb-1.5 flex items-baseline justify-between gap-2 text-[12.5px] font-semibold text-ink">
      <span>{children}</span>
      {hint ? <span className="font-normal text-muted">{hint}</span> : null}
    </label>
  );
}

export function Checkbox({ checked, onChange, label, className }: { checked: boolean; onChange: (v: boolean) => void; label: React.ReactNode; className?: string }) {
  return (
    <label className={cx("inline-flex cursor-pointer select-none items-center gap-2 text-[13.5px]", className)}>
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} className="h-4 w-4 rounded border-line-strong accent-[#8B5E34]" />
      <span>{label}</span>
    </label>
  );
}
