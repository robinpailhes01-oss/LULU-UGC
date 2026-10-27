import { errorMessage } from "@/lib/server/zernio/errors";
import { route, searchParams } from "@/lib/server/http";
import { listSocialAccounts, scheduleRules, zernioConfigured, type SocialAccountInfo } from "@/lib/server/services/posts";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Comptes Zernio où l'on peut publier, et réglages du skill « programmation ».
 * { configured, accounts, rules, error } — sans clé Zernio : configured=false et aucun compte.
 * ?refresh=1 ignore le cache de 60 s.
 */
export const GET = route(async (req) => {
  const configured = await zernioConfigured();
  const rules = await scheduleRules();
  let accounts: SocialAccountInfo[] = [];
  let error: string | null = null;
  if (configured) {
    try {
      accounts = await listSocialAccounts({ force: searchParams(req).get("refresh") === "1" });
    } catch (err) {
      error = errorMessage(err);
    }
  }
  return { configured, accounts, rules, error };
});
