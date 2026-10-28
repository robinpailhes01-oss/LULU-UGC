import { z } from "zod";
import { getActor } from "@/lib/server/auth";
import { body, route, searchParams } from "@/lib/server/http";
import { createClient, listClients, SocialInput } from "@/lib/server/services/clients";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Clients avec leurs chiffres. ?archived=1 (archivés seulement) ?archived=all (tous). */
export const GET = route(async (req) => {
  const a = searchParams(req).get("archived");
  return { clients: await listClients({ archivedOnly: a === "1", includeArchived: a === "all" }) };
});

const Create = z.object({
  name: z.string().min(1).max(120),
  sector: z.string().max(80).optional(),
  description: z.string().max(2000).optional(),
  website: z.string().max(300).nullable().optional(),
  socials: z.array(SocialInput).max(10).optional(),
  color: z.string().max(9).nullable().optional(),
});

/** Crée un client (+ son dossier racine, + son profil Zernio si Zernio est branché). */
export const POST = route(async (req) => Response.json(await createClient(await body(req, Create), await getActor()), { status: 201 }));
