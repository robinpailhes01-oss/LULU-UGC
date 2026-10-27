import { z } from "zod";
import { getActor } from "@/lib/server/auth";
import { body, route } from "@/lib/server/http";
import { completeUpload } from "@/lib/server/services/uploads";

export const runtime = "nodejs";

const n = z.number().finite().nullable();
const Complete = z.object({
  assetId: z.string().uuid(),
  multipart: z.object({ uploadId: z.string(), parts: z.array(z.object({ partNumber: z.number().int(), etag: z.string() })).min(1) }).optional(),
  facts: z.object({
    width: n,
    height: n,
    durationS: n,
    takenAt: z.string().datetime({ offset: true }).nullable().catch(null),
    camera: z.string().max(120).nullable(),
    gps: z.object({ lat: z.number(), lng: z.number() }).nullable(),
    sha256: z.string().regex(/^[a-f0-9]{64}$/).nullable(),
    dhash: z.string().regex(/^[a-f0-9]{16}$/).nullable(),
    blurScore: n,
    lumaMean: n,
    clipHigh: n,
    clipLow: n,
    hasThumb: z.boolean(),
    hasPoster: z.boolean(),
  }),
});

/** Termine un envoi et enregistre les mesures calculées dans le navigateur. */
export const POST = route(async (req) => completeUpload(await body(req, Complete), await getActor()));
