import { z } from "zod";
import { body, route } from "@/lib/server/http";
import { connectUrl } from "@/lib/server/services/clients";
import { SOCIAL_PLATFORMS } from "@/lib/shared/clients";
import type { SocialPlatform } from "@/lib/shared/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ id: string }> };

const Connect = z.object({ platform: z.enum(SOCIAL_PLATFORMS as [SocialPlatform, ...SocialPlatform[]]) });

/**
 * Lance la connexion d'un compte du client dans Zernio (crée le profil Zernio si besoin) :
 * { authUrl } où envoyer le navigateur ; retour sur /clients/<id>?connected=…|error=….
 */
export const POST = route<Ctx>(async (req, { params }) => connectUrl((await params).id, (await body(req, Connect)).platform));
