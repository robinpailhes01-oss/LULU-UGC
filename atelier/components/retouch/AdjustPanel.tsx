"use client";

import { useState } from "react";
import { BookmarkPlus, ChevronDown, Copy, Crop, FlipHorizontal2, Palette, RotateCcw, RotateCw, Sparkles, Sun, Wand2 } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { cx } from "@/components/ui/cx";
import { Slider } from "@/components/ui/Slider";
import { LookStrip } from "@/components/retouch/LookStrip";
import { ASPECT_PRESETS, LOOK_KEYS, NEUTRAL_PARAMS, PARAM_RANGES, type LookKey } from "@/lib/shared/look";
import type { AspectPreset, Look, RetouchParams } from "@/lib/shared/types";

const MINUS = "−";

export function signed(v: number, digits = 0): string {
  const r = Number(v.toFixed(digits));
  if (r === 0) return digits ? (0).toFixed(digits).replace(".", ",") : "0";
  return `${r > 0 ? "+" : MINUS}${Math.abs(r).toFixed(digits).replace(".", ",")}`;
}

const SECTIONS: { id: string; title: string; icon: React.ReactNode; keys: { key: LookKey; label: string; hint?: string }[] }[] = [
  {
    id: "light",
    title: "Lumière",
    icon: <Sun className="h-4 w-4" aria-hidden />,
    keys: [
      { key: "exposure", label: "Exposition" },
      { key: "contrast", label: "Contraste" },
      { key: "highlights", label: "Hautes lumières" },
      { key: "shadows", label: "Ombres" },
      { key: "whites", label: "Blancs" },
      { key: "blacks", label: "Noirs" },
    ],
  },
  {
    id: "colour",
    title: "Couleur",
    icon: <Palette className="h-4 w-4" aria-hidden />,
    keys: [
      { key: "temperature", label: "Température" },
      { key: "tint", label: "Teinte" },
      { key: "saturation", label: "Saturation" },
      { key: "vibrance", label: "Vibrance" },
    ],
  },
  {
    id: "effects",
    title: "Effets",
    icon: <Sparkles className="h-4 w-4" aria-hidden />,
    keys: [
      { key: "fade", label: "Fondu" },
      { key: "vignette", label: "Vignettage" },
      { key: "grain", label: "Grain" },
      { key: "sharpen", label: "Netteté", hint: "Appliquée à l'export" },
    ],
  },
];

const ASPECT_LABEL: Record<AspectPreset, string> = {
  original: "Original",
  free: "Libre",
  "1:1": "1:1",
  "4:5": "4:5",
  "9:16": "9:16",
  "16:9": "16:9",
  "3:2": "3:2",
};

export interface AdjustPanelProps {
  params: RetouchParams;
  onChange: (patch: Partial<RetouchParams>, commit: boolean) => void;
  looks: Look[] | undefined;
  looksError: string | null;
  onRetryLooks: () => void;
  thumbs: Record<string, string>;
  lookId: string | null;
  intensity: number;
  onSelectLook: (look: Look | null) => void;
  onIntensity: (v: number, commit: boolean) => void;
  onDeleteLook: (look: Look) => void;
  onSaveLook: () => void;
  /** Ouvre le choix d'autres photos pour leur appliquer le look courant. */
  onApplyToOthers: () => void;
  onAuto: () => void;
  autoLoading: boolean;
  cropMode: boolean;
  onToggleCrop: () => void;
  onAspect: (a: AspectPreset) => void;
  onRotate: () => void;
  onFlip: () => void;
  onResetFrame: () => void;
  onResetSection: (keys: LookKey[]) => void;
  disabled?: boolean;
}

/** Panneau de réglages : looks, lumière, couleur, effets, recadrage. */
export function AdjustPanel(props: AdjustPanelProps) {
  const { params, onChange, disabled } = props;
  const [open, setOpen] = useState<Record<string, boolean>>({ light: true, colour: true, effects: true, frame: true });
  const toggle = (id: string) => setOpen((o) => ({ ...o, [id]: !o[id] }));
  const frameModified = params.rotate !== 0 || params.flipH || params.straighten !== 0 || params.aspect !== "original" || params.crop !== null;

  return (
    <div className={cx("pb-8", disabled && "pointer-events-none opacity-60")} aria-disabled={disabled || undefined}>
      <section aria-labelledby="rt-looks" className="border-b border-line px-4 pb-4 pt-4">
        <div className="mb-2.5 flex items-center justify-between gap-2">
          <h2 id="rt-looks" className="text-[13px] font-semibold text-ink">
            Looks
          </h2>
          <Button size="sm" variant="ghost" className="-mr-2 h-7 px-2.5" icon={<Wand2 className="h-3.5 w-3.5" aria-hidden />} loading={props.autoLoading} onClick={props.onAuto} title="Réglages automatiques d'après la photo">
            Auto
          </Button>
        </div>
        <LookStrip
          looks={props.looks}
          error={props.looksError}
          onRetry={props.onRetryLooks}
          thumbs={props.thumbs}
          selectedId={props.lookId}
          originalSelected={!props.lookId && LOOK_KEYS.every((k) => k === "exposure" || k === "sharpen" || Math.abs(params[k] - NEUTRAL_PARAMS[k]) < 1e-9)}
          onSelect={props.onSelectLook}
          onDelete={props.onDeleteLook}
        />
        {props.lookId ? (
          <Slider
            className="mt-2"
            label="Intensité"
            value={Math.round(props.intensity * 100)}
            min={0}
            max={100}
            neutral={100}
            format={(v) => `${v} %`}
            onChange={(v) => props.onIntensity(v / 100, false)}
            onCommit={(v) => props.onIntensity(v / 100, true)}
          />
        ) : null}
        <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1">
          <button type="button" onClick={props.onSaveLook} className="inline-flex items-center gap-1.5 rounded-full px-1 py-1 text-[12.5px] font-semibold text-chestnut hover:underline">
            <BookmarkPlus className="h-3.5 w-3.5" aria-hidden />
            Enregistrer comme look…
          </button>
          {props.lookId ? (
            <button type="button" onClick={props.onApplyToOthers} className="inline-flex items-center gap-1.5 rounded-full px-1 py-1 text-[12.5px] font-semibold text-chestnut hover:underline">
              <Copy className="h-3.5 w-3.5" aria-hidden />
              Appliquer à d&apos;autres photos…
            </button>
          ) : null}
        </div>
      </section>

      {SECTIONS.map((s) => {
        const modified = s.keys.some((k) => Math.abs(params[k.key] - NEUTRAL_PARAMS[k.key]) > 1e-9);
        return (
          <Section
            key={s.id}
            id={s.id}
            title={s.title}
            icon={s.icon}
            open={open[s.id]}
            onToggle={() => toggle(s.id)}
            modified={modified}
            onReset={() => props.onResetSection(s.keys.map((k) => k.key))}
          >
            <div className="space-y-3.5">
              {s.keys.map(({ key, label, hint }) => {
                const r = PARAM_RANGES[key];
                return (
                  <div key={key}>
                    <Slider
                      label={label}
                      value={params[key]}
                      min={r.min}
                      max={r.max}
                      step={r.step}
                      neutral={NEUTRAL_PARAMS[key]}
                      format={(v) => (key === "exposure" ? signed(v, 2) : r.min < 0 ? signed(v) : String(Math.round(v)))}
                      onChange={(v) => onChange({ [key]: v }, false)}
                      onCommit={(v) => onChange({ [key]: v }, true)}
                    />
                    {hint ? <p className="mt-0.5 text-2xs text-faint">{hint}</p> : null}
                  </div>
                );
              })}
            </div>
          </Section>
        );
      })}

      <Section id="frame" title="Recadrage" icon={<Crop className="h-4 w-4" aria-hidden />} open={open.frame} onToggle={() => toggle("frame")} modified={frameModified} onReset={props.onResetFrame} resetLabel="Réinitialiser le cadre">
        <div className="space-y-4">
          <div>
            <p id="rt-aspect" className="mb-1.5 text-[12.5px] text-ink">
              Format
            </p>
            <div role="radiogroup" aria-labelledby="rt-aspect" className="flex flex-wrap gap-1.5">
              {ASPECT_PRESETS.map((a) => (
                <button
                  key={a}
                  type="button"
                  role="radio"
                  aria-checked={params.aspect === a}
                  onClick={() => props.onAspect(a)}
                  className={cx(
                    "h-7 rounded-full px-2.5 text-[12px] font-semibold tabular-nums transition-colors",
                    params.aspect === a ? "bg-ink text-surface" : "bg-sunken text-ink hover:bg-[#e0d6c7]",
                  )}
                >
                  {ASPECT_LABEL[a]}
                </button>
              ))}
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button size="sm" variant={props.cropMode ? "accent" : "secondary"} icon={<Crop className="h-3.5 w-3.5" aria-hidden />} onClick={props.onToggleCrop} aria-pressed={props.cropMode}>
              {props.cropMode ? "Terminer" : "Recadrer"}
            </Button>
            <Button size="sm" icon={<RotateCw className="h-3.5 w-3.5" aria-hidden />} onClick={props.onRotate}>
              Pivoter 90°
            </Button>
            <Button size="sm" icon={<FlipHorizontal2 className="h-3.5 w-3.5" aria-hidden />} onClick={props.onFlip} aria-pressed={params.flipH}>
              Miroir
            </Button>
          </div>
          <Slider
            label="Redresser"
            value={params.straighten}
            min={PARAM_RANGES.straighten.min}
            max={PARAM_RANGES.straighten.max}
            step={PARAM_RANGES.straighten.step}
            format={(v) => `${signed(v, 1)}°`}
            onChange={(v) => onChange({ straighten: v }, false)}
            onCommit={(v) => onChange({ straighten: v }, true)}
          />
        </div>
      </Section>
    </div>
  );
}

function Section({
  id,
  title,
  icon,
  open,
  onToggle,
  modified,
  onReset,
  resetLabel,
  children,
}: {
  id: string;
  title: string;
  icon: React.ReactNode;
  open: boolean;
  onToggle: () => void;
  modified: boolean;
  onReset: () => void;
  resetLabel?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="border-b border-line">
      <div className="flex items-center gap-1 pr-2">
        <button
          type="button"
          aria-expanded={open}
          aria-controls={`rt-sec-${id}`}
          onClick={onToggle}
          className="flex min-w-0 flex-1 items-center gap-2 px-4 py-3 text-left text-[13px] font-semibold text-ink hover:bg-hover"
        >
          <span className="text-muted">{icon}</span>
          <span className="flex-1">{title}</span>
          {modified ? <span role="img" className="h-1.5 w-1.5 rounded-full bg-chestnut" title="Modifié" aria-label="modifié" /> : null}
          <ChevronDown className={cx("h-4 w-4 text-faint transition-transform duration-fast", open && "rotate-180")} aria-hidden />
        </button>
        {modified ? (
          <button type="button" onClick={onReset} title={resetLabel ?? `Réinitialiser ${title.toLowerCase()}`} aria-label={resetLabel ?? `Réinitialiser ${title.toLowerCase()}`} className="rounded-full p-1.5 text-faint hover:bg-hover hover:text-ink">
            <RotateCcw className="h-3.5 w-3.5" aria-hidden />
          </button>
        ) : null}
      </div>
      {open ? (
        <div id={`rt-sec-${id}`} className="px-4 pb-4 pt-0.5">
          {children}
        </div>
      ) : null}
    </section>
  );
}
