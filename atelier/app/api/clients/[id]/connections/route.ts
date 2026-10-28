import { route, searchParams } from "@/lib/server/http";
import { clientConnections } from "@/lib/server/services/clients";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ id: string }> };

/** Comptes Zernio du client : { configured, profileId, accounts, error } ; ?refresh=1 ignore le cache. */
export const GET = route<Ctx>(async (req, { params }) => clientConnections((await params).id, { force: searchParams(req).get("refresh") === "1" }));
