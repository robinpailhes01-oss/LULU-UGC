import { configStatus } from "@/lib/server/env";
import { getDb } from "@/lib/server/db";
import { route } from "@/lib/server/http";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** État de la configuration (sans aucun secret) et de la base. */
export const GET = route(async () => {
  let database: "ok" | string = "ok";
  try {
    const db = await getDb();
    await db.query("select 1");
  } catch (err) {
    database = err instanceof Error ? err.message : "erreur";
  }
  return { ...configStatus(), databaseStatus: database };
});
