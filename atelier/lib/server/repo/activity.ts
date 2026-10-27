import "server-only";
import { getDb, iso, num, type Db } from "@/lib/server/db";
import type { ActivityItem } from "@/lib/shared/types";

export interface ActivityInput {
  actor: string | null;
  verb: string; // « a importé », « a retouché », « a programmé »…
  objectType: "asset" | "folder" | "montage" | "post" | "look" | "thread" | "system";
  objectId?: string | null;
  summary: string;
  meta?: Record<string, unknown>;
}

/** Journal d'activité partagé de l'équipe (affiché sur le tableau de bord). Ne lève jamais. */
export async function logActivity(input: ActivityInput, db?: Db): Promise<void> {
  try {
    const d = db ?? (await getDb());
    await d.query(
      `insert into atelier.activity (actor, verb, object_type, object_id, summary, meta) values ($1, $2, $3, $4, $5, $6::jsonb)`,
      [input.actor, input.verb, input.objectType, input.objectId ?? null, input.summary, input.meta ? JSON.stringify(input.meta) : null],
    );
  } catch (err) {
    console.error("[atelier] journal d'activité", err);
  }
}

export async function listActivity(limit = 30): Promise<ActivityItem[]> {
  const db = await getDb();
  const rows = await db.query(`select * from atelier.activity order by created_at desc, id desc limit $1`, [limit]);
  return rows.map((r) => ({
    id: num(r.id),
    actor: (r.actor as string | null) ?? null,
    verb: r.verb as string,
    objectType: r.object_type as string,
    objectId: (r.object_id as string | null) ?? null,
    summary: r.summary as string,
    createdAt: iso(r.created_at),
  }));
}
