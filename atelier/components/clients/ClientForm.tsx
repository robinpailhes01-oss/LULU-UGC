"use client";

import { useState } from "react";
import { Check } from "lucide-react";
import { PlatformGlyph } from "@/components/schedule/PlatformGlyph";
import { cx } from "@/components/ui/cx";
import { Input } from "@/components/ui/Field";
import { CLIENT_COLORS, normalizeSocial, SECTOR_SUGGESTIONS, SOCIAL_LABEL, SOCIAL_PLACEHOLDER, SOCIAL_PLATFORMS } from "@/lib/shared/clients";
import type { ClientSocial, SocialPlatform } from "@/lib/shared/types";

/** Saisie des réseaux : une valeur brute par plateforme (adresse ou @identifiant). */
export type SocialDraft = Record<SocialPlatform, string>;

export function emptySocials(): SocialDraft {
  return { instagram: "", tiktok: "", facebook: "", linkedin: "", youtube: "" };
}

export function socialsToDraft(socials: ClientSocial[]): SocialDraft {
  const d = emptySocials();
  for (const s of socials) d[s.platform] = s.handle && (s.platform === "instagram" || s.platform === "tiktok") ? `@${s.handle}` : s.url ?? (s.handle ? `@${s.handle}` : "");
  return d;
}

/** Erreur de saisie par plateforme (même normalisation que le serveur). */
export function socialErrors(d: SocialDraft): Partial<Record<SocialPlatform, string>> {
  const out: Partial<Record<SocialPlatform, string>> = {};
  for (const p of SOCIAL_PLATFORMS) {
    try {
      normalizeSocial(p, d[p]);
    } catch (err) {
      out[p] = err instanceof Error ? err.message : "Adresse illisible.";
    }
  }
  return out;
}

export function draftToPayload(d: SocialDraft): { platform: SocialPlatform; value: string }[] {
  return SOCIAL_PLATFORMS.filter((p) => d[p].trim()).map((p) => ({ platform: p, value: d[p].trim() }));
}

/** Champs des réseaux : une erreur s'affiche dès que le champ est quitté (ou à l'envoi : `showAll`). */
export function SocialFields({ value, onChange, idPrefix, showAll }: { value: SocialDraft; onChange: (v: SocialDraft) => void; idPrefix: string; showAll?: boolean }) {
  const [left, setLeft] = useState<Partial<Record<SocialPlatform, boolean>>>({});
  const all = socialErrors(value);
  const errors: Partial<Record<SocialPlatform, string>> = {};
  for (const p of SOCIAL_PLATFORMS) if (all[p] && (showAll || left[p])) errors[p] = all[p];
  return (
    <div className="space-y-2">
      {SOCIAL_PLATFORMS.map((p) => (
        <div key={p}>
          <div className="flex items-center gap-2">
            <label htmlFor={`${idPrefix}-${p}`} className="flex w-[104px] shrink-0 items-center gap-2 text-[13px] text-ink">
              <PlatformGlyph platform={p} title={false} className="text-muted" />
              {SOCIAL_LABEL[p]}
            </label>
            <Input
              id={`${idPrefix}-${p}`}
              value={value[p]}
              onChange={(e) => onChange({ ...value, [p]: e.target.value })}
              onBlur={() => setLeft((l) => ({ ...l, [p]: true }))}
              placeholder={SOCIAL_PLACEHOLDER[p]}
              aria-invalid={errors[p] ? true : undefined}
              aria-describedby={errors[p] ? `${idPrefix}-${p}-err` : undefined}
              className={cx("min-w-0", errors[p] && "border-terracotta focus:border-terracotta focus:ring-terracotta/20")}
              autoComplete="off"
              spellCheck={false}
            />
          </div>
          {errors[p] ? (
            <p id={`${idPrefix}-${p}-err`} className="ml-[112px] mt-1 text-[12px] text-terracotta">
              {errors[p]}
            </p>
          ) : null}
        </div>
      ))}
    </div>
  );
}

export function SectorField({ id, value, onChange }: { id: string; value: string; onChange: (v: string) => void }) {
  const q = value.trim().toLowerCase();
  const shown = SECTOR_SUGGESTIONS.filter((s) => !q || (s.toLowerCase().includes(q) && s.toLowerCase() !== q)).slice(0, 7);
  return (
    <div>
      <Input id={id} value={value} onChange={(e) => onChange(e.target.value)} placeholder="Restaurant, hôtel, boutique…" maxLength={80} autoComplete="off" />
      {shown.length ? (
        <div className="mt-2 flex flex-wrap gap-1.5" aria-label="Suggestions de secteur">
          {shown.map((s) => (
            <button key={s} type="button" onClick={() => onChange(s)} className="h-7 rounded-full border border-line bg-surface px-2.5 text-[12.5px] text-ink hover:border-line-strong hover:bg-hover">
              {s}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}

export function ColorField({ value, onChange, label = "Couleur" }: { value: string; onChange: (v: string) => void; label?: string }) {
  return (
    <div role="radiogroup" aria-label={label} className="flex flex-wrap gap-2">
      {CLIENT_COLORS.map((c) => (
        <button
          key={c}
          type="button"
          role="radio"
          aria-checked={value.toUpperCase() === c}
          aria-label={c}
          onClick={() => onChange(c)}
          className={cx("flex h-8 w-8 items-center justify-center rounded-full ring-offset-2 ring-offset-surface transition-shadow", value.toUpperCase() === c ? "ring-2 ring-ink" : "hover:ring-2 hover:ring-line-strong")}
          style={{ backgroundColor: c }}
        >
          {value.toUpperCase() === c ? <Check className="h-4 w-4 text-surface" aria-hidden /> : null}
        </button>
      ))}
    </div>
  );
}
