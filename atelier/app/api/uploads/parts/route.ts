import { z } from "zod";
import { body, route } from "@/lib/server/http";
import { partUrls } from "@/lib/server/services/uploads";

export const runtime = "nodejs";

const Parts = z.object({
  assetId: z.string().uuid(),
  uploadId: z.string().min(1),
  partNumbers: z.array(z.number().int().min(1).max(10000)).min(1).max(500),
});

/** URLs signées pour envoyer des parties d'un gros fichier. */
export const POST = route(async (req) => {
  const b = await body(req, Parts);
  return { urls: await partUrls(b.assetId, b.uploadId, b.partNumbers) };
});
