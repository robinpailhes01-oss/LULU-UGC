import { route } from "@/lib/server/http";
import { listSkillVersions, requireSkill } from "@/lib/server/services/skills";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export const GET = route<{ params: Promise<{ slug: string }> }>(async (_req, { params }) => {
  const { slug } = await params;
  await requireSkill(slug);
  return { versions: await listSkillVersions(slug) };
});
