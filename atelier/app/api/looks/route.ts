import { z } from "zod";
import { getActor } from "@/lib/server/auth";
import { body, route } from "@/lib/server/http";
import { createLook, listLooks } from "@/lib/server/services/looks";
import { RetouchParamsSchema } from "@/lib/server/services/retouch";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Looks intégrés puis looks enregistrés par l'équipe. */
export const GET = route(async () => ({ looks: await listLooks() }));

const Create = z.object({ name: z.string().trim().min(1, "Donnez un nom au look.").max(60), params: RetouchParamsSchema });

/** Enregistre les réglages de lumière et de couleur courants comme nouveau look. */
export const POST = route(async (req) => createLook(await body(req, Create), await getActor()));
