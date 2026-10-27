import { z } from "zod";
import { getActor } from "@/lib/server/auth";
import { body, route } from "@/lib/server/http";
import { applyMontageStyle } from "@/lib/server/services/montages";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ id: string }> };

const Apply = z.object({ style: z.string().max(80).nullable() });

/** Applique un style (skill « montage ») : format, rythme des plans, transition, look, carte de fin. */
export const POST = route<Ctx>(async (req, { params }) => {
  const input = await body(req, Apply);
  return applyMontageStyle((await params).id, input.style, await getActor());
});
