import { z } from "zod";
import { getActor } from "@/lib/server/auth";
import { body, route } from "@/lib/server/http";
import { initUpload } from "@/lib/server/services/uploads";

export const runtime = "nodejs";

const Init = z.object({
  name: z.string().min(1).max(255),
  mime: z.string().max(120).default("application/octet-stream"),
  size: z.number().int().positive(),
  folderId: z.string().uuid().nullable().default(null),
  sha256: z.string().regex(/^[a-f0-9]{64}$/).nullable().optional(),
  withThumb: z.boolean().optional(),
  withPoster: z.boolean().optional(),
});

/** Démarre un envoi : crée le média et renvoie les URLs d'envoi direct vers le stockage. */
export const POST = route(async (req) => initUpload(await body(req, Init), await getActor()));
