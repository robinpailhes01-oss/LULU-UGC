"use client";

import { useId } from "react";
import { cx } from "@/components/ui/cx";
import { Input, Select } from "@/components/ui/Field";
import { Slider } from "@/components/ui/Slider";
import { FieldError, NumberField, Segmented, Switch } from "@/components/skills/controls";
import { StructureEditor } from "@/components/skills/StructureEditor";
import {
  COLOR_FIELDS,
  FORMATS,
  FPS_OPTIONS,
  issuesAt,
  LIMITS,
  normalizeHex,
  PACINGS,
  PLACEMENTS,
  TEXT_ANIMATIONS,
  TRANSITIONS,
  type Issue,
} from "@/lib/client/skills/montage-style";
import type { MontageStyleData } from "@/lib/shared/types";

type Data = MontageStyleData;
type ColorKey = keyof NonNullable<Data["colors"]>;

function Group({ title, hint, children, className }: { title: string; hint?: string; children: React.ReactNode; className?: string }) {
  return (
    <fieldset className={cx("border-t border-line pt-4 first:border-t-0 first:pt-0", className)}>
      <legend className="float-left mb-3 w-full">
        <span className="label-eyebrow">{title}</span>
        {hint ? <span className="mt-0.5 block text-[12px] font-normal normal-case tracking-normal text-muted">{hint}</span> : null}
      </legend>
      <div className="clear-left space-y-3">{children}</div>
    </fieldset>
  );
}

function FieldLabel({ htmlFor, children, hint }: { htmlFor?: string; children: React.ReactNode; hint?: string }) {
  return (
    <label htmlFor={htmlFor} className="mb-1 flex items-baseline justify-between gap-2 text-[12px] font-semibold text-ink">
      <span>{children}</span>
      {hint ? <span className="text-[11px] font-normal text-faint">{hint}</span> : null}
    </label>
  );
}

function RangeFields({ id, label, hint, value, onChange, issues, path }: { id: string; label: string; hint?: string; value: { min?: number; max?: number } | undefined; onChange: (part: "min" | "max", v: number | undefined) => void; issues: Issue[]; path: string }) {
  const minErr = issuesAt(issues, `${path}.min`)[0]?.message ?? issuesAt(issues, path)[0]?.message;
  const maxErr = issuesAt(issues, `${path}.max`)[0]?.message;
  return (
    <div role="group" aria-labelledby={`${id}-l`}>
      <p id={`${id}-l`} className="mb-1 flex items-baseline justify-between gap-2 text-[12px] font-semibold text-ink">
        <span>{label}</span>
        {hint ? <span className="text-[11px] font-normal text-faint">{hint}</span> : null}
      </p>
      <div className="grid grid-cols-2 gap-2">
        <NumberField value={value?.min} onChange={(v) => onChange("min", v)} unit="s min" aria-label={`${label} : minimum en secondes`} min={LIMITS.duration.min} max={LIMITS.duration.max} step={0.5} error={minErr} />
        <NumberField value={value?.max} onChange={(v) => onChange("max", v)} unit="s max" aria-label={`${label} : maximum en secondes`} min={LIMITS.duration.min} max={LIMITS.duration.max} step={0.5} error={maxErr} />
      </div>
    </div>
  );
}

function ColorField({ label, hint, value, onChange, error }: { label: string; hint: string; value: string | undefined; onChange: (v: string | undefined) => void; error?: string }) {
  const id = useId();
  const valid = value && /^#[0-9a-fA-F]{6}$/.test(value) ? value : null;
  return (
    <div>
      <FieldLabel htmlFor={`${id}-hex`} hint={hint}>
        {label}
      </FieldLabel>
      <div className={cx("flex h-9 items-center gap-2 rounded-lg border bg-surface pl-1 pr-2 focus-within:ring-2", error ? "border-terracotta focus-within:ring-terracotta/20" : "border-line focus-within:border-chestnut focus-within:ring-chestnut/20")}>
        <span className={cx("relative h-7 w-7 shrink-0 overflow-hidden rounded-md border border-line-strong", !valid && "checker")} style={valid ? { backgroundColor: valid } : undefined}>
          <input
            type="color"
            aria-label={`Choisir la couleur ${label.toLowerCase()}`}
            value={valid ?? "#000000"}
            onChange={(e) => onChange(e.target.value.toUpperCase())}
            className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
          />
        </span>
        <input
          id={`${id}-hex`}
          defaultValue={value ?? ""}
          key={value ?? ""}
          onBlur={(e) => {
            const raw = e.target.value.trim();
            if (!raw) return onChange(undefined);
            const hex = normalizeHex(raw);
            onChange(hex ?? raw);
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter") (e.target as HTMLInputElement).blur();
          }}
          placeholder="#RRVVBB"
          aria-label={`Couleur ${label.toLowerCase()} (${hint}), code hexadécimal`}
          maxLength={9}
          spellCheck={false}
          aria-invalid={error ? true : undefined}
          className="h-full w-full min-w-0 bg-transparent font-mono text-[12.5px] uppercase text-ink placeholder:normal-case placeholder:text-faint focus:outline-none focus-visible:outline-none"
        />
      </div>
      {error ? <FieldError>{error}</FieldError> : null}
    </div>
  );
}

/** Rendu indicatif du texte à l'écran avec les couleurs, la police et la place choisies. */
function TextPreview({ data }: { data: Data }) {
  const c = data.colors;
  const ok = (v: string | undefined, fallback: string) => (v && /^#[0-9a-fA-F]{6}$/.test(v) ? v : fallback);
  const display = data.fonts?.display?.trim();
  const family = display ? (display.toLowerCase() === "fraunces" ? "var(--font-fraunces), serif" : display.toLowerCase() === "manrope" ? "var(--font-manrope), sans-serif" : `"${display}", var(--font-fraunces), serif`) : "var(--font-fraunces), serif";
  const place = data.textPlacement ?? "center";
  const ratio = data.format === "16:9" ? "16 / 9" : data.format === "1:1" ? "1 / 1" : data.format === "4:5" ? "4 / 5" : "9 / 16";
  return (
    <figure className="flex flex-col items-center gap-1.5">
      <div
        className={cx("relative flex w-[92px] flex-col overflow-hidden rounded-lg border border-line-strong p-2", place === "top" ? "justify-start" : place === "bottom" ? "justify-end" : "justify-center")}
        style={{ aspectRatio: ratio, background: `linear-gradient(160deg, ${ok(c?.background, "#E9E1D4")}, ${ok(c?.plate, "#241D17")})` }}
        aria-hidden
      >
        <span className="self-center rounded px-1.5 py-1 text-center text-[11px] leading-tight" style={{ backgroundColor: `${ok(c?.plate, "#241D17")}cc`, color: ok(c?.text, "#FBF7F0"), fontFamily: family }}>
          Vivre <em style={{ color: ok(c?.accent, "#C98A3C") }}>l'instant</em>
        </span>
      </div>
      <figcaption className="text-[11px] text-faint">Aperçu</figcaption>
    </figure>
  );
}

function LookField({ id, value, looks, onChange, error }: { id: string; value: string | null | undefined; looks: string[] | null; onChange: (v: string | null | undefined) => void; error?: string }) {
  if (looks && looks.length > 0) {
    const current = typeof value === "string" ? value : "";
    const known = !current || looks.some((l) => l.toLowerCase() === current.toLowerCase());
    return (
      <>
        <Select id={id} value={current} onChange={(e) => onChange(e.target.value || undefined)} aria-invalid={error ? true : undefined}>
          <option value="">Non précisé</option>
          {looks.map((l) => (
            <option key={l} value={l}>
              {l}
            </option>
          ))}
          {!known ? <option value={current}>{current} (introuvable)</option> : null}
        </Select>
        {!known ? <p className="mt-1 text-[11.5px] text-terracotta">Ce look n'existe pas (ou plus) dans la retouche : choisissez-en un autre.</p> : null}
      </>
    );
  }
  return (
    <>
      <Input id={id} value={typeof value === "string" ? value : ""} onChange={(e) => onChange(e.target.value ? e.target.value : undefined)} placeholder="Nom d'un look de la retouche" maxLength={80} aria-describedby={`${id}-h`} />
      <p id={`${id}-h`} className="mt-1 text-[11.5px] text-muted">
        Le nom exact d'un look enregistré dans la retouche. Il est appliqué à tous les plans.
      </p>
    </>
  );
}

/** Formulaire complet d'un style de montage (MontageStyleData). Tous les champs sont facultatifs. */
export function MontageStyleForm({ data, onChange, issues, looks, revealAll }: { data: Data; onChange: (d: Data) => void; issues: Issue[]; looks: string[] | null; revealAll: boolean }) {
  const id = useId();
  const err = (path: string) => issuesAt(issues, path)[0]?.message;

  const update = (fn: (d: Data) => void) => {
    const next = structuredClone(data) as Data;
    fn(next);
    for (const k of Object.keys(next) as (keyof Data)[]) if (next[k] === undefined) delete next[k];
    onChange(next);
  };

  const setRange = (key: "targetDurationS" | "videoClipS", part: "min" | "max", v: number | undefined) =>
    update((d) => {
      const r = { ...(d[key] ?? {}) } as { min?: number; max?: number };
      if (v === undefined) delete r[part];
      else r[part] = v;
      if (r.min === undefined && r.max === undefined) delete d[key];
      else d[key] = r as { min: number; max: number };
    });

  const setColor = (k: ColorKey, v: string | undefined) =>
    update((d) => {
      const c = { ...(d.colors ?? {}) } as Partial<Record<ColorKey, string>>;
      if (v === undefined) delete c[k];
      else c[k] = v;
      if (Object.keys(c).length === 0) delete d.colors;
      else d.colors = c as NonNullable<Data["colors"]>;
    });

  const setFont = (k: "display" | "text", v: string) =>
    update((d) => {
      const f = { ...(d.fonts ?? {}) } as Partial<Record<"display" | "text", string>>;
      if (!v) delete f[k];
      else f[k] = v;
      if (Object.keys(f).length === 0) delete d.fonts;
      else d.fonts = f as NonNullable<Data["fonts"]>;
    });

  const transitionType = data.transition?.type;

  return (
    <div className="space-y-5">
      <Group title="Déroulé" hint="Le Reel type, plan par plan. L'agent s'en sert pour choisir les plans et placer les textes.">
        <StructureEditor
          rows={data.structure ?? []}
          onChange={(rows) => update((d) => (rows.length ? (d.structure = rows) : delete d.structure))}
          issues={issues}
          target={data.targetDurationS && Number.isFinite(data.targetDurationS.min) && Number.isFinite(data.targetDurationS.max) ? data.targetDurationS : undefined}
          revealAll={revealAll}
        />
        {err("structure") ? <FieldError>{err("structure")}</FieldError> : null}
      </Group>

      <Group title="Format et durées">
        <div className="flex flex-wrap items-end gap-x-5 gap-y-3">
          <div>
            <FieldLabel>Format</FieldLabel>
            <Segmented
              label="Format"
              options={FORMATS.map((f) => ({ id: f.id, label: f.label, title: f.hint }))}
              value={data.format}
              onChange={(v) => update((d) => (d.format = v))}
              invalid={Boolean(err("format"))}
            />
          </div>
          <div className="w-32">
            <FieldLabel htmlFor={`${id}-fps`}>Images / seconde</FieldLabel>
            <Select id={`${id}-fps`} value={data.fps ?? ""} onChange={(e) => update((d) => (e.target.value ? (d.fps = Number(e.target.value) as Data["fps"]) : delete d.fps))}>
              <option value="">Non précisé</option>
              {FPS_OPTIONS.map((f) => (
                <option key={f} value={f}>
                  {f} i/s
                </option>
              ))}
            </Select>
          </div>
        </div>
        {err("format") ? <FieldError>{err("format")}</FieldError> : null}
        {err("fps") ? <FieldError>{err("fps")}</FieldError> : null}
        <div className="grid gap-3 sm:grid-cols-2">
          <RangeFields id={`${id}-target`} label="Durée visée du montage" value={data.targetDurationS} onChange={(p, v) => setRange("targetDurationS", p, v)} issues={issues} path="targetDurationS" />
          <RangeFields id={`${id}-clip`} label="Longueur d'un plan vidéo" value={data.videoClipS} onChange={(p, v) => setRange("videoClipS", p, v)} issues={issues} path="videoClipS" />
          <NumberField
            label="Durée d'affichage d'une photo"
            value={data.photoDurationS}
            onChange={(v) => update((d) => (v === undefined ? delete d.photoDurationS : (d.photoDurationS = v)))}
            unit="s"
            min={LIMITS.duration.min}
            max={LIMITS.duration.max}
            error={err("photoDurationS")}
          />
        </div>
        <p className="text-[11.5px] text-faint">Durées entre 0,2 et 120 secondes. Flèches ↑ / ↓ pour ajuster.</p>
      </Group>

      <Group title="Rythme et transitions">
        <div className="flex flex-wrap items-end gap-x-5 gap-y-3">
          <div>
            <FieldLabel>Rythme</FieldLabel>
            <Segmented label="Rythme" options={PACINGS.map((p) => ({ id: p.id, label: p.label }))} value={data.pacing} onChange={(v) => update((d) => (d.pacing = v))} invalid={Boolean(err("pacing"))} />
          </div>
          <div>
            <FieldLabel>Transition</FieldLabel>
            <Segmented
              label="Transition entre les plans"
              options={TRANSITIONS.map((t) => ({ id: t.id, label: t.label }))}
              value={transitionType}
              onChange={(v) =>
                update((d) => {
                  const prev = d.transition?.durationS;
                  d.transition = { type: v, durationS: v === "cut" ? 0 : prev && prev > 0 ? prev : 0.4 };
                })
              }
              invalid={Boolean(err("transition.type"))}
            />
          </div>
          <NumberField
            className="w-36"
            label="Durée de transition"
            value={data.transition?.durationS}
            onChange={(v) => update((d) => (d.transition = { type: d.transition?.type ?? "fade", durationS: v as number }))}
            unit="s"
            min={LIMITS.transition.min}
            max={LIMITS.transition.max}
            step={0.05}
            disabled={!transitionType || transitionType === "cut"}
            error={err("transition.durationS")}
          />
        </div>
        {err("pacing") ? <FieldError>{err("pacing")}</FieldError> : null}
        {err("transition.type") ? <FieldError>{err("transition.type")}</FieldError> : null}
        <div className="max-w-sm">
          <FieldLabel htmlFor={`${id}-look`}>Look appliqué à tous les plans</FieldLabel>
          <LookField id={`${id}-look`} value={data.look} looks={looks} onChange={(v) => update((d) => (v === undefined ? delete d.look : (d.look = v)))} error={err("look")} />
          {err("look") ? <FieldError>{err("look")}</FieldError> : null}
        </div>
      </Group>

      <Group title="Texte à l'écran">
        <div className="flex gap-4">
          <div className="min-w-0 flex-1 space-y-3">
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <FieldLabel htmlFor={`${id}-fd`}>Police des titres</FieldLabel>
                <Input id={`${id}-fd`} value={data.fonts?.display ?? ""} onChange={(e) => setFont("display", e.target.value)} placeholder="ex. Fraunces" maxLength={60} aria-invalid={err("fonts.display") ? true : undefined} />
                {err("fonts.display") ? <FieldError>{err("fonts.display")}</FieldError> : null}
              </div>
              <div>
                <FieldLabel htmlFor={`${id}-ft`}>Police du texte</FieldLabel>
                <Input id={`${id}-ft`} value={data.fonts?.text ?? ""} onChange={(e) => setFont("text", e.target.value)} placeholder="ex. Manrope" maxLength={60} aria-invalid={err("fonts.text") ? true : undefined} />
                {err("fonts.text") ? <FieldError>{err("fonts.text")}</FieldError> : null}
              </div>
            </div>
            <p className="-mt-1 text-[11.5px] text-muted">
              Le nom exact d'une police sur{" "}
              <a href="https://fonts.google.com" target="_blank" rel="noopener noreferrer" className="font-semibold text-chestnut underline underline-offset-2">
                Google Fonts
              </a>
              , avec ses majuscules.
            </p>
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <FieldLabel htmlFor={`${id}-anim`}>Animation du texte</FieldLabel>
                <Select id={`${id}-anim`} value={data.textAnimation ?? ""} onChange={(e) => update((d) => (e.target.value ? (d.textAnimation = e.target.value as Data["textAnimation"]) : delete d.textAnimation))}>
                  <option value="">Non précisée</option>
                  {TEXT_ANIMATIONS.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.label} — {t.hint}
                    </option>
                  ))}
                </Select>
                {err("textAnimation") ? <FieldError>{err("textAnimation")}</FieldError> : null}
              </div>
              <div>
                <FieldLabel>Place du texte</FieldLabel>
                <Segmented label="Place du texte" size="sm" options={PLACEMENTS.map((p) => ({ id: p.id, label: p.label }))} value={data.textPlacement} onChange={(v) => update((d) => (d.textPlacement = v))} invalid={Boolean(err("textPlacement"))} />
                {err("textPlacement") ? <FieldError>{err("textPlacement")}</FieldError> : null}
              </div>
            </div>
            <Switch checked={data.captions === true} onChange={(v) => update((d) => (d.captions = v))} label="Sous-titres" description="Afficher en texte ce qui est dit (voix off, face caméra)." />
          </div>
          <div className="hidden shrink-0 sm:block">
            <TextPreview data={data} />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          {COLOR_FIELDS.map((f) => (
            <ColorField key={f.id} label={f.label} hint={f.hint} value={data.colors?.[f.id]} onChange={(v) => setColor(f.id, v)} error={err(`colors.${f.id}`)} />
          ))}
        </div>
        {err("colors") ? <FieldError>{err("colors")}</FieldError> : null}
      </Group>

      <Group title="Musique">
        <Switch
          checked={Boolean(data.music)}
          onChange={(v) => update((d) => (d.music = v ? { mood: "", volume: 0.7, fadeOutS: 1 } : null))}
          label="Mettre de la musique"
          description={data.music ? undefined : "Sans musique : seulement le son des plans."}
        />
        {data.music ? (
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <FieldLabel htmlFor={`${id}-mood`} hint="ce que l'agent cherche">
                Ambiance
              </FieldLabel>
              <Input
                id={`${id}-mood`}
                value={data.music.mood ?? ""}
                onChange={(e) => update((d) => d.music && (d.music.mood = e.target.value))}
                placeholder="ex. acoustique, chaleureux, lent, sans paroles"
                maxLength={200}
              />
              {err("music.mood") ? <FieldError>{err("music.mood")}</FieldError> : null}
            </div>
            <div>
              <Slider
                label="Volume"
                value={Number.isFinite(data.music.volume) ? Math.min(1, Math.max(0, data.music.volume)) : 0.7}
                min={0}
                max={1}
                step={0.05}
                neutral={0.7}
                format={(v) => `${Math.round(v * 100)} %`}
                onChange={(v) => update((d) => d.music && (d.music.volume = v))}
              />
              {err("music.volume") ? <FieldError>{err("music.volume")}</FieldError> : null}
            </div>
            <NumberField
              label="Fondu de fin"
              value={data.music.fadeOutS}
              onChange={(v) => update((d) => d.music && (d.music.fadeOutS = v as number))}
              unit="s"
              min={LIMITS.fadeOut.min}
              max={LIMITS.fadeOut.max}
              error={err("music.fadeOutS")}
            />
          </div>
        ) : null}
      </Group>

      <Group title="Carton final">
        <Switch
          checked={Boolean(data.endCard)}
          onChange={(v) => update((d) => (d.endCard = v ? { title: "", subtitle: null, durationS: 2 } : null))}
          label="Terminer par un carton"
          description={data.endCard ? undefined : "Un écran de fin avec un titre (nom du lieu, appel à l'action)."}
        />
        {data.endCard ? (
          <div className="grid gap-3 sm:grid-cols-[1fr_1fr_120px]">
            <div>
              <FieldLabel htmlFor={`${id}-ect`}>Titre</FieldLabel>
              <Input id={`${id}-ect`} value={data.endCard.title ?? ""} onChange={(e) => update((d) => d.endCard && (d.endCard.title = e.target.value))} placeholder="ex. Réservez votre séjour" maxLength={120} aria-invalid={err("endCard.title") && revealAll ? true : undefined} />
              {err("endCard.title") && revealAll ? <FieldError>{err("endCard.title")}</FieldError> : null}
            </div>
            <div>
              <FieldLabel htmlFor={`${id}-ecs`} hint="facultatif">
                Sous-titre
              </FieldLabel>
              <Input id={`${id}-ecs`} value={data.endCard.subtitle ?? ""} onChange={(e) => update((d) => d.endCard && (d.endCard.subtitle = e.target.value || null))} maxLength={160} />
            </div>
            <NumberField
              label="Durée"
              value={data.endCard.durationS}
              onChange={(v) => update((d) => d.endCard && (d.endCard.durationS = v as number))}
              unit="s"
              min={LIMITS.duration.min}
              max={LIMITS.duration.max}
              error={err("endCard.durationS")}
            />
          </div>
        ) : null}
      </Group>
    </div>
  );
}
