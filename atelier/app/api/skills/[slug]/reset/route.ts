import { getActor } from "@/lib/server/auth";
import { route } from "@/lib/server/http";
import { resetSkillToRepo } from "@/lib/server/services/skills";

export const runtime = "nodejs";

/** Récupère la version du dépôt (abandonne les modifications faites dans l'Atelier). */
export const POST = route<{ params: Promise<{ slug: string }> }>(async (_req, { params }) => resetSkillToRepo((await params).slug, await getActor()));
