"use client";

import Link from "next/link";
import { useState } from "react";
import { ArrowLeft, ArrowRight, Check, Circle, ExternalLink, Film, Image as ImageIcon, Music, Trash2, Volume2, VolumeX, X } from "lucide-react";
import { MediaPickerDialog } from "@/components/library/MediaPickerDialog";
import { Button } from "@/components/ui/Button";
import { ConfirmDialog } from "@/components/ui/Dialog";
import { Checkbox, Input, Label, Select, Textarea } from "@/components/ui/Field";
import { Slider } from "@/components/ui/Slider";
import { cx } from "@/components/ui/cx";
import { formatSeconds, Section, Segmented, SecondsField } from "@/components/montage/editor/controls";
import type { Selection } from "@/components/montage/editor/Timeline";
import {
  ANIMATION_LABEL,
  FORMAT_LABEL,
  FORMATS,
  MOTION_LABEL,
  MOTIONS,
  PLACEMENT_LABEL,
  resolveStyle,
  styleSummary,
  TEXT_STYLE_LABEL,
  TRANSITION_LABEL,
  TRANSITIONS,
} from "@/lib/client/montage/style";
import type { MontageTiming } from "@/lib/client/montage/timing";
import type { StyleGuide } from "@/lib/client/montage/types";
import type { Asset, Look, MontageClip, MontageSpec, MontageText, Skill } from "@/lib/shared/types";

type UpdateSpec = (fn: (s: MontageSpec) => MontageSpec) => void;

// ---------------------------------------------------------------------------------------------
// Réglages du montage

export function MontageSettings({
  spec,
  title,
  timing,
  assets,
  guide,
  styles,
  looks,
  updateSpec,
  onApplyStyle,
  onSelect,
  onAddAssets,
  focus,
}: {
  spec: MontageSpec;
  title: string;
  timing: MontageTiming;
  assets: Record<string, Asset>;
  guide: StyleGuide | null;
  styles: Skill[] | null;
  looks: Look[] | null;
  updateSpec: UpdateSpec;
  onApplyStyle: (slug: string | null) => Promise<void>;
  onSelect: (s: Selection) => void;
  onAddAssets: (a: Asset[]) => void;
  focus?: "end" | "music" | null;
}) {
  const [pendingStyle, setPendingStyle] = useState<string | null | undefined>(undefined);
  const [applying, setApplying] = useState(false);
  const [musicPicker, setMusicPicker] = useState(false);
  const current = styles?.find((s) => s.slug === spec.style) ?? null;
  const pendingSkill = pendingStyle ? styles?.find((s) => s.slug === pendingStyle) : null;
  const music = spec.musicAssetId ? assets[spec.musicAssetId] : null;
  const target = guide?.targetDurationS ?? null;
  const inTarget = target ? timing.durationS >= target.min - 0.25 && timing.durationS <= target.max + 0.25 : true;

  const endCard = (
    <Section title="Carte de fin" className={cx(focus === "end" && "bg-honey-soft/30")}>
      <Checkbox
        checked={Boolean(spec.endCard)}
        onChange={(on) => updateSpec((s) => ({ ...s, endCard: on ? { title: title || "June", subtitle: null, durationS: 2.5 } : null }))}
        label="Terminer sur une carte de fin"
      />
      {spec.endCard ? (
        <div className="mt-3 space-y-3">
          <div>
            <Label htmlFor="end-title">Titre</Label>
            <Input id="end-title" value={spec.endCard.title} maxLength={200} onChange={(e) => updateSpec((s) => (s.endCard ? { ...s, endCard: { ...s.endCard, title: e.target.value } } : s))} />
          </div>
          <div>
            <Label htmlFor="end-sub" hint="facultatif">
              Sous-titre
            </Label>
            <Input id="end-sub" value={spec.endCard.subtitle ?? ""} maxLength={300} onChange={(e) => updateSpec((s) => (s.endCard ? { ...s, endCard: { ...s.endCard, subtitle: e.target.value || null } } : s))} />
          </div>
          <SecondsField label="Durée" value={spec.endCard.durationS} min={0.5} max={10} step={0.5} onCommit={(v) => updateSpec((s) => (s.endCard ? { ...s, endCard: { ...s.endCard, durationS: v } } : s))} className="w-28" />
        </div>
      ) : null}
    </Section>
  );

  const musicSection = (
    <Section title="Musique" className={cx(focus === "music" && "bg-plum-soft/40")}>
      {music ? (
        <div className="flex items-center gap-2 rounded-xl bg-sunken px-3 py-2">
          <Music className="h-4 w-4 shrink-0 text-plum" aria-hidden />
          <span className="min-w-0 flex-1 truncate text-[13px] font-semibold">{music.name}</span>
          <button type="button" className="rounded-full p-1 text-muted hover:bg-hover hover:text-ink" aria-label="Retirer la musique" onClick={() => updateSpec((s) => ({ ...s, musicAssetId: null }))}>
            <X className="h-4 w-4" />
          </button>
        </div>
      ) : (
        <p className="text-[12.5px] text-muted">{guide?.musicMood ? `Le style suggère : ${guide.musicMood}.` : "Aucune musique."}</p>
      )}
      <Button size="sm" className="mt-2" icon={<Music className="h-4 w-4" />} onClick={() => setMusicPicker(true)}>
        {music ? "Changer de musique" : "Choisir une musique"}
      </Button>
      {spec.musicAssetId ? (
        <Slider className="mt-3" label="Volume" value={Math.round(spec.musicVolume * 100)} min={0} max={100} neutral={60} format={(v) => `${v} %`} onChange={(v) => updateSpec((s) => ({ ...s, musicVolume: v / 100 }))} />
      ) : null}
      <MediaPickerDialog
        open={musicPicker}
        onClose={() => setMusicPicker(false)}
        kinds={["audio"]}
        multiple={false}
        title="Choisir une musique"
        confirmLabel="Utiliser"
        onPick={(list) => {
          const a = list[0];
          if (!a) return;
          onAddAssets(list);
          updateSpec((s) => ({ ...s, musicAssetId: a.id }));
        }}
      />
    </Section>
  );

  if (focus === "end") return endCard;
  if (focus === "music") return musicSection;

  return (
    <div>
      <Section
        title="Style"
        aside={
          spec.style ? (
            <Link href={`/skills/${encodeURIComponent(spec.style)}`} className="inline-flex items-center gap-1 text-[12px] font-semibold text-chestnut hover:underline">
              Modifier ce style <ExternalLink className="h-3 w-3" aria-hidden />
            </Link>
          ) : (
            <Link href="/skills" className="text-[12px] font-semibold text-chestnut hover:underline">
              Gérer les styles
            </Link>
          )
        }
      >
        <Select aria-label="Style du montage" value={spec.style ?? ""} onChange={(e) => setPendingStyle(e.target.value || null)}>
          <option value="">Sans style</option>
          {(styles ?? []).map((s) => (
            <option key={s.slug} value={s.slug}>
              {s.name}
            </option>
          ))}
          {spec.style && styles && !current ? <option value={spec.style}>{spec.style} (introuvable)</option> : null}
        </Select>
        {guide ? (
          <p className="mt-2 text-[12.5px] leading-relaxed text-muted">
            {guide.summary}
            {guide.hasTemplate ? " · modèle HyperFrames propre" : ""}
          </p>
        ) : null}
        {guide && !guide.found ? <p className="mt-2 text-[12.5px] text-terracotta">Ce style n'existe plus : les valeurs par défaut sont utilisées.</p> : null}
        {guide?.issues.length ? (
          <ul className="mt-2 space-y-1 text-[12px] text-[#7a5220]">
            {guide.issues.map((i) => (
              <li key={i.field}>{i.message}</li>
            ))}
          </ul>
        ) : null}
        <p className="mt-3 flex items-center justify-between rounded-lg bg-sunken px-3 py-2 text-[12.5px]">
          <span>
            Durée <strong className="tabular-nums">{formatSeconds(timing.durationS)}</strong>
          </span>
          {target ? (
            <span className={cx("font-semibold", inTarget ? "text-olive" : "text-[#7a5220]")}>
              visée {target.min}–{target.max} s{inTarget ? " ✓" : ""}
            </span>
          ) : null}
        </p>
      </Section>

      {guide && guide.structure.length > 0 ? (
        <Section title="Déroulé du style">
          <ol className="space-y-2.5">
            {guide.structure.map((r) => {
              const done = r.clipIds.length > 0;
              return (
                <li key={`${r.index}-${r.role}`} className="flex gap-2.5">
                  <span className={cx("mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full", done ? "bg-olive text-surface" : "border border-line-strong text-faint")}>
                    {done ? <Check className="h-3 w-3" aria-hidden /> : <Circle className="h-2 w-2" aria-hidden />}
                    <span className="sr-only">{done ? "rempli" : "à remplir"}</span>
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-[13px] font-semibold first-letter:uppercase">
                      {r.role}
                      {typeof r.durationS === "number" ? <span className="ml-1.5 font-normal text-faint">≈ {r.durationS} s</span> : null}
                    </p>
                    <p className="text-[12px] leading-snug text-muted">{r.shot}</p>
                    {r.text ? <p className="text-[12px] italic leading-snug text-chestnut">Texte : {r.text}</p> : null}
                    {r.clipIds.length ? (
                      <div className="mt-1 flex flex-wrap gap-1">
                        {r.clipIds.map((cid) => {
                          const i = spec.clips.findIndex((c) => c.id === cid);
                          const a = i >= 0 ? assets[spec.clips[i].assetId] : undefined;
                          const thumb = a?.urls.thumb ?? a?.urls.poster;
                          return (
                            <button key={cid} type="button" onClick={() => onSelect({ kind: "clip", id: cid })} className="relative h-9 w-7 overflow-hidden rounded bg-night ring-chestnut hover:ring-2" aria-label={`Plan ${i + 1}`}>
                              {/* eslint-disable-next-line @next/next/no-img-element */}
                              {thumb ? <img src={thumb} alt="" className="h-full w-full object-cover" /> : null}
                              <span className="absolute bottom-0 right-0.5 text-[9px] font-bold text-surface">{i + 1}</span>
                            </button>
                          );
                        })}
                      </div>
                    ) : null}
                  </div>
                </li>
              );
            })}
          </ol>
        </Section>
      ) : null}

      <Section title="Format">
        <Segmented label="Format" value={spec.format} options={FORMATS.map((f) => ({ value: f, label: FORMAT_LABEL[f] }))} onChange={(f) => updateSpec((s) => ({ ...s, format: f }))} />
        <div className="mt-3 flex items-center gap-2">
          <Label htmlFor="fps">Images par seconde</Label>
          <Select id="fps" className="ml-auto w-24" value={spec.fps} onChange={(e) => updateSpec((s) => ({ ...s, fps: Number(e.target.value) as MontageSpec["fps"] }))}>
            {[24, 25, 30, 60].map((f) => (
              <option key={f} value={f}>
                {f}
              </option>
            ))}
          </Select>
        </div>
      </Section>

      <Section title="Transitions">
        <Segmented
          label="Transition entre les plans"
          value={spec.transition}
          options={TRANSITIONS.map((t) => ({ value: t, label: TRANSITION_LABEL[t] }))}
          onChange={(t) => updateSpec((s) => ({ ...s, transition: t, transitionS: t === "cut" ? 0 : s.transitionS > 0 ? s.transitionS : 0.4 }))}
        />
        {spec.transition !== "cut" ? (
          <Slider className="mt-3" label="Durée" value={spec.transitionS} min={0.1} max={1.5} step={0.05} neutral={0.4} format={(v) => formatSeconds(v)} onChange={(v) => updateSpec((s) => ({ ...s, transitionS: Math.round(v * 100) / 100 }))} />
        ) : null}
      </Section>

      {looks ? (
        <Section title="Look">
          <Select
            aria-label="Look appliqué à tous les plans"
            value={spec.lookId ?? ""}
            onChange={(e) => {
              const l = looks.find((x) => x.id === e.target.value);
              updateSpec((s) => ({ ...s, lookId: l?.id ?? null, look: l ? l.params : null }));
            }}
          >
            <option value="">Aucun look</option>
            {looks.map((l) => (
              <option key={l.id} value={l.id}>
                {l.name}
              </option>
            ))}
          </Select>
          {guide?.look ? <p className="mt-2 text-[12px] text-muted">Le style conseille « {guide.look} ».</p> : null}
        </Section>
      ) : null}

      {musicSection}
      {endCard}

      <ConfirmDialog
        open={pendingStyle !== undefined}
        onClose={() => setPendingStyle(undefined)}
        title={pendingStyle ? `Appliquer « ${pendingSkill?.name ?? pendingStyle} » ?` : "Retirer le style ?"}
        confirmLabel={pendingStyle ? "Appliquer le style" : "Retirer le style"}
        loading={applying}
        onConfirm={async () => {
          setApplying(true);
          try {
            await onApplyStyle(pendingStyle ?? null);
          } finally {
            setApplying(false);
            setPendingStyle(undefined);
          }
        }}
      >
        {pendingStyle ? (
          <>
            Le format, le rythme des plans, la transition, le look, le volume de la musique et la carte de fin reprennent les valeurs du style.
            Vos plans, textes et musique sont conservés.
            {pendingSkill ? <span className="mt-2 block font-semibold text-ink">{styleSummary(resolveStyle(pendingSkill.data).style)}</span> : null}
          </>
        ) : (
          "Les valeurs actuelles sont conservées ; seules les valeurs par défaut d'Atelier s'appliqueront aux prochains réglages."
        )}
      </ConfirmDialog>
    </div>
  );
}

// ---------------------------------------------------------------------------------------------
// Plan sélectionné

export function ClipInspector({
  clip,
  index,
  count,
  asset,
  startS,
  updateClip,
  onRemove,
  onMove,
  onSeek,
}: {
  clip: MontageClip;
  index: number;
  count: number;
  asset: Asset | undefined;
  startS: number;
  updateClip: (patch: Partial<MontageClip>) => void;
  onRemove: () => void;
  onMove: (to: number) => void;
  onSeek: (t: number) => void;
}) {
  const isVideo = asset?.kind === "video";
  const srcDur = asset?.durationS && asset.durationS > 0 ? asset.durationS : null;
  const len = clip.outS - clip.inS;
  const thumb = asset?.urls.thumb ?? asset?.urls.poster ?? null;
  const keepSound = clip.muted === false;
  return (
    <div>
      <Section title={`Plan ${index + 1} sur ${count}`}>
        <div className="flex gap-3">
          <button type="button" onClick={() => onSeek(startS + 0.05)} className="relative h-24 w-[54px] shrink-0 overflow-hidden rounded-lg bg-night" aria-label="Voir ce plan dans l'aperçu">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            {thumb ? <img src={thumb} alt="" className="h-full w-full object-cover" /> : null}
          </button>
          <div className="min-w-0 flex-1">
            <p className="truncate text-[13.5px] font-semibold" title={asset?.name}>
              {asset?.ai?.title ?? asset?.name ?? "Média introuvable"}
            </p>
            <p className="mt-0.5 flex items-center gap-1.5 text-[12px] text-muted">
              {isVideo ? <Film className="h-3.5 w-3.5" aria-hidden /> : <ImageIcon className="h-3.5 w-3.5" aria-hidden />}
              {isVideo ? `Vidéo${srcDur ? ` de ${formatSeconds(srcDur)}` : ""}` : "Photo"}
            </p>
            <div className="mt-2 flex gap-1">
              <Button size="sm" variant="ghost" icon={<ArrowLeft className="h-4 w-4" />} disabled={index === 0} onClick={() => onMove(index - 1)} aria-label="Avancer le plan">
                <span className="sr-only">Avancer</span>
              </Button>
              <Button size="sm" variant="ghost" icon={<ArrowRight className="h-4 w-4" />} disabled={index === count - 1} onClick={() => onMove(index + 1)} aria-label="Reculer le plan">
                <span className="sr-only">Reculer</span>
              </Button>
              <Button size="sm" variant="ghost" className="ml-auto text-terracotta hover:bg-terracotta-soft" icon={<Trash2 className="h-4 w-4" />} onClick={onRemove}>
                Retirer
              </Button>
            </div>
          </div>
        </div>
      </Section>

      {isVideo ? (
        <Section title="Découpe">
          <Slider
            label="Point d'entrée"
            value={clip.inS}
            min={0}
            max={Math.max(0.1, (srcDur ?? clip.outS + 5) - 0.2)}
            step={0.05}
            neutral={0}
            format={formatSeconds}
            onChange={(v) => updateClip({ inS: round(v), outS: round(Math.min(srcDur ?? Infinity, v + len)) })}
          />
          <Slider
            className="mt-3"
            label="Durée du plan"
            value={len}
            min={0.2}
            max={Math.max(0.3, (srcDur ?? clip.inS + 30) - clip.inS)}
            step={0.05}
            neutral={len}
            format={formatSeconds}
            onChange={(v) => updateClip({ outS: round(clip.inS + v) })}
          />
          <div className="mt-3 grid grid-cols-2 gap-2">
            <SecondsField label="Début" value={clip.inS} min={0} max={Math.max(0, (srcDur ?? 36000) - 0.2)} onCommit={(v) => updateClip({ inS: v, outS: round(Math.max(v + 0.2, Math.min(srcDur ?? Infinity, v + len))) })} />
            <SecondsField label="Fin" value={clip.outS} min={clip.inS + 0.2} max={srcDur ?? 36000} onCommit={(v) => updateClip({ outS: v })} />
          </div>
          <button
            type="button"
            onClick={() => updateClip({ muted: keepSound })}
            aria-pressed={keepSound}
            className={cx("mt-3 flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-[13px]", keepSound ? "bg-olive-soft text-olive" : "bg-sunken text-ink hover:bg-hover")}
          >
            {keepSound ? <Volume2 className="h-4 w-4" aria-hidden /> : <VolumeX className="h-4 w-4" aria-hidden />}
            <span className="flex-1 font-semibold">{keepSound ? "Son du plan conservé" : "Plan muet"}</span>
            <span className="text-[12px] underline-offset-2 hover:underline">{keepSound ? "Couper" : "Garder le son"}</span>
          </button>
        </Section>
      ) : (
        <Section title="Durée">
          <Slider label="Durée d'affichage" value={len} min={0.3} max={10} step={0.1} neutral={len} format={formatSeconds} onChange={(v) => updateClip({ inS: 0, outS: round(v) })} />
          <SecondsField className="mt-3 w-28" label="Secondes" value={len} min={0.3} max={30} onCommit={(v) => updateClip({ inS: 0, outS: v })} />
        </Section>
      )}

      <Section title="Mouvement">
        <Select aria-label="Mouvement lent" value={clip.motion ?? "none"} onChange={(e) => updateClip({ motion: e.target.value as MontageClip["motion"] })}>
          {MOTIONS.map((m) => (
            <option key={m} value={m}>
              {MOTION_LABEL[m]}
            </option>
          ))}
        </Select>
        <p className="mt-2 text-[12px] text-muted">Zoom ou panoramique lent sur toute la durée du plan (effet Ken Burns).</p>
      </Section>
    </div>
  );
}

// ---------------------------------------------------------------------------------------------
// Texte sélectionné

export function TextInspector({
  text,
  durationS,
  currentTime,
  animation,
  updateText,
  onRemove,
}: {
  text: MontageText;
  durationS: number;
  currentTime: number;
  animation: string | null;
  updateText: (patch: Partial<MontageText>) => void;
  onRemove: () => void;
}) {
  return (
    <div>
      <Section
        title="Texte"
        aside={
          <Button size="sm" variant="ghost" className="text-terracotta hover:bg-terracotta-soft" icon={<Trash2 className="h-4 w-4" />} onClick={onRemove}>
            Retirer
          </Button>
        }
      >
        <Label htmlFor={`txt-${text.id}`} hint="*mot* = italique">
          Contenu
        </Label>
        <Textarea id={`txt-${text.id}`} value={text.text} maxLength={600} rows={3} onChange={(e) => updateText({ text: e.target.value })} placeholder="Ex. Le matin, *ici*, a un goût de lenteur" />
        <div className="mt-3">
          <p className="mb-1.5 text-[12px] text-muted">Style</p>
          <Segmented label="Style du texte" size="sm" value={text.style} options={(Object.keys(TEXT_STYLE_LABEL) as MontageText["style"][]).map((s) => ({ value: s, label: TEXT_STYLE_LABEL[s] }))} onChange={(s) => updateText({ style: s })} />
        </div>
        <div className="mt-3">
          <p className="mb-1.5 text-[12px] text-muted">Position</p>
          <Segmented label="Position du texte" size="sm" value={text.position} options={(["top", "center", "bottom"] as const).map((p) => ({ value: p, label: PLACEMENT_LABEL[p] }))} onChange={(p) => updateText({ position: p })} />
        </div>
        {animation ? <p className="mt-3 text-[12px] text-muted">Animation du style : {animation}.</p> : null}
      </Section>
      <Section title="Moment">
        <div className="grid grid-cols-2 gap-2">
          <SecondsField label="Apparaît à" value={text.startS} min={0} max={Math.max(0, durationS - 0.2)} onCommit={(v) => updateText({ startS: v, endS: Math.max(text.endS, v + 0.3) })} />
          <SecondsField label="Disparaît à" value={text.endS} min={text.startS + 0.2} max={durationS} onCommit={(v) => updateText({ endS: v })} />
        </div>
        <div className="mt-2 flex gap-1.5">
          <Button size="sm" variant="ghost" onClick={() => updateText({ startS: round(currentTime), endS: round(Math.max(text.endS, currentTime + 0.5)) })}>
            Début ici
          </Button>
          <Button size="sm" variant="ghost" onClick={() => updateText({ endS: round(Math.max(text.startS + 0.3, currentTime)) })}>
            Fin ici
          </Button>
        </div>
      </Section>
    </div>
  );
}

export function animationLabel(guide: StyleGuide | null): string | null {
  return guide ? ANIMATION_LABEL[guide.textAnimation].toLowerCase() : null;
}

const round = (v: number) => Math.round(v * 100) / 100;

