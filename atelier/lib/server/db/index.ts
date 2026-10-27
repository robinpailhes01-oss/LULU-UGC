import "server-only";
import { env } from "@/lib/server/env";
import { MIGRATIONS } from "@/lib/server/db/migrations";

/**
 * Accès SQL unique pour tout Atelier. Les requêtes sont écrites en SQL Postgres avec des
 * paramètres positionnels ($1, $2…) et fonctionnent à l'identique sur PGlite (local) et sur
 * Supabase (postgres.js). Convention : passer les jsonb en JSON.stringify(...) avec un cast
 * `$n::jsonb`, les tableaux de texte/uuid tels quels avec un cast `$n::text[]` / `$n::uuid[]`.
 */
export interface Db {
  readonly kind: "pglite" | "postgres";
  query<T = Row>(text: string, params?: unknown[]): Promise<T[]>;
  one<T = Row>(text: string, params?: unknown[]): Promise<T | null>;
  tx<R>(fn: (db: Db) => Promise<R>): Promise<R>;
}

export type Row = Record<string, unknown>;

type Executor = {
  query: (text: string, params: unknown[]) => Promise<Row[]>;
  tx: <R>(fn: (exec: Executor) => Promise<R>) => Promise<R>;
};

function wrap(kind: Db["kind"], exec: Executor): Db {
  return {
    kind,
    query: async <T,>(text: string, params: unknown[] = []) => (await exec.query(text, params.map(normalizeParam))) as T[],
    one: async <T,>(text: string, params: unknown[] = []) => {
      const rows = (await exec.query(text, params.map(normalizeParam))) as T[];
      return rows[0] ?? null;
    },
    tx: (fn) => exec.tx((inner) => fn(wrap(kind, inner))),
  };
}

function normalizeParam(p: unknown): unknown {
  if (p === undefined) return null;
  if (p instanceof Date) return p.toISOString();
  return p;
}

// ---------------------------------------------------------------------------------------------
// PGlite (local)

async function createPglite(): Promise<Executor> {
  const { PGlite } = await import("@electric-sql/pglite");
  const fs = await import("node:fs/promises");
  await fs.mkdir(env.db.pgliteDir, { recursive: true });
  const pg = await PGlite.create({ dataDir: env.db.pgliteDir });
  // PGlite exécute une requête à la fois : on sérialise pour éviter les entrelacements de transactions.
  let chain: Promise<unknown> = Promise.resolve();
  const serial = <R,>(fn: () => Promise<R>): Promise<R> => {
    const next = chain.then(fn, fn);
    chain = next.catch(() => undefined);
    return next;
  };
  const execFor = (target: { query: typeof pg.query }): Executor => ({
    query: async (text, params) => (await target.query<Row>(text, params)).rows,
    tx: async (fn) => fn(execFor(target)),
  });
  return {
    query: (text, params) => serial(async () => (await pg.query<Row>(text, params)).rows),
    tx: (fn) => serial(() => pg.transaction((t) => fn(execFor(t as unknown as { query: typeof pg.query })))),
  };
}

// ---------------------------------------------------------------------------------------------
// Postgres distant (Supabase) via postgres.js

async function createPostgres(): Promise<Executor> {
  const postgres = (await import("postgres")).default;
  const sql = postgres(env.db.url!, {
    // Le pooler de transactions de Supabase (port 6543) ne supporte pas les requêtes préparées.
    prepare: false,
    max: env.isProd ? 3 : 5,
    idle_timeout: 20,
    connect_timeout: 15,
    types: {
      // bigint (count, tailles) renvoyé en nombre JS, comme PGlite (BigInt casserait JSON.stringify).
      bigint: { to: 20, from: [20], serialize: (x: unknown) => String(x), parse: (x: string) => Number(x) },
      // Nos requêtes passent les jsonb déjà sérialisés (JSON.stringify + ::jsonb) : sans cette
      // surcharge, postgres.js les ré-encoderait et stockerait une chaîne JSON au lieu d'un objet.
      json: {
        to: 114,
        from: [114, 3802],
        serialize: (x: unknown) => (typeof x === "string" ? x : JSON.stringify(x)),
        parse: (x: string) => JSON.parse(x),
      },
    },
    transform: { undefined: null },
    onnotice: () => undefined,
  });
  type Sql = typeof sql;
  const execFor = (target: Pick<Sql, "unsafe">): Executor => ({
    query: async (text, params) => (await target.unsafe(text, params as never[])) as unknown as Row[],
    tx: async (fn) => fn(execFor(target)),
  });
  return {
    query: async (text, params) => (await sql.unsafe(text, params as never[])) as unknown as Row[],
    tx: async (fn) => (await sql.begin((t) => fn(execFor(t as unknown as Pick<Sql, "unsafe">)))) as never,
  };
}

// ---------------------------------------------------------------------------------------------

type Holder = { promise?: Promise<Db> };
const holder: Holder = ((globalThis as unknown as { __atelierDb?: Holder }).__atelierDb ??= {});

async function init(): Promise<Db> {
  const exec = env.db.kind === "postgres" ? await createPostgres() : await createPglite();
  const db = wrap(env.db.kind, exec);
  await migrate(db);
  return db;
}

/** Connexion partagée (créée et migrée au premier appel). */
export function getDb(): Promise<Db> {
  if (!holder.promise) {
    holder.promise = init().catch((err) => {
      holder.promise = undefined;
      throw err;
    });
  }
  return holder.promise;
}

async function migrate(db: Db) {
  await db.query(`create schema if not exists atelier`);
  await db.query(`create table if not exists atelier.schema_migrations (version text primary key, applied_at timestamptz not null default now())`);
  const done = new Set((await db.query<{ version: string }>(`select version from atelier.schema_migrations`)).map((r) => r.version));
  for (const m of MIGRATIONS) {
    if (done.has(m.version)) continue;
    await db.tx(async (t) => {
      // Verrou pour éviter que deux instances serverless appliquent la même migration.
      await t.query(`select pg_advisory_xact_lock(4242001)`);
      const again = await t.one(`select 1 as ok from atelier.schema_migrations where version = $1`, [m.version]);
      if (again) return;
      for (const statement of splitSql(m.sql)) await t.query(statement);
      await t.query(`insert into atelier.schema_migrations (version) values ($1)`, [m.version]);
    });
  }
}

/** Découpe un script SQL en instructions (pas de fonctions plpgsql dans nos migrations). */
export function splitSql(sql: string): string[] {
  return sql
    .split(/;\s*(?:\r?\n|$)/)
    .map((s) => s.replace(/^\s*--.*$/gm, "").trim())
    .filter((s) => s.length > 0);
}

// ---------------------------------------------------------------------------------------------
// Aides de conversion des lignes

export function iso(v: unknown): string {
  if (v instanceof Date) return v.toISOString();
  if (typeof v === "string") return new Date(v).toISOString();
  return String(v);
}

export function isoOrNull(v: unknown): string | null {
  return v === null || v === undefined ? null : iso(v);
}

export function num(v: unknown): number {
  if (typeof v === "number") return v;
  if (typeof v === "bigint") return Number(v);
  if (typeof v === "string") return Number(v);
  return 0;
}

export function numOrNull(v: unknown): number | null {
  return v === null || v === undefined ? null : num(v);
}

export function json<T>(v: unknown): T {
  if (typeof v === "string") return JSON.parse(v) as T;
  return v as T;
}

export function jsonOrNull<T>(v: unknown): T | null {
  return v === null || v === undefined ? null : json<T>(v);
}

export function arr<T = string>(v: unknown): T[] {
  if (Array.isArray(v)) return v as T[];
  if (typeof v === "string" && v.startsWith("{")) {
    // Littéral de tableau Postgres non décodé ({a,b}).
    const inner = v.slice(1, -1);
    return (inner ? inner.split(",").map((s) => s.replace(/^"|"$/g, "")) : []) as T[];
  }
  return [];
}
