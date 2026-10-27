import "server-only";
import { getDb, iso, num, type Db, type Row } from "@/lib/server/db";
import { badRequest, notFound } from "@/lib/server/http";
import { logActivity } from "@/lib/server/repo/activity";
import type { Folder } from "@/lib/shared/types";

function toFolder(r: Row): Folder {
  return {
    id: r.id as string,
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

/** Tous les dossiers (l'arborescence est petite : on la charge en entier). */
export async function listFolders(): Promise<Folder[]> {
  const db = await getDb();
  return (await db.query(`${SELECT} order by lower(f.name)`)).map(toFolder);
}

export async function getFolder(id: string): Promise<Folder | null> {
  const db = await getDb();
  const r = await db.one(`${SELECT} where f.id = $1`, [id]);
  return r ? toFolder(r) : null;
}

/** Chemin depuis la racine (fil d'Ariane), dossier courant inclus. */
export async function getFolderPath(id: string): Promise<Folder[]> {
  const all = await listFolders();
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

/** Trouve un dossier par nom (insensible à la casse) sous un parent donné. */
export async function findFolderByName(name: string, parentId: string | null): Promise<Folder | null> {
  const db = await getDb();
  const r = await db.one(
    `${SELECT} where lower(f.name) = lower($1) and ${parentId ? "f.parent_id = $2" : "f.parent_id is null"} limit 1`,
    parentId ? [name.trim(), parentId] : [name.trim()],
  );
  return r ? toFolder(r) : null;
}

export async function createFolder(input: { name: string; parentId?: string | null; color?: string | null }, actor: string | null): Promise<Folder> {
  const name = input.name.trim();
  if (!name) throw badRequest("Le dossier doit avoir un nom.");
  const db = await getDb();
  if (input.parentId && !(await db.one(`select 1 from atelier.folders where id = $1`, [input.parentId]))) throw notFound("Dossier parent");
  const r = await db.one<{ id: string }>(
    `insert into atelier.folders (name, parent_id, color, created_by) values ($1, $2, $3, $4) returning id`,
    [name, input.parentId ?? null, input.color ?? null, actor],
  );
  await logActivity({ actor, verb: "a créé le dossier", objectType: "folder", objectId: r!.id, summary: name }, db);
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
  await db.query(
    `update atelier.folders set
       name = coalesce($2, name),
       parent_id = case when $3::boolean then $4::uuid else parent_id end,
       color = case when $5::boolean then $6 else color end,
       updated_at = now()
     where id = $1`,
    [id, name ?? null, patch.parentId !== undefined, patch.parentId ?? null, patch.color !== undefined, patch.color ?? null],
  );
  if (name && name !== cur.name) await logActivity({ actor, verb: "a renommé le dossier", objectType: "folder", objectId: id, summary: `${cur.name} → ${name}` }, db);
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
  await logActivity({ actor, verb: "a supprimé le dossier", objectType: "folder", objectId: id, summary: cur.name, meta: result });
  return result;
}
