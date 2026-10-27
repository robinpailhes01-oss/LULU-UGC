import { z } from "zod";
import { getActor } from "@/lib/server/auth";
import { body, route } from "@/lib/server/http";
import { revertSkill } from "@/lib/server/services/skills";

export const runtime = "nodejs";

const Revert = z.object({ version: z.number().int().min(1) });

/** Revient au contenu d'une version précédente. */
export const POST = route<{ params: Promise<{ slug: string }> }>(async (req, { params }) => {
  const { version } = await body(req, Revert);
  return revertSkill((await params).slug, version, await getActor());
});
