import { z } from "zod";
import { getActor } from "@/lib/server/auth";
import { body, route } from "@/lib/server/http";
import { analyzeAssets } from "@/lib/server/services/ai-tagging";

export const runtime = "nodejs";
export const maxDuration = 300;

const Analyze = z.object({ ids: z.array(z.string().uuid()).min(1).max(200), force: z.boolean().optional() });

/** Analyse IA (vision) : titre, description, mots-clés, qualité… */
export const POST = route(async (req) => {
  const b = await body(req, Analyze);
  return analyzeAssets(b.ids, await getActor(), { force: b.force });
});
