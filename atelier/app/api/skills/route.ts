import { z } from "zod";
import { getActor } from "@/lib/server/auth";
import { body, route, searchParams } from "@/lib/server/http";
import { createSkill, listSkills, SKILL_KINDS } from "@/lib/server/services/skills";
import type { SkillKind } from "@/lib/shared/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** ?kind=montage  ?all=1 (y compris désactivés) */
export const GET = route(async (req) => {
  const sp = searchParams(req);
  return { skills: await listSkills({ kind: (sp.get("kind") as SkillKind | null) ?? undefined, includeDisabled: sp.get("all") === "1" }) };
});

const Create = z.object({
  slug: z.string().max(60).optional(),
  kind: z.enum(SKILL_KINDS as [SkillKind, ...SkillKind[]]),
  name: z.string().min(1).max(120),
  description: z.string().max(1000).default(""),
  body: z.string().max(100_000).default(""),
  data: z.record(z.string(), z.unknown()).nullable().optional(),
  files: z.record(z.string(), z.string().max(200_000)).optional(),
  referenceAssetIds: z.array(z.string().uuid()).max(100).optional(),
});

export const POST = route(async (req) => createSkill(await body(req, Create), await getActor()));
