import "server-only";
import { getCurrentClientId, resolveClientFilter, type ClientFilter } from "@/lib/server/client-scope";
import { arr, getDb, iso, isoOrNull, jsonOrNull, num, numOrNull, type Db, type Row } from "@/lib/server/db";
import { badRequest, notFound } from "@/lib/server/http";
import { logActivity } from "@/lib/server/repo/activity";
import { resolveRootFolder } from "@/lib/server/repo/folders";
import { getStore } from "@/lib/server/storage";
import type { AiAnalysis, Asset, AssetKind, AssetPage, AssetQuery, AssetSource, ClientMediaFacts, RetouchParams } from "@/lib/shared/types";

export function assetUrls(id: string, hasThumb: boolean, hasPoster: boolean, version?: string) {
  const v = version ? `?v=${encodeURIComponent(version)}` : "";
  return {
    original: `/api/media/${id}/original${v}`,
    thumb: hasThumb ? `/api/media/${id}/thumb${v}` : null,
    poster: hasPoster ? `/api/media/${id}/poster${v}` : null,
    download: `/api/media/${id}/download`,
  };
}

export function toAsset(r: Row): Asset {
  const id = r.id as string;
  const updatedAt = iso(r.updated_at);
  return {
    id,
    clientId: (r.client_id as string | null) ?? null,
    folderId: (r.folder_id as string | null) ?? null,
    kind: r.kind as AssetKind,
    name: r.name as string,
    mime: r.mime as string,
    sizeBytes: num(r.size_bytes),
    width: numOrNull(r.width),
    height: numOrNull(r.height),
    durationS: numOrNull(r.duration_s),
    takenAt: isoOrNull(r.taken_at),
    camera: (r.camera as string | null) ?? null,
    gps: jsonOrNull(r.gps),
    sha256: (r.sha256 as string | null) ?? null,
    dhash: (r.dhash as string | null) ?? null,
    blurScore: numOrNull(r.blur_score),
    lumaMean: numOrNull(r.luma_mean),
    clipHigh: numOrNull(r.clip_high),
    clipLow: numOrNull(r.clip_low),
    tags: arr(r.tags),
    ai: jsonOrNull<AiAnalysis>(r.ai),
    starred: Boolean(r.starred),
    status: r.status as Asset["status"],
    source: r.source as AssetSource,
    parentAssetId: (r.parent_asset_id as string | null) ?? null,
    edit: jsonOrNull<RetouchParams>(r.edit),
    trashedAt: isoOrNull(r.trashed_at),
    createdAt: iso(r.created_at),
    updatedAt,
    createdBy: (r.created_by as string | null) ?? null,
    urls: assetUrls(id, Boolean(r.thumb_key), Boolean(r.poster_key), String(new Date(updatedAt).getTime())),
  };
}

export function kindFromMime(mime: string): AssetKind | null {
  if (mime.startsWith("image/")) return "photo";
  if (mime.startsWith("video/")) return "video";
  if (mime.startsWith("audio/")) return "audio";
  return null;
}

const SORTS: Record<NonNullable<AssetQuery["sort"]>, string> = {
  recent: "created_at desc, id",
  oldest: "created_at asc, id",
  name: "lower(name) asc, id",
  taken: "coalesce(taken_at, created_at) desc, id",
  size: "size_bytes desc, id",
};

/** Filtres supplémentaires de la liste (extension compatible de AssetQuery). */
export interface AssetListQuery extends AssetQuery {
  /** Versions dérivées d'un média (retouches, rendus) : parent_asset_id = … */
  parentAssetId?: string;
  /**
   * Client : undefined = client courant, null = tous les clients, id = ce client. Ignoré quand on
   * liste un dossier précis ou des identifiants précis (leur contenu appartient déjà à un client).
   */
  client?: ClientFilter;
}

/** Recherche et filtres de la médiathèque. Exclut les envois inachevés. */
export async function listAssets(query: AssetListQuery = {}): Promise<AssetPage> {
  const db = await getDb();
  const where: string[] = [`status <> 'uploading'`];
  const params: unknown[] = [];
  const p = (v: unknown) => {
    params.push(v);
    return `$${params.length}`;
  };

  where.push(query.trashed ? "trashed_at is not null" : "trashed_at is null");
  if (typeof query.folderId !== "string" && !query.ids) {
    const client = await resolveClientFilter(query.client);
    if (client) where.push(`client_id = ${p(client)}::uuid`);
  }
  if (query.folderId === null) where.push("folder_id is null");
  else if (typeof query.folderId === "string") where.push(`folder_id = ${p(query.folderId)}`);
  if (query.kind) where.push(`kind = ${p(query.kind)}`);
  if (query.starred) where.push("starred = true");
  if (query.source) where.push(`source = ${p(query.source)}`);
  if (query.untagged) where.push("cardinality(tags) = 0 and ai is null");
  if (query.tags?.length) where.push(`tags @> ${p(query.tags.map((t) => t.toLowerCase()))}::text[]`);
  if (query.ids) where.push(`id = any(${p(query.ids)}::uuid[])`);
  if (query.parentAssetId) where.push(`parent_asset_id = ${p(query.parentAssetId)}::uuid`);
  if (query.q?.trim()) {
    const words = query.q.trim().toLowerCase().split(/\s+/).slice(0, 6);
    for (const w of words) {
      const like = p(`%${w}%`);
      where.push(
        `(lower(name) like ${like} or lower(coalesce(ai->>'title', '')) like ${like} or lower(coalesce(ai->>'description', '')) like ${like}
          or exists (select 1 from unnest(tags) t where t like ${like})
          or exists (select 1 from atelier.folders f where f.id = folder_id and lower(f.name) like ${like}))`,
      );
    }
  }

  const sql = `from atelier.assets where ${where.join(" and ")}`;
  const limit = Math.min(Math.max(query.limit ?? 200, 1), 1000);
  const offset = Math.max(query.offset ?? 0, 0);
  const [rows, count] = await Promise.all([
    db.query(`select * ${sql} order by ${SORTS[query.sort ?? "recent"]} limit ${limit} offset ${offset}`, params),
    db.one<{ n: unknown }>(`select count(*) as n ${sql}`, params),
  ]);
  return { items: rows.map(toAsset), total: num(count?.n ?? 0) };
}

export async function getAsset(id: string, db?: Db): Promise<Asset | null> {
  const d = db ?? (await getDb());
  const r = await d.one(`select * from atelier.assets where id = $1`, [id]);
  return r ? toAsset(r) : null;
}

export async function requireAsset(id: string, db?: Db): Promise<Asset> {
  const a = await getAsset(id, db);
  if (!a) throw notFound("Média");
  return a;
}

export async function getAssets(ids: string[]): Promise<Asset[]> {
  if (ids.length === 0) return [];
  const db = await getDb();
  const rows = await db.query(`select * from atelier.assets where id = any($1::uuid[])`, [ids]);
  const byId = new Map(rows.map((r) => [r.id as string, toAsset(r)]));
  return ids.map((id) => byId.get(id)).filter((a): a is Asset => Boolean(a));
}

/** Clés de stockage d'un média (jamais envoyées au navigateur). */
export async function getStorageKeys(id: string): Promise<{ original: string; thumb: string | null; poster: string | null; mime: string; name: string } | null> {
  const db = await getDb();
  const r = await db.one(`select storage_key, thumb_key, poster_key, mime, name from atelier.assets where id = $1`, [id]);
  if (!r) return null;
  return {
    original: r.storage_key as string,
    thumb: (r.thumb_key as string | null) ?? null,
    poster: (r.poster_key as string | null) ?? null,
    mime: r.mime as string,
    name: r.name as string,
  };
}

export interface NewAssetRecord {
  id?: string;
  /** Client du média ; absent = déduit (média d'origine, puis dossier, puis client courant). */
  clientId?: string | null;
  folderId: string | null;
  kind: AssetKind;
  name: string;
  mime: string;
  sizeBytes: number;
  storageKey: string;
  thumbKey?: string | null;
  posterKey?: string | null;
  status: Asset["status"];
  source: AssetSource;
  parentAssetId?: string | null;
  edit?: RetouchParams | null;
  sha256?: string | null;
  tags?: string[];
  facts?: Partial<ClientMediaFacts>;
  ai?: AiAnalysis | null;
}

/** Client d'un nouveau média : celui du média d'origine (retouche, rendu), sinon du dossier, sinon le client courant. */
export async function inferAssetClient(rec: { clientId?: string | null; parentAssetId?: string | null; folderId: string | null }, db?: Db): Promise<string | null> {
  if (rec.clientId !== undefined) return rec.clientId;
  const d = db ?? (await getDb());
  if (rec.parentAssetId) {
    const r = await d.one<{ client_id: string | null }>(`select client_id from atelier.assets where id = $1`, [rec.parentAssetId]);
    if (r?.client_id) return r.client_id;
  }
  if (rec.folderId) {
    const r = await d.one<{ client_id: string | null }>(`select client_id from atelier.folders where id = $1`, [rec.folderId]);
    if (r?.client_id) return r.client_id;
  }
  return getCurrentClientId();
}

export async function insertAsset(rec: NewAssetRecord, actor: string | null, db?: Db): Promise<Asset> {
  const d = db ?? (await getDb());
  const f = rec.facts ?? {};
  const clientId = await inferAssetClient(rec, d);
  const r = await d.one(
    `insert into atelier.assets (id, folder_id, kind, name, mime, size_bytes, storage_key, thumb_key, poster_key, status, source,
        parent_asset_id, edit, sha256, tags, width, height, duration_s, taken_at, camera, gps, dhash, blur_score, luma_mean, clip_high, clip_low, ai, created_by, client_id)
     values (coalesce($1::uuid, gen_random_uuid()), $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13::jsonb, $14, $15::text[], $16, $17, $18, $19, $20, $21::jsonb,
        $22, $23, $24, $25, $26, $27::jsonb, $28, $29::uuid)
     returning *`,
    [
      rec.id ?? null,
      rec.folderId,
      rec.kind,
      rec.name,
      rec.mime,
      rec.sizeBytes,
      rec.storageKey,
      rec.thumbKey ?? null,
      rec.posterKey ?? null,
      rec.status,
      rec.source,
      rec.parentAssetId ?? null,
      rec.edit ? JSON.stringify(rec.edit) : null,
      rec.sha256 ?? f.sha256 ?? null,
      (rec.tags ?? []).map((t) => t.toLowerCase()),
      f.width ?? null,
      f.height ?? null,
      f.durationS ?? null,
      f.takenAt ?? null,
      f.camera ?? null,
      f.gps ? JSON.stringify(f.gps) : null,
      f.dhash ?? null,
      f.blurScore ?? null,
      f.lumaMean ?? null,
      f.clipHigh ?? null,
      f.clipLow ?? null,
      rec.ai ? JSON.stringify(rec.ai) : null,
      actor,
      clientId,
    ],
  );
  return toAsset(r!);
}

/** Enregistre les mesures envoyées par le navigateur et passe le média à « prêt ». */
export async function markAssetReady(id: string, facts: ClientMediaFacts, sizeBytes: number | null, db?: Db): Promise<Asset> {
  const d = db ?? (await getDb());
  const r = await d.one(
    `update atelier.assets set
       status = 'ready',
       size_bytes = coalesce($2, size_bytes),
       width = $3, height = $4, duration_s = $5, taken_at = $6, camera = $7, gps = $8::jsonb,
       sha256 = coalesce($9, sha256), dhash = $10, blur_score = $11, luma_mean = $12, clip_high = $13, clip_low = $14,
       thumb_key = case when $15::boolean then thumb_key else null end,
       poster_key = case when $16::boolean then poster_key else null end,
       updated_at = now()
     where id = $1 returning *`,
    [
      id,
      sizeBytes,
      facts.width,
      facts.height,
      facts.durationS,
      facts.takenAt,
      facts.camera,
      facts.gps ? JSON.stringify(facts.gps) : null,
      facts.sha256,
      facts.dhash,
      facts.blurScore,
      facts.lumaMean,
      facts.clipHigh,
      facts.clipLow,
      facts.hasThumb,
      facts.hasPoster,
    ],
  );
  if (!r) throw notFound("Média");
  return toAsset(r);
}

export interface AssetPatch {
  name?: string;
  folderId?: string | null;
  tags?: string[];
  starred?: boolean;
  ai?: AiAnalysis | null;
}

export async function updateAsset(id: string, patch: AssetPatch, actor: string | null): Promise<Asset> {
  const db = await getDb();
  const cur = await requireAsset(id, db);
  const name = patch.name?.trim();
  if (patch.name !== undefined && !name) throw badRequest("Le média doit avoir un nom.");
  // « À la racine » avec un client courant : dans son dossier racine.
  if (patch.folderId === null) patch = { ...patch, folderId: await resolveRootFolder(null) };
  // Rangé dans le dossier d'un client : le média passe à ce client.
  let moveClient: string | null = null;
  if (patch.folderId) {
    const folder = await db.one<{ client_id: string | null }>(`select client_id from atelier.folders where id = $1`, [patch.folderId]);
    if (!folder) throw notFound("Dossier");
    moveClient = folder.client_id;
  }
  const r = await db.one(
    `update atelier.assets set
       name = coalesce($2, name),
       folder_id = case when $3::boolean then $4::uuid else folder_id end,
       client_id = coalesce($9::uuid, client_id),
       tags = coalesce($5::text[], tags),
       starred = coalesce($6, starred),
       ai = case when $7::boolean then $8::jsonb else ai end,
       updated_at = now()
     where id = $1 returning *`,
    [
      id,
      name ?? null,
      patch.folderId !== undefined,
      patch.folderId ?? null,
      patch.tags ? normalizeTags(patch.tags) : null,
      patch.starred ?? null,
      patch.ai !== undefined,
      patch.ai ? JSON.stringify(patch.ai) : null,
      moveClient,
    ],
  );
  if (name && name !== cur.name) await logActivity({ actor, verb: "a renommé", objectType: "asset", objectId: id, summary: `${cur.name} → ${name}`, clientId: cur.clientId }, db);
  return toAsset(r!);
}

export function normalizeTags(tags: string[]): string[] {
  return [...new Set(tags.map((t) => t.trim().toLowerCase().replace(/^#/, "")).filter((t) => t.length > 0 && t.length <= 40))].slice(0, 40);
}

export type BulkAction =
  | { action: "move"; folderId: string | null }
  | { action: "tag"; tags: string[] }
  | { action: "untag"; tags: string[] }
  | { action: "star"; starred: boolean }
  | { action: "trash" }
  | { action: "restore" }
  | { action: "delete" };

/** Actions groupées sur une sélection. « delete » efface définitivement (fichiers compris). */
export async function bulkAssets(ids: string[], op: BulkAction, actor: string | null): Promise<{ count: number }> {
  if (ids.length === 0) return { count: 0 };
  const db = await getDb();
  let rows: Row[] = [];
  switch (op.action) {
    case "move": {
      // « À la racine » avec un client courant : dans son dossier racine.
      op = { ...op, folderId: await resolveRootFolder(op.folderId) };
      // Rangés dans le dossier d'un client : les médias passent à ce client (à la racine : client inchangé).
      const folder = op.folderId ? await db.one<{ client_id: string | null }>(`select client_id from atelier.folders where id = $1`, [op.folderId]) : null;
      if (op.folderId && !folder) throw notFound("Dossier");
      rows = await db.query(
        `update atelier.assets set folder_id = $2, client_id = coalesce($3::uuid, client_id), updated_at = now() where id = any($1::uuid[]) returning id, client_id`,
        [ids, op.folderId, folder?.client_id ?? null],
      );
      break;
    }
    case "tag":
      rows = await db.query(
        `update atelier.assets set tags = (select array(select distinct unnest(tags || $2::text[]))), updated_at = now() where id = any($1::uuid[]) returning id`,
        [ids, normalizeTags(op.tags)],
      );
      break;
    case "untag":
      rows = await db.query(
        `update atelier.assets set tags = (select array(select t from unnest(tags) t where not (t = any($2::text[])))), updated_at = now() where id = any($1::uuid[]) returning id`,
        [ids, normalizeTags(op.tags)],
      );
      break;
    case "star":
      rows = await db.query(`update atelier.assets set starred = $2, updated_at = now() where id = any($1::uuid[]) returning id`, [ids, op.starred]);
      break;
    case "trash":
      rows = await db.query(`update atelier.assets set trashed_at = now(), updated_at = now() where id = any($1::uuid[]) and trashed_at is null returning id`, [ids]);
      break;
    case "restore":
      rows = await db.query(
        `update atelier.assets a set trashed_at = null, updated_at = now(),
           folder_id = case when exists (select 1 from atelier.folders f where f.id = a.folder_id) then a.folder_id else null end
         where id = any($1::uuid[]) and trashed_at is not null returning id`,
        [ids],
      );
      break;
    case "delete":
      return deleteAssetsPermanently(ids, actor);
  }
  const verbs: Record<string, string> = { move: "a déplacé", tag: "a ajouté des mots-clés à", untag: "a retiré des mots-clés de", star: "a mis en favori", trash: "a mis à la corbeille", restore: "a restauré" };
  if (rows.length > 0 && op.action !== "star") {
    const owners = await db.query<{ client_id: string | null }>(`select distinct client_id from atelier.assets where id = any($1::uuid[])`, [rows.map((r) => r.id)]);
    await logActivity(
      {
        actor,
        verb: verbs[op.action],
        objectType: "asset",
        objectId: rows.length === 1 ? (rows[0].id as string) : null,
        summary: `${rows.length} média${rows.length > 1 ? "s" : ""}`,
        meta: { ids: rows.map((r) => r.id) },
        // Le journal suit le client des médias (s'ils sont tous au même client).
        ...(owners.length === 1 ? { clientId: owners[0].client_id } : {}),
      },
      db,
    );
  }
  return { count: rows.length };
}

/** Efface définitivement des médias (base + fichiers). Les versions dérivées sont détachées. */
export async function deleteAssetsPermanently(ids: string[], actor: string | null): Promise<{ count: number }> {
  if (ids.length === 0) return { count: 0 };
  const db = await getDb();
  const rows = await db.query(`delete from atelier.assets where id = any($1::uuid[]) returning id, storage_key, thumb_key, poster_key`, [ids]);
  const keysToDelete = rows.flatMap((r) => [r.storage_key, r.thumb_key, r.poster_key].filter((k): k is string => typeof k === "string" && k.length > 0));
  await getStore().delete(keysToDelete).catch((err) => console.error("[atelier] suppression des fichiers", err));
  if (rows.length > 0) await logActivity({ actor, verb: "a supprimé définitivement", objectType: "asset", summary: `${rows.length} média${rows.length > 1 ? "s" : ""}` }, db);
  return { count: rows.length };
}

/** Vide la corbeille du client (tout, ou seulement ce qui y est depuis plus de N jours). */
export async function emptyTrash(actor: string | null, olderThanDays?: number, client?: ClientFilter): Promise<{ count: number }> {
  const db = await getDb();
  const filter = await resolveClientFilter(client);
  const rows = await db.query<{ id: string }>(
    `select id from atelier.assets where ${olderThanDays ? `trashed_at < now() - ($1 || ' days')::interval` : "trashed_at is not null and $1::text is null"}
       and ($2::uuid is null or client_id = $2::uuid)`,
    [olderThanDays ? String(olderThanDays) : null, filter],
  );
  return deleteAssetsPermanently(rows.map((r) => r.id), actor);
}

/** Tous les mots-clés utilisés, avec leur fréquence (pour l'autocomplétion et les filtres). */
export async function listTags(client?: ClientFilter): Promise<{ tag: string; count: number }[]> {
  const db = await getDb();
  const filter = await resolveClientFilter(client);
  const rows = await db.query(
    `select t as tag, count(*) as n from atelier.assets, unnest(tags) t where trashed_at is null and ($1::uuid is null or client_id = $1::uuid) group by t order by count(*) desc, t limit 300`,
    [filter],
  );
  return rows.map((r) => ({ tag: r.tag as string, count: num(r.n) }));
}

export async function storageTotals(client?: ClientFilter): Promise<{ photos: number; videos: number; audio: number; bytes: number; untagged: number; trashed: number }> {
  const db = await getDb();
  const filter = await resolveClientFilter(client);
  const r = await db.one(
    `select
       count(*) filter (where kind = 'photo' and trashed_at is null) as photos,
       count(*) filter (where kind = 'video' and trashed_at is null) as videos,
       count(*) filter (where kind = 'audio' and trashed_at is null) as audio,
       coalesce(sum(size_bytes), 0) as bytes,
       count(*) filter (where trashed_at is null and cardinality(tags) = 0 and ai is null) as untagged,
       count(*) filter (where trashed_at is not null) as trashed
     from atelier.assets where status = 'ready' and ($1::uuid is null or client_id = $1::uuid)`,
    [filter],
  );
  return {
    photos: num(r?.photos),
    videos: num(r?.videos),
    audio: num(r?.audio),
    bytes: num(r?.bytes),
    untagged: num(r?.untagged),
    trashed: num(r?.trashed),
  };
}
