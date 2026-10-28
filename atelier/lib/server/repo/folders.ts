import "server-only";
import { getCurrentClientId, resolveClientFilter, type ClientFilter } from "@/lib/server/client-scope";
import { getDb, iso, num, type Db, type Row } from "@/lib/server/db";
import { badRequest, notFound } from "@/lib/server/http";
import { logActivity } from "@/lib/server/repo/activity";
import type { Folder } from "@/lib/shared/types";

function toFolder(r: Row): Folder {
  return {
    id: r.id as string,
    clientId: (r.client_id as string | null) ?? null,
    parentId: (r.parent_id as string | null) ?? null,
    name: r.name as string,
    color: (r.color as string | null) ?? null,
    createdAt: iso(r.created_at),
    updatedAt: iso(r.updated_at),
    createdBy: (r.created_by as string | null) ?? null,
    assetCount: num(r.asset_count ?? 0),
  };
}

const SELECT = `
  select f.*, (select count(*) from atelier.assets a where a.folder_id = f.id and a.trashed_at is null) as asset_count
  from atelier.folders f`;

/**
 * Dossiers d'un client (l'arborescence est petite : on la charge en entier).
 * `client` : undefined = client courant, null = tous les clients, id = ce client.
 */
export async function listFolders(client?: ClientFilter): Promise<Folder[]> {
  const db = await getDb();
  const filter = await resolveClientFilter(client);
  const rows = filter ? await db.query(`${SELECT} where f.client_id = $1::uuid order by lower(f.name)`, [filter]) : await db.query(`${SELECT} order by lower(f.name)`);
  return rows.map(toFolder);
}

export async function getFolder(id: string): Promise<Folder | null> {
  const db = await getDb();
  const r = await db.one(`${SELECT} where f.id = $1`, [id]);
  return r ? toFolder(r) : null;
}

/** Chemin depuis la racine (fil d'Ariane), dossier courant inclus. */
export async function getFolderPath(id: string): Promise<Folder[]> {
  const all = await listFolders(null);
  const byId = new Map(all.map((f) => [f.id, f]));
  const path: Folder[] = [];
  let cur = byId.get(id);
  const seen = new Set<string>();
  while (cur && !seen.has(cur.id)) {
    seen.add(cur.id);
    path.unshift(cur);
    cur = cur.parentId ? byId.get(cur.parentId) : undefined;
  }
  return path;
}

/** Trouve un dossier par nom (insensible à la casse) sous un parent donné (à la racine : parmi ceux du client courant). */
export async function findFolderByName(name: string, parentId: string | null, client?: ClientFilter): Promise<Folder | null> {
  const db = await getDb();
  if (parentId) {
    const r = await db.one(`${SELECT} where lower(f.name) = lower($1) and f.parent_id = $2 limit 1`, [name.trim(), parentId]);
    return r ? toFolder(r) : null;
  }
  const filter = await resolveClientFilter(client);
  const r = await db.one(
    `${SELECT} where lower(f.name) = lower($1) and f.parent_id is null and ${filter ? "f.client_id = $2::uuid" : "true"} limit 1`,
    filter ? [name.trim(), filter] : [name.trim()],
  );
  return r ? toFolder(r) : null;
}

/**
 * Dossier racine d'un client dans la médiathèque (recréé s'il a été supprimé). C'est la
 * « racine » de la médiathèque quand ce client est le client courant. Hors transaction.
 */
export async function clientRootFolderId(clientId: string): Promise<string | null> {
  const db = await getDb();
  const c = await db.one<{ name: string; root_folder_id: string | null; color: string | null }>(`select name, root_folder_id, color from atelier.clients where id = $1`, [clientId]);
  if (!c) return null;
  if (c.root_folder_id) return c.root_folder_id;
  const r = await db.one<{ id: string }>(`insert into atelier.folders (name, parent_id, color, client_id) values ($1, null, $2, $3::uuid) returning id`, [c.name, c.color, clientId]);
  await db.query(`update atelier.clients set root_folder_id = $2 where id = $1 and root_folder_id is null`, [clientId, r!.id]);
  const again = await db.one<{ root_folder_id: string | null }>(`select root_folder_id from atelier.clients where id = $1`, [clientId]);
  if (again?.root_folder_id && again.root_folder_id !== r!.id) await db.query(`delete from atelier.folders where id = $1`, [r!.id]);
  return again?.root_folder_id ?? r!.id;
}

/**
 * Dossier de destination « racine » : avec un client courant, la racine est son dossier racine ;
 * dans la vue « Tous les clients », c'est la vraie racine (null).
 */
export async function resolveRootFolder(folderId: string | null | undefined): Promise<string | null> {
  if (folderId) return folderId;
  const client = await getCurrentClientId();
  return client ? clientRootFolderId(client) : null;
}

/**
 * Crée un dossier. Son client : celui du dossier parent, sinon `clientId` s'il est donné,
 * sinon le client courant. À la racine avec un client courant, le dossier est rangé dans le
 * dossier racine du client (sauf `atRoot`, réservé à la création de ce dossier racine).
 */
export async function createFolder(
  input: { name: string; parentId?: string | null; color?: string | null; clientId?: string | null; atRoot?: boolean },
  actor: string | null,
): Promise<Folder> {
  const name = input.name.trim();
  if (!name) throw badRequest("Le dossier doit avoir un nom.");
  const db = await getDb();
  let clientId: string | null;
  if (!input.parentId && !input.atRoot) {
    const owner = input.clientId !== undefined ? input.clientId : await getCurrentClientId();
    if (owner) input = { ...input, parentId: await clientRootFolderId(owner) };
  }
  if (input.parentId) {
    const parent = await db.one<{ client_id: string | null }>(`select client_id from atelier.folders where id = $1`, [input.parentId]);
    if (!parent) throw notFound("Dossier parent");
    clientId = parent.client_id ?? (input.clientId !== undefined ? input.clientId : await getCurrentClientId());
  } else clientId = input.clientId !== undefined ? input.clientId : await getCurrentClientId();
  const r = await db.one<{ id: string }>(
    `insert into atelier.folders (name, parent_id, color, created_by, client_id) values ($1, $2, $3, $4, $5::uuid) returning id`,
    [name, input.parentId ?? null, input.color ?? null, actor, clientId],
  );
  await logActivity({ actor, verb: "a créé le dossier", objectType: "folder", objectId: r!.id, summary: name, clientId }, db);
  return (await getFolder(r!.id))!;
}

export async function updateFolder(id: string, patch: { name?: string; parentId?: string | null; color?: string | null }, actor: string | null): Promise<Folder> {
  const db = await getDb();
  const cur = await getFolder(id);
  if (!cur) throw notFound("Dossier");
  if (patch.parentId !== undefined && patch.parentId !== null) {
    if (patch.parentId === id) throw badRequest("Un dossier ne peut pas être rangé dans lui-même.");
    const path = await getFolderPath(patch.parentId);
    if (path.some((f) => f.id === id)) throw badRequest("Impossible de ranger un dossier dans un de ses sous-dossiers.");
  }
  const name = patch.name?.trim();
  if (patch.name !== undefined && !name) throw badRequest("Le dossier doit avoir un nom.");
  // « À la racine » avec un client courant : dans son dossier racine (sauf pour ce dossier lui-même).
  if (patch.parentId === null) {
    const root = await resolveRootFolder(null);
    if (root && root !== id) patch = { ...patch, parentId: root };
  }
  // Rangé dans le dossier d'un autre client : le dossier, ses sous-dossiers et leurs médias passent à ce client.
  const newParent = patch.parentId ? await getFolder(patch.parentId) : null;
  if (patch.parentId && !newParent) throw notFound("Dossier parent");
  if (newParent?.clientId && newParent.clientId !== cur.clientId) {
    const target = newParent.clientId;
    await db.tx(async (t) => {
      const ids = await folderSubtreeIds(id, t);
      await t.query(`update atelier.folders set client_id = $2::uuid, updated_at = now() where id = any($1::uuid[])`, [ids, target]);
      await t.query(`update atelier.assets set client_id = $2::uuid, updated_at = now() where folder_id = any($1::uuid[])`, [ids, target]);
    });
  }
  await db.query(
    `update atelier.folders set
       name = coalesce($2, name),
       parent_id = case when $3::boolean then $4::uuid else parent_id end,
       color = case when $5::boolean then $6 else color end,
       updated_at = now()
     where id = $1`,
    [id, name ?? null, patch.parentId !== undefined, patch.parentId ?? null, patch.color !== undefined, patch.color ?? null],
  );
  if (name && name !== cur.name) await logActivity({ actor, verb: "a renommé le dossier", objectType: "folder", objectId: id, summary: `${cur.name} → ${name}`, clientId: newParent?.clientId ?? cur.clientId }, db);
  return (await getFolder(id))!;
}

/** Identifiants du dossier et de tous ses sous-dossiers. */
export async function folderSubtreeIds(id: string, db?: Db): Promise<string[]> {
  const d = db ?? (await getDb());
  const rows = await d.query<{ id: string }>(
    `with recursive tree as (
       select id from atelier.folders where id = $1
       union all
       select f.id from atelier.folders f join tree t on f.parent_id = t.id
     ) select id from tree`,
    [id],
  );
  return rows.map((r) => r.id);
}

/** Supprime le dossier et ses sous-dossiers ; leurs médias partent à la corbeille (restaurables à la racine). */
export async function deleteFolder(id: string, actor: string | null): Promise<{ trashedAssets: number }> {
  const db = await getDb();
  const cur = await getFolder(id);
  if (!cur) throw notFound("Dossier");
  const result = await db.tx(async (t) => {
    const ids = await folderSubtreeIds(id, t);
    const trashed = await t.query(
      `update atelier.assets set trashed_at = coalesce(trashed_at, now()), folder_id = null, updated_at = now()
       where folder_id = any($1::uuid[]) returning id`,
      [ids],
    );
    await t.query(`delete from atelier.folders where id = $1`, [id]);
    return { trashedAssets: trashed.length };
  });
  await logActivity({ actor, verb: "a supprimé le dossier", objectType: "folder", objectId: id, summary: cur.name, meta: result, clientId: cur.clientId });
  return result;
}
