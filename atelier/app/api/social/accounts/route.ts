import { errorMessage } from "@/lib/server/zernio/errors";
import { requestClientFilter } from "@/lib/server/client-scope";
import { getDb } from "@/lib/server/db";
import { route, searchParams } from "@/lib/server/http";
import { listSocialAccounts, scheduleRules, zernioConfigured, type SocialAccountInfo } from "@/lib/server/services/posts";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Comptes Zernio où l'on peut publier, et réglages du skill « programmation ».
 * { configured, accounts, rules, error } — sans clé Zernio : configured=false et aucun compte.
 * ?refresh=1 ignore le cache de 60 s. Avec un client courant : seulement les comptes de son
 * profil Zernio (`client` dit lequel, `profileMissing` s'il n'a pas encore de profil).
 */
export const GET = route(async (req) => {
  const configured = await zernioConfigured();
  const rules = await scheduleRules();
  const clientId = await requestClientFilter(req);
  const db = await getDb();
  const row = clientId ? await db.one<{ id: string; name: string; zernio_profile_id: string | null }>(`select id, name, zernio_profile_id from atelier.clients where id = $1`, [clientId]) : null;
  const client = row ? { id: row.id, name: row.name, zernioProfileId: row.zernio_profile_id } : null;
  let accounts: SocialAccountInfo[] = [];
  let error: string | null = null;
  if (configured) {
    try {
      accounts = await listSocialAccounts({ force: searchParams(req).get("refresh") === "1", client: clientId });
    } catch (err) {
      error = errorMessage(err);
    }
  }
  return { configured, accounts, rules, error, client, profileMissing: Boolean(client && !client.zernioProfileId) };
});
