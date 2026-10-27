"use client";

import { cx } from "@/components/ui/cx";

export interface SliderProps {
  label: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  /** Valeur neutre (double-clic pour y revenir) ; le remplissage part de cette valeur. */
  neutral?: number;
  format?: (v: number) => string;
  onChange: (v: number) => void;
  onCommit?: (v: number) => void;
  className?: string;
}

/** Curseur de réglage (retouche, volume…). Double-clic : retour à la valeur neutre. */
export function Slider({ label, value, min, max, step = 1, neutral = 0, format, onChange, onCommit, className }: SliderProps) {
  const pct = (v: number) => ((v - min) / (max - min)) * 100;
  const from = Math.min(pct(value), pct(neutral));
  const to = Math.max(pct(value), pct(neutral));
  const id = `sl-${label.replace(/\s+/g, "-").toLowerCase()}`;
  return (
    <div className={cx("group", className)} onDoubleClick={() => { onChange(neutral); onCommit?.(neutral); }}>
      <div className="mb-1 flex items-center justify-between text-[12.5px]">
        <label htmlFor={id} className="text-ink">{label}</label>
        <span className={cx("tabular-nums", value === neutral ? "text-faint" : "text-chestnut")}>{format ? format(value) : value > 0 && neutral === 0 ? `+${value}` : value}</span>
      </div>
      <div className="relative h-5">
        <div className="absolute inset-x-0 top-1/2 h-[3px] -translate-y-1/2 rounded-full bg-sunken" />
        <div className="absolute top-1/2 h-[3px] -translate-y-1/2 rounded-full bg-chestnut" style={{ left: `${from}%`, width: `${to - from}%` }} />
        <input
          id={id}
          type="range"
          min={min}
          max={max}
          step={step}
          value={value}
          onChange={(e) => onChange(Number(e.target.value))}
          onPointerUp={(e) => onCommit?.(Number((e.target as HTMLInputElement).value))}
          onKeyUp={(e) => onCommit?.(Number((e.target as HTMLInputElement).value))}
          className="absolute inset-0 w-full cursor-pointer appearance-none bg-transparent [&::-moz-range-thumb]:h-3.5 [&::-moz-range-thumb]:w-3.5 [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:border-2 [&::-moz-range-thumb]:border-surface [&::-moz-range-thumb]:bg-chestnut [&::-webkit-slider-thumb]:h-3.5 [&::-webkit-slider-thumb]:w-3.5 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:border-2 [&::-webkit-slider-thumb]:border-surface [&::-webkit-slider-thumb]:bg-chestnut [&::-webkit-slider-thumb]:shadow"
        />
      </div>
    </div>
  );
}
