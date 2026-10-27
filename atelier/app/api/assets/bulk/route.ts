import { z } from "zod";
import { getActor } from "@/lib/server/auth";
import { body, route } from "@/lib/server/http";
import { bulkAssets } from "@/lib/server/repo/assets";

export const runtime = "nodejs";

const Bulk = z.object({
  ids: z.array(z.string().uuid()).min(1).max(2000),
  op: z.discriminatedUnion("action", [
    z.object({ action: z.literal("move"), folderId: z.string().uuid().nullable() }),
    z.object({ action: z.literal("tag"), tags: z.array(z.string()).min(1) }),
    z.object({ action: z.literal("untag"), tags: z.array(z.string()).min(1) }),
    z.object({ action: z.literal("star"), starred: z.boolean() }),
    z.object({ action: z.literal("trash") }),
    z.object({ action: z.literal("restore") }),
    z.object({ action: z.literal("delete") }),
  ]),
});

/** Actions groupées : déplacer, taguer, favoris, corbeille, restaurer, supprimer définitivement. */
export const POST = route(async (req) => {
  const b = await body(req, Bulk);
  return bulkAssets(b.ids, b.op, await getActor());
});
