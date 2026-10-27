import { z } from "zod";
import { getActor } from "@/lib/server/auth";
import { body, route } from "@/lib/server/http";
import { exportRetouch, RetouchExportOptionsSchema, RetouchParamsSchema } from "@/lib/server/services/retouch";

export const runtime = "nodejs";
export const maxDuration = 120;

type Ctx = { params: Promise<{ id: string }> };

const Export = z.object({ params: RetouchParamsSchema, options: RetouchExportOptionsSchema.default({}) });

/** Rend la photo retouchée en pleine résolution et l'ajoute à côté de l'original (nouveau média). */
export const POST = route<Ctx>(async (req, { params }) => {
  const { id } = await params;
  const b = await body(req, Export);
  return exportRetouch(id, b.params, b.options, await getActor());
});
