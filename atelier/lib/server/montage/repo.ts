import "server-only";
import { getCurrentClientId, resolveClientFilter, type ClientFilter } from "@/lib/server/client-scope";
import { getDb, iso, jsonOrNull, numOrNull, type Db, type Row } from "@/lib/server/db";
import { notFound } from "@/lib/server/http";
import type { Montage, MontageSpec, MontageStatus, RenderState } from "@/lib/shared/types";

/** Accès SQL à atelier.montages (table créée par la migration 001_init). */

export function toMontage(r: Row): Montage {
  return {
    id: r.id as string,
    clientId: (r.client_id as string | null) ?? null,
    title: r.title as string,
    spec: jsonOrNull<MontageSpec>(r.spec) as MontageSpec,
    html: (r.html as string | null) ?? null,
    customHtml: Boolean(r.custom_html),
    status: r.status as MontageStatus,
    render: jsonOrNull<RenderState>(r.render),
    outputAssetId: (r.output_asset_id as string | null) ?? null,
    durationS: numOrNull(r.duration_s),
    createdAt: iso(r.created_at),
    updatedAt: iso(r.updated_at),
    createdBy: (r.created_by as string | null) ?? null,
  };
}

/** Montages d'un client (undefined = client courant, null = tous). */
export async function selectMontages(client?: ClientFilter): Promise<Montage[]> {
  const db = await getDb();
  const filter = await resolveClientFilter(client);
  const rows = await db.query(`select * from atelier.montages where ($1::uuid is null or client_id = $1::uuid) order by updated_at desc limit 500`, [filter]);
  return rows.map(toMontage);
}

export async function selectMontage(id: string, db?: Db): Promise<Montage | null> {
  if (!/^[0-9a-f-]{36}$/i.test(id)) return null;
  const d = db ?? (await getDb());
  const r = await d.one(`select * from atelier.montages where id = $1`, [id]);
  return r ? toMontage(r) : null;
}

export async function requireMontageRow(id: string, db?: Db): Promise<Montage> {
  const m = await selectMontage(id, db);
  if (!m) throw notFound("Montage");
  return m;
}

/** Nouveau montage, rattaché au client donné (absent = client courant). */
export async function insertMontage(
  input: { title: string; spec: MontageSpec; html: string | null; customHtml: boolean; durationS: number | null; clientId?: string | null },
  actor: string | null,
): Promise<Montage> {
  const db = await getDb();
  const clientId = input.clientId !== undefined ? input.clientId : await getCurrentClientId();
  const r = await db.one(
    `insert into atelier.montages (title, spec, html, custom_html, duration_s, created_by, client_id) values ($1, $2::jsonb, $3, $4, $5, $6, $7::uuid) returning *`,
    [input.title, JSON.stringify(input.spec), input.html, input.customHtml, input.durationS, actor, clientId],
  );
  return toMontage(r!);
}

export interface MontageRowPatch {
  title?: string;
  spec?: MontageSpec;
  html?: string | null;
  customHtml?: boolean;
  durationS?: number | null;
  status?: MontageStatus;
  render?: RenderState | null;
  outputAssetId?: string | null;
}

export async function patchMontageRow(id: string, patch: MontageRowPatch, db?: Db): Promise<Montage> {
  const d = db ?? (await getDb());
  const sets: string[] = [];
  const params: unknown[] = [id];
  const set = (col: string, v: unknown, cast = "") => {
    params.push(v);
    sets.push(`${col} = $${params.length}${cast}`);
  };
  if (patch.title !== undefined) set("title", patch.title);
  if (patch.spec !== undefined) set("spec", JSON.stringify(patch.spec), "::jsonb");
  if (patch.html !== undefined) set("html", patch.html);
  if (patch.customHtml !== undefined) set("custom_html", patch.customHtml);
  if (patch.durationS !== undefined) set("duration_s", patch.durationS);
  if (patch.status !== undefined) set("status", patch.status);
  if (patch.render !== undefined) set("render", patch.render ? JSON.stringify(patch.render) : null, "::jsonb");
  if (patch.outputAssetId !== undefined) set("output_asset_id", patch.outputAssetId);
  sets.push("updated_at = now()");
  const r = await d.one(`update atelier.montages set ${sets.join(", ")} where id = $1 returning *`, params);
  if (!r) throw notFound("Montage");
  return toMontage(r);
}

/**
 * Met à jour l'état du rendu seulement si le travail `jobId` est toujours le rendu en cours
 * (évite qu'un ancien rendu annulé n'écrase un rendu relancé). Ne touche pas à updated_at,
 * pour que la progression ne fasse pas remonter le montage dans la liste à chaque pourcentage.
 */
export async function patchRenderIfCurrent(id: string, jobId: string, render: RenderState, extra: { status?: MontageStatus; outputAssetId?: string | null } = {}): Promise<Montage | null> {
  const db = await getDb();
  const params: unknown[] = [id, jobId, JSON.stringify(render)];
  const sets = ["render = $3::jsonb"];
  if (extra.status) {
    params.push(extra.status);
    sets.push(`status = $${params.length}`);
    sets.push("updated_at = now()");
  }
  if (extra.outputAssetId !== undefined) {
    params.push(extra.outputAssetId);
    sets.push(`output_asset_id = $${params.length}`);
  }
  const r = await db.one(`update atelier.montages set ${sets.join(", ")} where id = $1 and render->>'jobId' = $2 returning *`, params);
  return r ? toMontage(r) : null;
}

/**
 * Réserve la finalisation d'un rendu distant (téléchargement + ajout à la médiathèque) pour qu'un
 * seul appel la fasse, même si plusieurs onglets interrogent l'état en même temps. Une réservation
 * de plus de 10 minutes (processus interrompu) peut être reprise.
 */
export async function claimRenderCompletion(id: string, jobId: string): Promise<boolean> {
  const db = await getDb();
  const r = await db.one(
    `update atelier.montages set render = jsonb_set(render, '{claimedAt}', to_jsonb(now()::text))
     where id = $1 and render->>'jobId' = $2 and status = 'rendering'
       and (render->>'claimedAt' is null or (render->>'claimedAt')::timestamptz < now() - interval '10 minutes')
     returning id`,
    [id, jobId],
  );
  return Boolean(r);
}

export async function deleteMontageRow(id: string): Promise<Montage | null> {
  const db = await getDb();
  const r = await db.one(`delete from atelier.montages where id = $1 returning *`, [id]);
  return r ? toMontage(r) : null;
}

/** Réglage partagé (atelier.settings). */
export async function getSetting<T>(key: string): Promise<T | null> {
  const db = await getDb();
  const r = await db.one(`select value from atelier.settings where key = $1`, [key]);
  return r ? jsonOrNull<T>(r.value) : null;
}

export async function setSetting(key: string, value: unknown): Promise<void> {
  const db = await getDb();
  await db.query(
    `insert into atelier.settings (key, value, updated_at) values ($1, $2::jsonb, now())
     on conflict (key) do update set value = excluded.value, updated_at = now()`,
    [key, JSON.stringify(value)],
  );
}

/** Clés de stockage de plusieurs médias (jamais envoyées au navigateur). */
export async function storageKeysFor(ids: string[]): Promise<Map<string, { original: string; thumb: string | null; poster: string | null; mime: string; name: string; kind: string }>> {
  const out = new Map<string, { original: string; thumb: string | null; poster: string | null; mime: string; name: string; kind: string }>();
  if (ids.length === 0) return out;
  const db = await getDb();
  const rows = await db.query(`select id, storage_key, thumb_key, poster_key, mime, name, kind from atelier.assets where id = any($1::uuid[])`, [ids]);
  for (const r of rows) {
    out.set(String(r.id).toLowerCase(), {
      original: r.storage_key as string,
      thumb: (r.thumb_key as string | null) ?? null,
      poster: (r.poster_key as string | null) ?? null,
      mime: r.mime as string,
      name: r.name as string,
      kind: r.kind as string,
    });
  }
  return out;
}
