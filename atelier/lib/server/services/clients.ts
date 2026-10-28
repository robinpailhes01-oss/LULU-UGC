import "server-only";
import { z } from "zod";
import { forgetClientCache } from "@/lib/server/client-scope";
import { getDb, iso, isoOrNull, jsonOrNull, num, type Row } from "@/lib/server/db";
import { env } from "@/lib/server/env";
import { badRequest, HttpError, notConfigured, notFound } from "@/lib/server/http";
import { logActivity } from "@/lib/server/repo/activity";
import { clientRootFolderId, createFolder } from "@/lib/server/repo/folders";
import { forgetAccountsCache, listSocialAccounts, type SocialAccountInfo } from "@/lib/server/services/posts";
import { slugify } from "@/lib/server/services/skills";
import { getZernio, NOT_CONFIGURED_MESSAGE, ZernioError } from "@/lib/server/zernio/client";
import { normalizeSocial, normalizeWebsite, SOCIAL_LABEL, SOCIAL_PLATFORMS } from "@/lib/shared/clients";
import type { Client, ClientBrand, ClientSocial, ClientStatus, ClientSummary, SocialPlatform } from "@/lib/shared/types";

/**
 * Clients de l'agence. Une fiche client = identité (nom, secteur, site, réseaux, description,
 * couleur), un dossier racine dans la médiathèque, un profil Zernio (si Zernio est branché) où
 * l'on connecte ses comptes, et plus tard la fiche marque (`brand`, étape « Analyse de la marque »).
 *
 * Tout le contenu (médias, dossiers, montages, publications, conversations, skills, journal)
 * porte un client_id : voir lib/server/client-scope.ts pour le client courant.
 */

function toClient(r: Row): Client {
  return {
    id: r.id as string,
    name: r.name as string,
    slug: r.slug as string,
    sector: (r.sector as string) ?? "",
    description: (r.description as string) ?? "",
    website: (r.website as string | null) ?? null,
    socials: jsonOrNull<ClientSocial[]>(r.socials) ?? [],
    zernioProfileId: (r.zernio_profile_id as string | null) ?? null,
    color: (r.color as string | null) ?? null,
    status: r.status as ClientStatus,
    brand: jsonOrNull<ClientBrand>(r.brand),
    rootFolderId: (r.root_folder_id as string | null) ?? null,
    createdAt: iso(r.created_at),
    updatedAt: iso(r.updated_at),
    createdBy: (r.created_by as string | null) ?? null,
  };
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// ---------------------------------------------------------------------------------------------
// Lecture

/** Clients (actifs par défaut), avec quelques chiffres pour les cartes. */
export async function listClients(opts: { includeArchived?: boolean; archivedOnly?: boolean } = {}): Promise<ClientSummary[]> {
  const db = await getDb();
  const where = opts.archivedOnly ? "c.status = 'archived'" : opts.includeArchived ? "true" : "c.status = 'active'";
  const rows = await db.query(
    `select c.*,
       (select count(*) from atelier.assets a where a.client_id = c.id and a.trashed_at is null and a.status = 'ready') as media_count,
       (select count(*) from atelier.posts p where p.client_id = c.id and p.status in ('scheduled', 'publishing') and p.scheduled_for >= now() - interval '1 hour') as scheduled_count,
       (select max(created_at) from atelier.activity x where x.client_id = c.id) as last_activity
     from atelier.clients c where ${where}
     order by lower(c.name)`,
  );
  return rows.map((r) => ({ ...toClient(r), stats: { media: num(r.media_count), scheduledPosts: num(r.scheduled_count), lastActivityAt: isoOrNull(r.last_activity) } }));
}

export async function getClient(id: string): Promise<Client | null> {
  if (!UUID.test(id)) return null;
  const db = await getDb();
  const r = await db.one(`select * from atelier.clients where id = $1`, [id]);
  return r ? toClient(r) : null;
}

export async function requireClient(id: string): Promise<Client> {
  const c = await getClient(id);
  if (!c) throw notFound("Client");
  return c;
}

/** Retrouve un client par identifiant, slug ou nom (insensible à la casse et aux accents). */
export async function findClient(ref: string): Promise<Client | null> {
  const v = ref.trim();
  if (!v) return null;
  if (UUID.test(v)) return getClient(v);
  const db = await getDb();
  const bySlug = await db.one(`select * from atelier.clients where slug = $1`, [slugify(v)]);
  if (bySlug) return toClient(bySlug);
  const norm = (s: string) => s.normalize("NFD").replace(/\p{M}/gu, "").toLowerCase().trim();
  const all = (await db.query(`select * from atelier.clients`)).map(toClient);
  return all.find((c) => norm(c.name) === norm(v)) ?? null;
}

/** Chiffres clés de la fiche (médias, montages, publications à venir, dernière activité). */
export async function clientNumbers(id: string): Promise<{ photos: number; videos: number; montages: number; scheduledPosts: number; drafts: number; publishedPosts: number; lastActivityAt: string | null }> {
  const db = await getDb();
  const r = await db.one(
    `select
       (select count(*) from atelier.assets where client_id = $1 and trashed_at is null and status = 'ready' and kind = 'photo') as photos,
       (select count(*) from atelier.assets where client_id = $1 and trashed_at is null and status = 'ready' and kind = 'video') as videos,
       (select count(*) from atelier.montages where client_id = $1) as montages,
       (select count(*) from atelier.posts where client_id = $1 and status in ('scheduled', 'publishing') and scheduled_for >= now() - interval '1 hour') as scheduled,
       (select count(*) from atelier.posts where client_id = $1 and status = 'draft') as drafts,
       (select count(*) from atelier.posts where client_id = $1 and status = 'published') as published,
       (select max(created_at) from atelier.activity where client_id = $1) as last_activity`,
    [id],
  );
  return {
    photos: num(r?.photos),
    videos: num(r?.videos),
    montages: num(r?.montages),
    scheduledPosts: num(r?.scheduled),
    drafts: num(r?.drafts),
    publishedPosts: num(r?.published),
    lastActivityAt: isoOrNull(r?.last_activity),
  };
}

// ---------------------------------------------------------------------------------------------
// Saisie

export interface ClientInput {
  name: string;
  sector?: string;
  description?: string;
  website?: string | null;
  /** Réseaux : adresse ou @identifiant par plateforme (normalisés ici). */
  socials?: { platform: SocialPlatform; value?: string | null; url?: string | null; handle?: string | null }[];
  color?: string | null;
}

/** Réseau saisi dans un formulaire ou par l'agent : `value` = adresse ou @identifiant. */
export const SocialInput = z.object({
  platform: z.enum(SOCIAL_PLATFORMS as [SocialPlatform, ...SocialPlatform[]]),
  value: z.string().max(300).nullable().optional(),
  url: z.string().max(300).nullable().optional(),
  handle: z.string().max(120).nullable().optional(),
});

export interface ClientPatch extends Partial<ClientInput> {
  /** Fiche marque (étape « Analyse de la marque ») : remplace la précédente ; null l'efface. */
  brand?: ClientBrand | null;
}

function cleanSocials(input: NonNullable<ClientInput["socials"]>): ClientSocial[] {
  const out = new Map<SocialPlatform, ClientSocial>();
  for (const s of input) {
    if (!SOCIAL_PLATFORMS.includes(s.platform)) throw badRequest(`Réseau inconnu : ${s.platform}.`);
    const raw = s.value ?? s.url ?? (s.handle ? `@${s.handle.replace(/^@/, "")}` : "");
    let n: ClientSocial | null;
    try {
      n = normalizeSocial(s.platform, raw ?? "");
    } catch (err) {
      throw badRequest(err instanceof Error ? err.message : `${SOCIAL_LABEL[s.platform]} : adresse illisible.`);
    }
    if (n) out.set(s.platform, n);
  }
  return SOCIAL_PLATFORMS.filter((p) => out.has(p)).map((p) => out.get(p)!);
}

function cleanWebsite(v: string | null | undefined): string | null {
  try {
    return normalizeWebsite(v);
  } catch (err) {
    throw badRequest(err instanceof Error ? err.message : "Site web : adresse illisible.");
  }
}

function cleanColor(v: string | null | undefined): string | null {
  if (!v) return null;
  if (!/^#[0-9a-f]{6}$/i.test(v.trim())) throw badRequest("Couleur invalide (#RRGGBB).");
  return v.trim().toUpperCase();
}

async function uniqueSlug(name: string): Promise<string> {
  const db = await getDb();
  const base = slugify(name) || "client";
  let slug = base;
  for (let i = 2; await db.one(`select 1 as x from atelier.clients where slug = $1`, [slug]); i++) slug = `${base}-${i}`;
  return slug;
}

// ---------------------------------------------------------------------------------------------
// Écriture

export interface CreatedClient extends Client {
  /** Profil Zernio non créé (Zernio indisponible, limite d'offre…) : la fiche propose de réessayer. */
  zernioWarning?: string;
}

/** Crée le client, son dossier racine (à son nom) et, si Zernio est branché, son profil Zernio. */
export async function createClient(input: ClientInput, actor: string | null): Promise<CreatedClient> {
  const name = input.name?.trim();
  if (!name) throw badRequest("Le client doit avoir un nom.");
  if (name.length > 120) throw badRequest("Nom trop long (120 caractères au plus).");
  const socials = cleanSocials(input.socials ?? []);
  const website = cleanWebsite(input.website);
  const color = cleanColor(input.color);
  const db = await getDb();
  const slug = await uniqueSlug(name);
  const r = await db.one(
    `insert into atelier.clients (name, slug, sector, description, website, socials, color, created_by)
     values ($1, $2, $3, $4, $5, $6::jsonb, $7, $8) returning *`,
    [name, slug, (input.sector ?? "").trim().slice(0, 80), (input.description ?? "").trim().slice(0, 2000), website, JSON.stringify(socials), color, actor],
  );
  let client = toClient(r!);
  forgetClientCache(client.id);
  const folder = await createFolder({ name, parentId: null, color, clientId: client.id, atRoot: true }, actor);
  await db.query(`update atelier.clients set root_folder_id = $2 where id = $1`, [client.id, folder.id]);
  client = { ...client, rootFolderId: folder.id };
  await logActivity({ actor, verb: "a créé la fiche client", objectType: "client", objectId: client.id, summary: name, clientId: client.id });

  let zernioWarning: string | undefined;
  if (env.zernio.apiKey) {
    try {
      client = await ensureZernioProfile(client.id);
    } catch (err) {
      zernioWarning = err instanceof Error ? err.message : "Profil Zernio non créé.";
      console.warn("[atelier] profil Zernio du client", zernioWarning);
    }
  }
  return zernioWarning ? { ...client, zernioWarning } : client;
}

export async function updateClient(id: string, patch: ClientPatch, actor: string | null): Promise<Client> {
  const cur = await requireClient(id);
  const sets: string[] = [];
  const params: unknown[] = [id];
  const set = (col: string, v: unknown, cast = "") => {
    params.push(v);
    sets.push(`${col} = $${params.length}${cast}`);
  };
  let name: string | undefined;
  if (patch.name !== undefined) {
    name = patch.name.trim();
    if (!name) throw badRequest("Le client doit avoir un nom.");
    if (name.length > 120) throw badRequest("Nom trop long (120 caractères au plus).");
    set("name", name);
  }
  if (patch.sector !== undefined) set("sector", (patch.sector ?? "").trim().slice(0, 80));
  if (patch.description !== undefined) set("description", (patch.description ?? "").trim().slice(0, 2000));
  if (patch.website !== undefined) set("website", cleanWebsite(patch.website));
  if (patch.socials !== undefined) set("socials", JSON.stringify(cleanSocials(patch.socials)), "::jsonb");
  if (patch.color !== undefined) set("color", cleanColor(patch.color));
  if (patch.brand !== undefined) set("brand", patch.brand ? JSON.stringify(patch.brand) : null, "::jsonb");
  if (sets.length === 0) return cur;
  const db = await getDb();
  const r = await db.one(`update atelier.clients set ${sets.join(", ")}, updated_at = now() where id = $1 returning *`, params);
  const next = toClient(r!);
  // Le dossier racine suit le nom (s'il portait encore l'ancien) et la couleur.
  if (next.rootFolderId && (name !== undefined || patch.color !== undefined)) {
    await db.query(
      `update atelier.folders set name = case when $2::text is not null and lower(name) = lower($3) then $2 else name end,
         color = case when $4::boolean then $5 else color end, updated_at = now() where id = $1`,
      [next.rootFolderId, name ?? null, cur.name, patch.color !== undefined, next.color],
    );
  }
  const changed = [
    name !== undefined && name !== cur.name ? `renommé « ${name} »` : null,
    patch.brand !== undefined ? "fiche marque" : null,
    patch.socials !== undefined ? "réseaux" : null,
  ].filter(Boolean);
  await logActivity({ actor, verb: "a modifié la fiche client", objectType: "client", objectId: id, summary: `${next.name}${changed.length ? ` — ${changed.join(", ")}` : ""}`, clientId: id });
  return next;
}

/** Archive (ou réactive) un client : il disparaît du sélecteur, son contenu reste intact. */
export async function setClientStatus(id: string, status: ClientStatus, actor: string | null): Promise<Client> {
  const cur = await requireClient(id);
  if (cur.status === status) return cur;
  const db = await getDb();
  const r = await db.one(`update atelier.clients set status = $2, updated_at = now() where id = $1 returning *`, [id, status]);
  await logActivity({ actor, verb: status === "archived" ? "a archivé le client" : "a réactivé le client", objectType: "client", objectId: id, summary: cur.name, clientId: id });
  return toClient(r!);
}

/** Dossier racine du client (recréé s'il a été supprimé). */
export async function ensureClientRootFolder(id: string): Promise<string | null> {
  return clientRootFolderId(id);
}

// ---------------------------------------------------------------------------------------------
// Zernio : profil du client et connexion de ses comptes

/**
 * Crée le profil Zernio du client s'il n'en a pas. Le profil porte externalId = identifiant du
 * client : s'il existe déjà (409 profile_external_id_conflict), on le reprend. Un nom déjà pris
 * par un autre profil (409 profile_name_conflict) : on crée « Nom · slug ».
 */
export async function ensureZernioProfile(id: string): Promise<Client> {
  const cur = await requireClient(id);
  if (cur.zernioProfileId) return cur;
  if (!env.zernio.apiKey) throw notConfigured("Connectez Zernio dans Réglages (ZERNIO_API_KEY) pour relier les comptes du client.");
  const z = getZernio();
  const base = { description: cur.sector ? `${cur.sector} — créé depuis l'Atelier` : "Créé depuis l'Atelier", color: cur.color ?? undefined, timezone: env.zernio.timezone, externalId: cur.id };
  const conflict = (err: unknown) => (err instanceof ZernioError && err.zernio.status === 409 ? err.zernioCode ?? "conflict" : null);
  let profileId: string | null = null;
  try {
    profileId = (await z.createProfile({ name: cur.name, ...base }, `atelier-client-${cur.id}`))._id;
  } catch (err) {
    const code = conflict(err);
    if (!code) throw err;
    if (code === "profile_name_conflict") {
      try {
        profileId = (await z.createProfile({ name: `${cur.name} · ${cur.slug}`, ...base }, `atelier-client-${cur.id}-2`))._id;
      } catch (again) {
        if (!conflict(again)) throw again;
      }
    }
    if (!profileId) profileId = (await z.listProfiles({ externalId: cur.id }))[0]?._id ?? null;
    if (!profileId) throw new HttpError(409, "zernio_profile_conflict", "Zernio refuse de créer le profil de ce client (nom ou identifiant déjà pris) : renommez-le puis réessayez.");
  }
  const db = await getDb();
  const r = await db.one(`update atelier.clients set zernio_profile_id = $2, updated_at = now() where id = $1 returning *`, [id, profileId]);
  forgetAccountsCache();
  return toClient(r!);
}

/** Plateformes que l'on sait connecter depuis la fiche (flux de connexion Zernio). */
export const CONNECTABLE: SocialPlatform[] = ["instagram", "tiktok", "facebook", "linkedin", "youtube"];

/**
 * Adresse de connexion Zernio d'un compte du client : la personne y autorise son compte, puis
 * revient sur la fiche (/clients/<id>?connected=… ou ?error=…).
 */
export async function connectUrl(id: string, platform: SocialPlatform): Promise<{ authUrl: string }> {
  if (!CONNECTABLE.includes(platform)) throw badRequest("Réseau non pris en charge.");
  if (!env.zernio.apiKey) throw notConfigured(NOT_CONFIGURED_MESSAGE);
  const client = await ensureZernioProfile(id);
  const redirectUrl = `${env.appUrl}/clients/${client.id}?tab=apercu`;
  if (!/^https?:\/\//.test(redirectUrl)) throw new HttpError(500, "bad_app_url", "ATELIER_APP_URL doit être une adresse absolue (https://…).");
  const res = await getZernio().connectUrl(platform, { profileId: client.zernioProfileId!, redirectUrl });
  if (!res.authUrl) throw new HttpError(502, "zernio_connect", "Zernio n'a pas renvoyé d'adresse de connexion.");
  return { authUrl: res.authUrl };
}

export interface ClientConnections {
  /** Zernio branché (ZERNIO_API_KEY). */
  configured: boolean;
  profileId: string | null;
  accounts: SocialAccountInfo[];
  error: string | null;
}

/** Comptes Zernio connectés au profil du client. */
export async function clientConnections(id: string, opts: { force?: boolean } = {}): Promise<ClientConnections> {
  const client = await requireClient(id);
  const configured = Boolean(env.zernio.apiKey);
  if (!configured || !client.zernioProfileId) return { configured, profileId: client.zernioProfileId, accounts: [], error: null };
  try {
    if (opts.force) forgetAccountsCache();
    const accounts = await listSocialAccounts({ profileId: client.zernioProfileId, force: opts.force });
    return { configured, profileId: client.zernioProfileId, accounts, error: null };
  } catch (err) {
    return { configured, profileId: client.zernioProfileId, accounts: [], error: err instanceof Error ? err.message : "Comptes Zernio indisponibles." };
  }
}
