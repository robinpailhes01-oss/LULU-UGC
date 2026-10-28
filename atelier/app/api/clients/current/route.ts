import { NextResponse } from "next/server";
import { z } from "zod";
import { CLIENT_COOKIE, forgetClientCache, getCurrentClientId } from "@/lib/server/client-scope";
import { env } from "@/lib/server/env";
import { body, route } from "@/lib/server/http";
import { getClient, requireClient } from "@/lib/server/services/clients";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Client courant : { client } (null = « Tous les clients »). */
export const GET = route(async () => {
  const id = await getCurrentClientId();
  return { client: id ? await getClient(id) : null };
});

const Switch = z.object({ clientId: z.string().uuid().nullable() });

/** Change de client courant (cookie « atelier_client ») ; null = « Tous les clients ». */
export const POST = route(async (req) => {
  const { clientId } = await body(req, Switch);
  const client = clientId ? await requireClient(clientId) : null;
  if (client) forgetClientCache(client.id);
  const res = NextResponse.json({ client });
  if (client) res.cookies.set(CLIENT_COOKIE, client.id, { path: "/", httpOnly: true, sameSite: "lax", secure: env.isProd, maxAge: 60 * 60 * 24 * 365 });
  else res.cookies.set(CLIENT_COOKIE, "", { path: "/", httpOnly: true, sameSite: "lax", secure: env.isProd, maxAge: 0 });
  return res;
});
