import { z } from "zod";
import { getActor } from "@/lib/server/auth";
import { body, notFound, route } from "@/lib/server/http";
import { deleteMontage, getMontage, updateMontage } from "@/lib/server/services/montages";
import type { MontageSpec } from "@/lib/shared/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ id: string }> };

/** Montage complet : spécification, composition, médias utilisés, déroulé et guide du style. */
export const GET = route<Ctx>(async (_req, { params }) => {
  const m = await getMontage((await params).id);
  if (!m) throw notFound("Montage");
  return m;
});

const Patch = z.object({
  title: z.string().max(200).optional(),
  /** Fusion superficielle avec la spécification actuelle. */
  spec: z.record(z.string(), z.unknown()).optional(),
  /** Code HyperFrames personnalisé (passe en mode « code »), ou null pour revenir à la version générée. */
  html: z.string().max(2_000_000).nullable().optional(),
});

export const PATCH = route<Ctx>(async (req, { params }) => {
  const input = await body(req, Patch);
  return updateMontage((await params).id, { title: input.title, spec: input.spec as Partial<MontageSpec> | undefined, html: input.html }, await getActor());
});

export const DELETE = route<Ctx>(async (_req, { params }) => {
  await deleteMontage((await params).id, await getActor());
  return { ok: true };
});
