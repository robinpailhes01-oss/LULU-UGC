import "server-only";
import { getDb } from "@/lib/server/db";
import type { ZWebhookEvent } from "@/lib/server/zernio/types";

/**
 * Journal des événements webhook Zernio (table atelier.zernio_events, migration 003_posts_events).
 * Zernio livre « au moins une fois » et réessaie jusqu'à 7 fois : on dédoublonne sur l'identifiant
 * de l'événement (payload.id = X-Zernio-Event-Id).
 */
export async function recordEvent(evt: ZWebhookEvent, eventId: string): Promise<boolean> {
  const db = await getDb();
  const rows = await db.query(
    `insert into atelier.zernio_events (id, event, zernio_post_id, payload) values ($1, $2, $3, $4::jsonb)
     on conflict (id) do nothing returning id`,
    [eventId, evt.event, evt.post?.id ?? null, JSON.stringify(evt)],
  );
  return rows.length > 0;
}

export async function linkEvent(eventId: string, postId: string): Promise<void> {
  const db = await getDb();
  await db.query(`update atelier.zernio_events set post_id = $2 where id = $1`, [eventId, postId]);
}

/** Oublie un événement dont le traitement a échoué, pour que la relivraison de Zernio soit traitée. */
export async function forgetEvent(eventId: string): Promise<void> {
  const db = await getDb();
  await db.query(`delete from atelier.zernio_events where id = $1`, [eventId]);
}
