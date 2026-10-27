import { z } from "zod";
import { getActor } from "@/lib/server/auth";
import { body, route } from "@/lib/server/http";
import { applyLookToAssets, RetouchExportOptionsSchema, RetouchParamsSchema } from "@/lib/server/services/retouch";

export const runtime = "nodejs";
export const maxDuration = 300;

const Batch = z
  .object({
    assetIds: z.array(z.string().uuid()).min(1, "Choisissez au moins une photo.").max(100),
    lookId: z.string().uuid().nullable().optional(),
    params: RetouchParamsSchema.nullable().optional(),
    /** Intensité du look, 0–1 (défaut 1). */
    intensity: z.number().min(0).max(1).optional(),
    options: RetouchExportOptionsSchema.pick({ maxSize: true, quality: true, folderId: true }).optional(),
  })
  .refine((b) => Boolean(b.lookId) || Boolean(b.params), { message: "Indiquez un look (lookId) ou des réglages (params)." });

/** Applique un look à plusieurs photos : une nouvelle version par photo, à côté de l'original. */
export const POST = route(async (req) => applyLookToAssets(await body(req, Batch), await getActor()));
