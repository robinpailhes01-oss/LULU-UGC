import { z } from "zod";
import { getActor } from "@/lib/server/auth";
import { body, route } from "@/lib/server/http";
import { deleteSkill, getRepoVersion, requireSkill, SKILL_KINDS, updateSkill } from "@/lib/server/services/skills";
import type { SkillKind } from "@/lib/shared/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ slug: string }> };

/** Le skill, et la version du dépôt quand elle diffère (pour comparer). */
export const GET = route<Ctx>(async (_req, { params }) => {
  const { slug } = await params;
  const skill = await requireSkill(slug);
  const repo = skill.repoUpdateAvailable ? getRepoVersion(slug) : null;
  return { skill, repoVersion: repo };
});

const Patch = z.object({
  kind: z.enum(SKILL_KINDS as [SkillKind, ...SkillKind[]]).optional(),
  name: z.string().min(1).max(120).optional(),
  description: z.string().max(1000).optional(),
  body: z.string().max(100_000).optional(),
  data: z.record(z.string(), z.unknown()).nullable().optional(),
  files: z.record(z.string(), z.string().max(200_000)).optional(),
  referenceAssetIds: z.array(z.string().uuid()).max(100).optional(),
  enabled: z.boolean().optional(),
  note: z.string().max(300).optional(),
});

export const PATCH = route<Ctx>(async (req, { params }) => {
  const { slug } = await params;
  const { note, ...patch } = await body(req, Patch);
  return updateSkill(slug, patch, await getActor(), note ?? null);
});

export const DELETE = route<Ctx>(async (_req, { params }) => {
  await deleteSkill((await params).slug, await getActor());
  return { ok: true };
});
