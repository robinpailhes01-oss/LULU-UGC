import "server-only";
import type { BetaContentBlockParam, BetaMessageParam } from "@anthropic-ai/sdk/resources/beta/messages/messages";
import { resolveClientFilter, type ClientFilter } from "@/lib/server/client-scope";
import { getDb, iso, isoOrNull, jsonOrNull, num, type Row } from "@/lib/server/db";
import { notFound } from "@/lib/server/http";
import type { AgentThread, PendingAction } from "@/lib/shared/types";

/**
 * Persistance de l'agent (tables atelier.threads, atelier.messages, atelier.pending_actions).
 *
 * Règles (pensée préservée de Claude Opus 5.5 et cache des prompts) :
 * - append-only : un message n'est jamais modifié, réordonné ni supprimé (seq croissant) ;
 * - le contenu est stocké octet pour octet tel qu'envoyé ou reçu : `content` = { wire: "<JSON>" }.
 *   Un jsonb « nu » réordonnerait les clés (tool_use.input…) et ferait rater le cache à chaque
 *   relecture ; la chaîne JSON, elle, est rejouée telle quelle ;
 * - `meta` (jsonb) porte ce qui sert à l'affichage et au suivi : jamais rejoué vers Claude.
 */

export type StoredKind = "user" | "tool_results" | "assistant";

export interface ToolChipMeta {
  id: string;
  name: string;
  label: string;
  ok: boolean;
  summary: string;
  assetIds?: string[];
  actionId?: string;
}

export interface MessageMeta {
  kind: StoredKind;
  /** Texte tapé par la personne (sans le bloc <ecran>). */
  text?: string;
  /** Puces d'outils (message tool_results). */
  tools?: ToolChipMeta[];
  model?: string;
  stopReason?: string | null;
  usage?: unknown;
  requestId?: string | null;
  /** Réponse interrompue (bouton « Arrêter ») : seul le texte déjà reçu est gardé. */
  aborted?: boolean;
  /** Réponse servie par un modèle de repli (refus du modèle principal). */
  fallback?: boolean;
  /** Prompt système figé à la création du fil (relu octet pour octet ensuite). */
  system?: FrozenSystem;
  /** Action confirmée/annulée à laquelle répond ce message. */
  actionId?: string;
  /** Index des skills envoyé dans ce message (<skills_a_jour>), s'il a changé depuis le début du fil. */
  skillsIndex?: string;
  /** Bloc client envoyé dans ce message (<client_a_jour>), s'il a changé depuis le début du fil. */
  clientBlock?: string;
}

export interface FrozenSystem {
  version: string;
  stable: string;
  skills: string;
  /** Bloc <client> figé à la création du fil (absent pour les fils d'avant les clients). */
  client?: string;
}

export interface StoredMessage {
  id: string;
  seq: number;
  role: "user" | "assistant";
  content: BetaContentBlockParam[];
  wire: string;
  meta: MessageMeta;
  createdAt: string;
}

function toThread(r: Row): AgentThread {
  return {
    id: r.id as string,
    clientId: (r.client_id as string | null) ?? null,
    title: r.title as string,
    createdAt: iso(r.created_at),
    updatedAt: iso(r.updated_at),
    createdBy: (r.created_by as string | null) ?? null,
  };
}

function readWire(v: unknown): string {
  const o = jsonOrNull<unknown>(v);
  if (o && typeof o === "object" && !Array.isArray(o) && typeof (o as { wire?: unknown }).wire === "string") return (o as { wire: string }).wire;
  // Ligne écrite autrement (ne devrait pas arriver) : on rejoue la valeur telle quelle.
  return JSON.stringify(o ?? []);
}

function toMessage(r: Row): StoredMessage {
  const wire = readWire(r.content);
  return {
    id: r.id as string,
    seq: num(r.seq),
    role: r.role as StoredMessage["role"],
    content: JSON.parse(wire) as BetaContentBlockParam[],
    wire,
    meta: (jsonOrNull<MessageMeta>(r.meta) ?? { kind: r.role === "assistant" ? "assistant" : "user" }) as MessageMeta,
    createdAt: iso(r.created_at),
  };
}

export function toPendingAction(r: Row): PendingAction {
  return {
    id: r.id as string,
    threadId: (r.thread_id as string | null) ?? null,
    tool: r.tool as string,
    input: jsonOrNull<Record<string, unknown>>(r.input) ?? {},
    summary: r.summary as string,
    status: r.status as PendingAction["status"],
    result: jsonOrNull<unknown>(r.result),
    createdAt: iso(r.created_at),
    resolvedAt: isoOrNull(r.resolved_at),
  };
}

// ---------------------------------------------------------------------------------------------
// Fils

export async function createThread(title: string, actor: string | null, clientId: string | null = null): Promise<AgentThread> {
  const db = await getDb();
  const r = await db.one(`insert into atelier.threads (title, created_by, client_id) values ($1, $2, $3::uuid) returning *`, [title.slice(0, 120) || "Nouvelle conversation", actor, clientId]);
  return toThread(r!);
}

/** Change le client d'une conversation (les outils suivent ce client). */
export async function setThreadClient(id: string, clientId: string | null): Promise<void> {
  const db = await getDb();
  await db.query(`update atelier.threads set client_id = $2::uuid where id = $1`, [id, clientId]);
}

export async function getThread(id: string): Promise<AgentThread | null> {
  const db = await getDb();
  const r = await db.one(`select * from atelier.threads where id = $1`, [id]);
  return r ? toThread(r) : null;
}

export async function requireThread(id: string): Promise<AgentThread> {
  const t = await getThread(id);
  if (!t) throw notFound("Conversation");
  return t;
}

/** Conversations récentes du client (undefined = client courant, null = toutes) : les miennes d'abord, puis par date. */
export async function listThreads(actor: string | null, limit = 60, client?: ClientFilter): Promise<AgentThread[]> {
  const db = await getDb();
  const filter = await resolveClientFilter(client);
  const rows = await db.query(
    `select * from atelier.threads
     where ($3::uuid is null or client_id = $3::uuid)
     order by (case when $1::text is not null and created_by = $1 then 0 else 1 end), updated_at desc
     limit $2`,
    [actor, limit, filter],
  );
  return rows.map(toThread);
}

export async function renameThread(id: string, title: string): Promise<void> {
  const db = await getDb();
  await db.query(`update atelier.threads set title = $2 where id = $1`, [id, title.slice(0, 120)]);
}

export async function deleteThread(id: string): Promise<void> {
  const db = await getDb();
  const rows = await db.query(`delete from atelier.threads where id = $1 returning id`, [id]);
  if (rows.length === 0) throw notFound("Conversation");
}

// ---------------------------------------------------------------------------------------------
// Messages

export async function loadMessages(threadId: string): Promise<StoredMessage[]> {
  const db = await getDb();
  const rows = await db.query(`select * from atelier.messages where thread_id = $1 order by seq`, [threadId]);
  return rows.map(toMessage);
}

/** Historique à envoyer à Claude : les octets stockés, rejoués tels quels. */
export function toApiMessages(rows: StoredMessage[]): BetaMessageParam[] {
  return rows.map((m) => ({ role: m.role, content: JSON.parse(m.wire) as BetaContentBlockParam[] }));
}

/** Ajoute un message en fin de fil (seq = dernier + 1), dans une transaction. */
export async function appendMessage(threadId: string, role: "user" | "assistant", content: BetaContentBlockParam[], meta: MessageMeta): Promise<StoredMessage> {
  const wire = JSON.stringify(content);
  const db = await getDb();
  const r = await db.tx(async (t) => {
    await t.query(`select id from atelier.threads where id = $1 for update`, [threadId]);
    const next = await t.one<{ n: unknown }>(`select coalesce(max(seq), -1) + 1 as n from atelier.messages where thread_id = $1`, [threadId]);
    const row = await t.one(
      `insert into atelier.messages (thread_id, seq, role, content, meta) values ($1, $2, $3, $4::jsonb, $5::jsonb) returning *`,
      [threadId, num(next?.n ?? 0), role, JSON.stringify({ wire }), JSON.stringify(meta)],
    );
    await t.query(`update atelier.threads set updated_at = now() where id = $1`, [threadId]);
    return row!;
  });
  return toMessage(r);
}

// ---------------------------------------------------------------------------------------------
// Actions en attente de confirmation

export const ACTION_TTL_MS = 24 * 60 * 60 * 1000;

export function isExpired(a: PendingAction, now = Date.now()): boolean {
  return a.status === "pending" && now - new Date(a.createdAt).getTime() > ACTION_TTL_MS;
}

/** Vue d'une action pour l'interface (une action de plus de 24 h est présentée comme expirée). */
export function presentAction(a: PendingAction): PendingAction {
  return isExpired(a) ? { ...a, status: "cancelled", result: { expired: true, message: "Demande expirée (plus de 24 h)." } } : a;
}

export async function createPendingAction(input: { threadId: string | null; tool: string; input: Record<string, unknown>; summary: string }): Promise<PendingAction> {
  const db = await getDb();
  const r = await db.one(
    `insert into atelier.pending_actions (thread_id, tool, input, summary) values ($1, $2, $3::jsonb, $4) returning *`,
    [input.threadId, input.tool, JSON.stringify(input.input), input.summary],
  );
  return toPendingAction(r!);
}

export async function getPendingAction(id: string): Promise<PendingAction | null> {
  const db = await getDb();
  const r = await db.one(`select * from atelier.pending_actions where id = $1`, [id]);
  return r ? toPendingAction(r) : null;
}

/**
 * Réserve une action encore en attente (un seul clic gagne, même en double) : renvoie l'action
 * réservée, ou null si elle a déjà été traitée.
 */
export async function claimPendingAction(id: string, actor: string | null): Promise<PendingAction | null> {
  const db = await getDb();
  const r = await db.one(
    `update atelier.pending_actions set resolved_at = now(), resolved_by = $2
     where id = $1 and status = 'pending' and resolved_at is null returning *`,
    [id, actor],
  );
  return r ? toPendingAction(r) : null;
}

export async function resolvePendingAction(id: string, status: PendingAction["status"], result: unknown): Promise<PendingAction> {
  const db = await getDb();
  const r = await db.one(`update atelier.pending_actions set status = $2, result = $3::jsonb, resolved_at = coalesce(resolved_at, now()) where id = $1 returning *`, [
    id,
    status,
    result === undefined ? null : JSON.stringify(result),
  ]);
  if (!r) throw notFound("Action");
  return toPendingAction(r);
}

export async function listThreadActions(threadId: string): Promise<PendingAction[]> {
  const db = await getDb();
  const rows = await db.query(`select * from atelier.pending_actions where thread_id = $1 order by created_at`, [threadId]);
  return rows.map(toPendingAction);
}
