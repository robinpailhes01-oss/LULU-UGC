import { z } from "zod";
import { body, route } from "@/lib/server/http";
import { abortUpload } from "@/lib/server/services/uploads";

export const runtime = "nodejs";

const Abort = z.object({ assetId: z.string().uuid(), uploadId: z.string().nullable().default(null) });

export const POST = route(async (req) => {
  const b = await body(req, Abort);
  await abortUpload(b.assetId, b.uploadId);
  return { ok: true };
});
