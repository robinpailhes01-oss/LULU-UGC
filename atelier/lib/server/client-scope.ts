import "server-only";
import { AsyncLocalStorage } from "node:async_hooks";
import { cookies } from "next/headers";
import { getDb } from "@/lib/server/db";
import { badRequest } from "@/lib/server/http";

/**
 * Client courant : celui que la personne a choisi dans le sélecteur de la barre latérale
 * (cookie « atelier_client » = identifiant du client ; absent = « Tous les clients »).
 *
 * Toutes les listes (médias, dossiers, mots-clés, montages, publications, chiffres, ménage,
 * journal, conversations, skills) sont filtrées par ce client par défaut ; une route accepte
 * `?client=all|<id>` pour passer outre. Toute création est rattachée au client courant.
 *
 * L'agent ne passe pas par le cookie : il travaille dans le client de sa conversation, posé
 * par runWithClient() (portée AsyncLocalStorage, modifiable en cours de tour).
 */

export const CLIENT_COOKIE = "atelier_client";
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Filtre client d'une lecture : un identifiant, ou null = tous les clients. */
export type ClientFilter = string | null;

/** Portée explicite (agent, tâches de fond). `clientId` est modifiable pendant le tour. */
export interface ClientScopeStore {
  clientId: string | null;
}

const als: AsyncLocalStorage<ClientScopeStore> = ((globalThis as unknown as { __atelierClientAls?: AsyncLocalStorage<ClientScopeStore> }).__atelierClientAls ??=
  new AsyncLocalStorage<ClientScopeStore>());

/** Exécute `fn` dans la portée d'un client (prioritaire sur le cookie). */
export function runWithClient<T>(store: ClientScopeStore, fn: () => T): T {
  return als.run(store, fn);
}

/** Portée explicite en cours (agent), ou undefined. */
export function currentScopeStore(): ClientScopeStore | undefined {
  return als.getStore();
}

// Existence des clients, mise en cache quelques secondes (le cookie peut viser un client supprimé).
const known = new Map<string, { at: number; ok: boolean }>();
const KNOWN_TTL_MS = 10_000;

export function forgetClientCache(id?: string) {
  if (id) known.delete(id.toLowerCase());
  else known.clear();
}

async function clientExists(id: string): Promise<boolean> {
  const key = id.toLowerCase();
  const hit = known.get(key);
  if (hit && Date.now() - hit.at < KNOWN_TTL_MS) return hit.ok;
  const db = await getDb();
  const ok = Boolean(await db.one(`select 1 as ok from atelier.clients where id = $1`, [key]));
  known.set(key, { at: Date.now(), ok });
  return ok;
}

/** Identifiant brut du cookie (sans vérification), ou null. */
export async function readClientCookie(): Promise<string | null> {
  try {
    const store = await cookies();
    const v = store.get(CLIENT_COOKIE)?.value?.trim();
    return v && UUID.test(v) ? v.toLowerCase() : null;
  } catch {
    return null; // hors requête (tâche de fond, webhook…) : tous les clients
  }
}

/**
 * Client courant : portée explicite (agent) si présente, sinon le cookie du sélecteur.
 * null = « Tous les clients » (vue agence). Un cookie qui vise un client disparu est ignoré.
 */
export async function getCurrentClientId(): Promise<string | null> {
  const scoped = als.getStore();
  if (scoped) return scoped.clientId;
  const id = await readClientCookie();
  if (!id) return null;
  return (await clientExists(id)) ? id : null;
}

/** Filtre effectif d'une lecture : `undefined` = client courant ; null = tous ; id = ce client. */
export async function resolveClientFilter(filter: ClientFilter | undefined): Promise<ClientFilter> {
  return filter === undefined ? getCurrentClientId() : filter;
}

/**
 * Filtre d'une route de liste : `?client=all` (tous), `?client=<id>` (ce client), sinon le
 * client courant (cookie).
 */
export async function requestClientFilter(req: Request): Promise<ClientFilter> {
  const raw = new URL(req.url).searchParams.get("client");
  if (raw === null || raw === "" || raw === "current") return getCurrentClientId();
  if (raw === "all") return null;
  if (!UUID.test(raw)) throw badRequest("Paramètre client invalide (all ou identifiant).");
  return raw.toLowerCase();
}

/** Fragment SQL « colonne = client » (ou rien pour tous les clients), avec son paramètre. */
export function clientCondition(column: string, filter: ClientFilter, push: (v: unknown) => string): string | null {
  return filter ? `${column} = ${push(filter)}::uuid` : null;
}
