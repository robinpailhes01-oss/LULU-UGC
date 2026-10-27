import { z } from "zod";
import { getActor } from "@/lib/server/auth";
import { body, route, searchParams } from "@/lib/server/http";
import { getIgnoredIds, ignoreAssets, unignoreAssets } from "@/lib/server/services/cleanup";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const Ids = z.object({ ids: z.array(z.string().uuid("Identifiant de média invalide.")).min(1, "Aucun média choisi.").max(5000) });

/** Médias que l'équipe a choisi de garder (jamais reproposés au ménage). */
export const GET = route(async () => ({ ids: await getIgnoredIds() }));

/** Garde ces médias : ils sortent des suggestions du ménage. */
export const POST = route(async (req) => ignoreAssets((await body(req, Ids)).ids, await getActor()));

/** Sans paramètre : tout réinitialiser. Avec ?ids=a,b : annuler pour ces médias seulement. */
export const DELETE = route(async (req) => {
  const raw = searchParams(req).get("ids");
  const ids = raw ? z.array(z.string().uuid("Identifiant de média invalide.")).parse(raw.split(",").filter(Boolean)) : null;
  return unignoreAssets(ids, await getActor());
});
