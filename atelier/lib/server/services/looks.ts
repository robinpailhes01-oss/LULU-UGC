import "server-only";
import { getDb, iso, json, num, type Db, type Row } from "@/lib/server/db";
import { HttpError, badRequest, notFound } from "@/lib/server/http";
import { logActivity } from "@/lib/server/repo/activity";
import { lookParamsOf } from "@/lib/shared/look";
import type { Look, RetouchParams } from "@/lib/shared/types";

/**
 * Looks enregistrés (préréglages de couleur). Les looks intégrés (« June doré »…) sont créés
 * automatiquement au premier appel s'ils n'existent pas, et remis à jour quand leur réglage
 * évolue (BUILTIN_LOOKS_VERSION). Un look ne contient que lumière, couleur et effets : jamais de
 * recadrage ni de rotation.
 */

/** À incrémenter à chaque retouche des réglages ci-dessous : les bases existantes sont mises à jour. */
export const BUILTIN_LOOKS_VERSION = 2;

/** Clés absentes = neutres (l'exposition propre à la photo est alors conservée). */
export const BUILTIN_LOOKS: { name: string; description: string; params: Partial<RetouchParams> }[] = [
  {
    name: "June doré",
    description: "La signature : lumière de fin de journée, ombres ouvertes, blancs crème.",
    params: { temperature: 18, tint: 4, fade: 8, contrast: 6, shadows: 12, highlights: -15, whites: -4, saturation: -6, vibrance: 10, vignette: 12 },
  },
  {
    name: "Lumière naturelle",
    description: "Propre et fidèle, à peine réchauffé.",
    params: { exposure: 0.1, contrast: 8, highlights: -12, shadows: 8, whites: 6, blacks: -4, temperature: 4, vibrance: 8 },
  },
  {
    name: "Crème",
    description: "Doux et lumineux, couleurs retenues, hautes lumières laiteuses.",
    params: { exposure: 0.1, contrast: -8, highlights: -18, shadows: 14, whites: -10, blacks: 6, temperature: 9, tint: 3, saturation: -18, vibrance: 4, fade: 14 },
  },
  {
    name: "Heure dorée",
    description: "Chaleur franche du soleil rasant.",
    params: { temperature: 26, tint: 5, contrast: 8, highlights: -18, shadows: 10, saturation: -2, vibrance: 10, fade: 4, vignette: 16 },
  },
  {
    name: "Nuit chaude",
    description: "Intérieurs du soir : bougies, lampes, noirs profonds.",
    params: { exposure: -0.05, temperature: 20, tint: 3, contrast: 14, highlights: -14, shadows: 4, blacks: -16, saturation: -4, vibrance: 6, vignette: 22 },
  },
  {
    name: "Matin frais",
    description: "Air du matin : légèrement froid, aéré.",
    params: { exposure: 0.15, temperature: -10, tint: -2, contrast: -4, highlights: -12, shadows: 14, whites: 6, saturation: -8, vibrance: 6, fade: 6 },
  },
  {
    name: "Noir & blanc chaud",
    description: "Noir et blanc viré sépia léger, grain fin.",
    params: { saturation: -100, temperature: 22, tint: 2, contrast: 16, highlights: -8, shadows: 6, blacks: -8, fade: 10, vignette: 14, grain: 18 },
  },
];

const SETTINGS_KEY = "looks.builtin";

function toLook(r: Row): Look {
  return {
    id: r.id as string,
    name: r.name as string,
    params: json<Partial<RetouchParams>>(r.params),
    builtin: Boolean(r.builtin),
    sort: num(r.sort),
    createdAt: iso(r.created_at),
    createdBy: (r.created_by as string | null) ?? null,
  };
}

/** Nom normalisé pour comparer (casse, accents, espaces, esperluette). */
export function normalizeLookName(name: string): string {
  return name
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/&/g, " et ")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

type SeedHolder = { done?: number };
const seedHolder: SeedHolder = ((globalThis as unknown as { __atelierLookSeed?: SeedHolder }).__atelierLookSeed ??= {});

/** Crée ou met à jour les looks intégrés (une fois par version, sous verrou). */
async function ensureBuiltins(db: Db): Promise<void> {
  if (seedHolder.done === BUILTIN_LOOKS_VERSION) return;
  await db.tx(async (t) => {
    await t.query(`select pg_advisory_xact_lock(4242101)`);
    const cur = await t.one<{ value: unknown }>(`select value from atelier.settings where key = $1`, [SETTINGS_KEY]);
    const version = cur ? num(json<{ version?: number }>(cur.value).version) : 0;
    if (version === BUILTIN_LOOKS_VERSION) return;
    const existing = await t.query<{ id: string; name: string }>(`select id, name from atelier.looks where builtin = true`);
    const byName = new Map(existing.map((r) => [normalizeLookName(r.name), r.id]));
    for (const [i, look] of BUILTIN_LOOKS.entries()) {
      const params = JSON.stringify(builtinParams(look.params));
      const id = byName.get(normalizeLookName(look.name));
      if (id) await t.query(`update atelier.looks set name = $2, params = $3::jsonb, sort = $4 where id = $1`, [id, look.name, params, i]);
      else await t.query(`insert into atelier.looks (name, params, builtin, sort, created_by) values ($1, $2::jsonb, true, $3, null)`, [look.name, params, i]);
    }
    await t.query(
      `insert into atelier.settings (key, value, updated_at) values ($1, $2::jsonb, now())
       on conflict (key) do update set value = excluded.value, updated_at = now()`,
      [SETTINGS_KEY, JSON.stringify({ version: BUILTIN_LOOKS_VERSION })],
    );
  });
  seedHolder.done = BUILTIN_LOOKS_VERSION;
}

/** Réglages complets d'un look intégré : toutes les clés sauf l'exposition quand elle n'est pas fixée. */
function builtinParams(p: Partial<RetouchParams>): Partial<RetouchParams> {
  const full = lookParamsOf(p);
  if (p.exposure === undefined) delete full.exposure;
  return full;
}

export async function listLooks(): Promise<Look[]> {
  const db = await getDb();
  await ensureBuiltins(db);
  const rows = await db.query(`select * from atelier.looks order by builtin desc, sort asc, created_at asc`);
  return rows.map(toLook);
}

export async function getLook(id: string): Promise<Look | null> {
  if (!/^[0-9a-f-]{36}$/i.test(id)) return null;
  const db = await getDb();
  await ensureBuiltins(db);
  const r = await db.one(`select * from atelier.looks where id = $1`, [id]);
  return r ? toLook(r) : null;
}

/** Trouve un look par nom (insensible à la casse et aux accents) — utile pour l'agent. */
export async function findLookByName(name: string): Promise<Look | null> {
  const wanted = normalizeLookName(name);
  if (!wanted) return null;
  const looks = await listLooks();
  return (
    looks.find((l) => normalizeLookName(l.name) === wanted) ??
    looks.find((l) => normalizeLookName(l.name).startsWith(wanted)) ??
    looks.find((l) => normalizeLookName(l.name).includes(wanted)) ??
    null
  );
}

export async function createLook(input: { name: string; params: Partial<RetouchParams> }, actor: string | null): Promise<Look> {
  const name = input.name.trim().replace(/\s+/g, " ");
  if (!name) throw badRequest("Donnez un nom au look.");
  if (name.length > 60) throw badRequest("Le nom du look est trop long (60 caractères maximum).");
  const looks = await listLooks();
  if (looks.some((l) => normalizeLookName(l.name) === normalizeLookName(name))) {
    throw new HttpError(409, "conflict", `Un look « ${name} » existe déjà : choisissez un autre nom.`);
  }
  const params = lookParamsOf(input.params);
  // Exposition nulle : non enregistrée, pour garder celle de chaque photo quand on applique le look.
  if (!params.exposure) delete params.exposure;
  const db = await getDb();
  const r = await db.one(
    `insert into atelier.looks (name, params, builtin, sort, created_by)
     values ($1, $2::jsonb, false, (select coalesce(max(sort), 99) + 1 from atelier.looks where builtin = false), $3)
     returning *`,
    [name, JSON.stringify(params), actor],
  );
  const look = toLook(r!);
  await logActivity({ actor, verb: "a créé le look", objectType: "look", objectId: look.id, summary: look.name }, db);
  return look;
}

export async function deleteLook(id: string, actor: string | null): Promise<void> {
  const look = await getLook(id);
  if (!look) throw notFound("Look");
  if (look.builtin) throw new HttpError(403, "forbidden", `« ${look.name} » est un look intégré : il ne peut pas être supprimé.`);
  const db = await getDb();
  await db.query(`delete from atelier.looks where id = $1 and builtin = false`, [id]);
  await logActivity({ actor, verb: "a supprimé le look", objectType: "look", objectId: id, summary: look.name }, db);
}
