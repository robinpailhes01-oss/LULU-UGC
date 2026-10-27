import { z } from "zod";
import { body, route } from "@/lib/server/http";
import { suggestCaptions } from "@/lib/server/services/ai-tagging";

export const runtime = "nodejs";
export const maxDuration = 120;

const Captions = z.object({ assetIds: z.array(z.string().uuid()).max(20).default([]), brief: z.string().max(2000).optional(), platform: z.string().max(40).optional() });

/** Trois propositions de légende dans la voix June. */
export const POST = route(async (req) => ({ captions: await suggestCaptions(await body(req, Captions)) }));
