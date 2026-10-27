import { z } from "zod";
import { shortId } from "@/lib/client/montage/style";
import type { MontageClip, MontageSpec, MontageText, RetouchParams } from "@/lib/shared/types";

/**
 * Validation des spécifications de montage (routes ET service : l'agent appelle le service
 * directement, avec des données parfois approximatives). Les identifiants manquants des plans
 * et des textes sont créés ; les fins avant les débuts sont corrigées.
 */

const Clip = z.object({
  id: z.string().min(1).max(64).optional(),
  assetId: z.string().uuid(),
  inS: z.number().min(0).max(36_000).default(0),
  outS: z.number().min(0.05).max(36_000),
  motion: z.enum(["none", "zoom-in", "zoom-out", "pan-left", "pan-right"]).optional(),
  muted: z.boolean().optional(),
});

const Text = z.object({
  id: z.string().min(1).max(64).optional(),
  startS: z.number().min(0).max(36_000),
  endS: z.number().min(0).max(36_000),
  text: z.string().max(600),
  position: z.enum(["top", "center", "bottom"]).optional(),
  style: z.enum(["hook", "title", "caption", "label"]).optional(),
});

const EndCard = z.object({
  title: z.string().max(200),
  subtitle: z.string().max(300).nullable().default(null),
  durationS: z.number().min(0.5).max(10).default(2.5),
});

export const SpecPatchSchema = z
  .object({
    format: z.enum(["9:16", "4:5", "1:1", "16:9"]),
    fps: z.union([z.literal(24), z.literal(25), z.literal(30), z.literal(60)]),
    clips: z.array(Clip).max(300),
    texts: z.array(Text).max(200),
    transition: z.enum(["cut", "fade", "slide", "zoom"]),
    transitionS: z.number().min(0).max(3),
    look: z.record(z.string(), z.unknown()).nullable(),
    lookId: z.string().max(80).nullable(),
    musicAssetId: z.string().uuid().nullable(),
    musicVolume: z.number().min(0).max(1),
    endCard: EndCard.nullable(),
    style: z.string().max(80).nullable(),
  })
  .partial();

export type SpecPatchInput = z.input<typeof SpecPatchSchema>;

const r3 = (n: number) => Math.round(n * 1000) / 1000;

/** Valide et normalise une spécification partielle (lève une ZodError si invalide). */
export function parseSpecPatch(raw: unknown, defaults: { textPlacement?: MontageText["position"] } = {}): Partial<MontageSpec> {
  const p = SpecPatchSchema.parse(raw ?? {});
  const out: Partial<MontageSpec> = {};
  if (p.format !== undefined) out.format = p.format;
  if (p.fps !== undefined) out.fps = p.fps;
  if (p.transition !== undefined) out.transition = p.transition;
  if (p.transitionS !== undefined) out.transitionS = r3(p.transitionS);
  if (p.look !== undefined) out.look = p.look as Partial<RetouchParams> | null;
  if (p.lookId !== undefined) out.lookId = p.lookId;
  if (p.musicAssetId !== undefined) out.musicAssetId = p.musicAssetId;
  if (p.musicVolume !== undefined) out.musicVolume = r3(p.musicVolume);
  if (p.endCard !== undefined) out.endCard = p.endCard ? { title: p.endCard.title, subtitle: p.endCard.subtitle?.trim() ? p.endCard.subtitle : null, durationS: r3(p.endCard.durationS) } : null;
  if (p.style !== undefined) out.style = p.style?.trim() ? p.style.trim() : null;
  if (p.clips !== undefined) {
    const seen = new Set<string>();
    out.clips = p.clips.map((c): MontageClip => {
      let id = c.id ?? shortId("c");
      if (seen.has(id)) id = shortId("c");
      seen.add(id);
      const inS = r3(Math.max(0, c.inS));
      const outS = r3(Math.max(inS + 0.2, c.outS));
      return { id, assetId: c.assetId.toLowerCase(), inS, outS, ...(c.motion ? { motion: c.motion } : {}), ...(c.muted !== undefined ? { muted: c.muted } : {}) };
    });
  }
  if (p.texts !== undefined) {
    const seen = new Set<string>();
    out.texts = p.texts.map((t): MontageText => {
      let id = t.id ?? shortId("t");
      if (seen.has(id)) id = shortId("t");
      seen.add(id);
      const startS = r3(t.startS);
      const endS = r3(Math.max(startS + 0.2, t.endS));
      return { id, startS, endS, text: t.text, position: t.position ?? defaults.textPlacement ?? "center", style: t.style ?? "caption" };
    });
  }
  return out;
}
