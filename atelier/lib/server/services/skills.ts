import "server-only";
import { createHash } from "node:crypto";
import { arr, getDb, iso, jsonOrNull, num, type Db, type Row } from "@/lib/server/db";
import { badRequest, HttpError, notFound } from "@/lib/server/http";
import { logActivity } from "@/lib/server/repo/activity";
import { BUNDLED_SKILLS } from "@/lib/server/skills/bundled.generated";
import type { BundledSkill } from "@/lib/server/skills/types";
import type { MontageStyleData, Skill, SkillKind, SkillVersion } from "@/lib/shared/types";

/**
 * Skills de l'atelier : le savoir-faire écrit (styles de montage, voix, méthodes, références).
 *
 * Deux origines :
 * - « repo » : écrits dans le dépôt (atelier/skills/<slug>/), embarqués au build et importés
 *   automatiquement en base. Une nouvelle version du dépôt remplace la version en base, sauf si
 *   le skill a été modifié dans l'Atelier : on signale alors qu'une mise à jour est disponible.
 * - « app » : créés dans l'Atelier (par l'équipe ou l'agent).
 * Chaque modification crée une version (historique, retour arrière possible).
 */

export const SKILL_KINDS: SkillKind[] = ["montage", "voice", "brand", "workflow", "references", "retouch", "other"];

export const SKILL_KIND_LABEL: Record<SkillKind, string> = {
  montage: "Style de montage",
  voice: "Voix et légendes",
  brand: "Marque",
  workflow: "Méthode",
  references: "Références",
  retouch: "Retouche",
  other: "Autre",
};

function toSkill(r: Row): Skill {
  return {
    slug: r.slug as string,
    kind: r.kind as SkillKind,
    name: r.name as string,
    description: (r.description as string) ?? "",
    body: (r.body as string) ?? "",
    data: jsonOrNull<Record<string, unknown>>(r.data),
    files: jsonOrNull<Record<string, string>>(r.files) ?? {},
    referenceAssetIds: arr(r.reference_asset_ids),
    source: r.source as Skill["source"],
    version: num(r.version),
    appEdited: Boolean(r.app_edited),
    repoUpdateAvailable: Boolean(r.repo_pending_hash),
    enabled: Boolean(r.enabled),
    createdAt: iso(r.created_at),
    updatedAt: iso(r.updated_at),
    updatedBy: (r.updated_by as string | null) ?? null,
  };
}

function toVersion(r: Row): SkillVersion {
  return {
    id: r.id as string,
    slug: r.slug as string,
    version: num(r.version),
    name: r.name as string,
    description: (r.description as string) ?? "",
    body: (r.body as string) ?? "",
    data: jsonOrNull<Record<string, unknown>>(r.data),
    files: jsonOrNull<Record<string, string>>(r.files) ?? {},
    referenceAssetIds: arr(r.reference_asset_ids),
    note: (r.note as string | null) ?? null,
    createdAt: iso(r.created_at),
    createdBy: (r.created_by as string | null) ?? null,
  };
}

async function insertVersion(t: Db, s: Skill, note: string | null, actor: string | null) {
  await t.query(
    `insert into atelier.skill_versions (slug, version, name, description, body, data, files, reference_asset_ids, note, created_by)
     values ($1, $2, $3, $4, $5, $6::jsonb, $7::jsonb, $8::uuid[], $9, $10)
     on conflict (slug, version) do nothing`,
    [s.slug, s.version, s.name, s.description, s.body, s.data ? JSON.stringify(s.data) : null, JSON.stringify(s.files), s.referenceAssetIds, note, actor],
  );
}

// ---------------------------------------------------------------------------------------------
// Synchronisation avec le dépôt

function canonical(v: unknown): string {
  if (Array.isArray(v)) return `[${v.map(canonical).join(",")}]`;
  if (v && typeof v === "object") {
    const o = v as Record<string, unknown>;
    return `{${Object.keys(o).sort().map((k) => `${JSON.stringify(k)}:${canonical(o[k])}`).join(",")}}`;
  }
  return JSON.stringify(v ?? null);
}

/** Empreinte du contenu d'un skill — identique à celle de scripts/bundle-skills.mjs. */
export function skillContentHash(s: Pick<Skill, "kind" | "name" | "description" | "body" | "data" | "files">): string {
  return createHash("sha256")
    .update(canonical({ kind: s.kind, name: s.name, description: s.description, body: s.body, data: s.data, files: s.files }))
    .digest("hex")
    .slice(0, 16);
}

let syncPromise: Promise<void> | null = null;

/** Importe / met à jour les skills du dépôt (une fois par démarrage du serveur). */
export function ensureSkillsSynced(): Promise<void> {
  if (!syncPromise) {
    syncPromise = syncFromRepo().catch((err) => {
      syncPromise = null;
      throw err;
    });
  }
  return syncPromise;
}

async function syncFromRepo(): Promise<void> {
  const db = await getDb();
  for (const b of BUNDLED_SKILLS) {
    await db.tx(async (t) => {
      const cur = await t.one(`select * from atelier.skills where slug = $1 for update`, [b.slug]);
      if (!cur) {
        const r = await t.one(
          `insert into atelier.skills (slug, kind, name, description, body, data, files, source, version, repo_hash, app_edited)
           values ($1, $2, $3, $4, $5, $6::jsonb, $7::jsonb, 'repo', 1, $8, false) returning *`,
          [b.slug, b.kind, b.name, b.description, b.body, b.data ? JSON.stringify(b.data) : null, JSON.stringify(b.files), b.hash],
        );
        await insertVersion(t, toSkill(r!), "Import depuis le dépôt", null);
        return;
      }
      if (cur.source !== "repo" || cur.repo_hash === b.hash) {
        if (cur.repo_pending_hash && cur.repo_hash === b.hash) await t.query(`update atelier.skills set repo_pending_hash = null where slug = $1`, [b.slug]);
        return;
      }
      if (skillContentHash(toSkill(cur)) === b.hash) {
        // Le dépôt contient déjà ce contenu (ex. rapatrié avec skills:pull) : simple réalignement.
        await t.query(`update atelier.skills set repo_hash = $2, repo_pending_hash = null, app_edited = false where slug = $1`, [b.slug, b.hash]);
        return;
      }
      if (cur.app_edited) {
        if (cur.repo_pending_hash !== b.hash) await t.query(`update atelier.skills set repo_pending_hash = $2 where slug = $1`, [b.slug, b.hash]);
        return;
      }
      const r = await applyBundled(t, b, num(cur.version) + 1);
      await insertVersion(t, r, "Mise à jour depuis le dépôt", null);
    });
  }
}

/** `actor` : qui a récupéré la version du dépôt (null pour une mise à jour automatique au démarrage). */
async function applyBundled(t: Db, b: BundledSkill, version: number, actor: string | null = null): Promise<Skill> {
  const r = await t.one(
    `update atelier.skills set kind = $2, name = $3, description = $4, body = $5, data = $6::jsonb, files = $7::jsonb,
       version = $8, repo_hash = $9, repo_pending_hash = null, app_edited = false, updated_at = now(), updated_by = $10
     where slug = $1 returning *`,
    [b.slug, b.kind, b.name, b.description, b.body, b.data ? JSON.stringify(b.data) : null, JSON.stringify(b.files), version, b.hash, actor],
  );
  return toSkill(r!);
}

// ---------------------------------------------------------------------------------------------
// Lecture

export async function listSkills(opts: { kind?: SkillKind; includeDisabled?: boolean } = {}): Promise<Skill[]> {
  await ensureSkillsSynced();
  const db = await getDb();
  const where: string[] = [];
  const params: unknown[] = [];
  if (opts.kind) {
    params.push(opts.kind);
    where.push(`kind = $${params.length}`);
  }
  if (!opts.includeDisabled) where.push("enabled = true");
  const rows = await db.query(`select * from atelier.skills ${where.length ? `where ${where.join(" and ")}` : ""} order by kind, lower(name)`, params);
  return rows.map(toSkill);
}

export async function getSkill(slug: string): Promise<Skill | null> {
  await ensureSkillsSynced();
  const db = await getDb();
  const r = await db.one(`select * from atelier.skills where slug = $1`, [slug]);
  return r ? toSkill(r) : null;
}

export async function requireSkill(slug: string): Promise<Skill> {
  const s = await getSkill(slug);
  if (!s) throw notFound("Skill");
  return s;
}

/** Retrouve un skill par slug ou par nom (insensible à la casse et aux accents). */
export async function findSkill(nameOrSlug: string): Promise<Skill | null> {
  const direct = await getSkill(nameOrSlug.trim());
  if (direct) return direct;
  const norm = (s: string) => s.normalize("NFD").replace(/\p{M}/gu, "").toLowerCase().trim();
  const wanted = norm(nameOrSlug);
  const all = await listSkills({ includeDisabled: true });
  return all.find((s) => norm(s.name) === wanted || s.slug === slugify(nameOrSlug)) ?? null;
}

/** Paramètres d'un style de montage (skill « montage »), ou null. */
export async function getMontageStyle(nameOrSlug: string | null | undefined): Promise<{ skill: Skill; data: MontageStyleData } | null> {
  if (!nameOrSlug) return null;
  const s = await findSkill(nameOrSlug);
  if (!s || s.kind !== "montage") return null;
  return { skill: s, data: (s.data ?? {}) as MontageStyleData };
}

export async function listSkillVersions(slug: string): Promise<SkillVersion[]> {
  const db = await getDb();
  const rows = await db.query(`select * from atelier.skill_versions where slug = $1 order by version desc limit 100`, [slug]);
  return rows.map(toVersion);
}

/** Contenu de la version du dépôt (pour comparer avant de récupérer une mise à jour). */
export function getRepoVersion(slug: string): BundledSkill | null {
  return BUNDLED_SKILLS.find((b) => b.slug === slug) ?? null;
}

/**
 * Index compact pour le prompt système de l'agent : un skill par ligne, comme la liste des
 * skills de Claude. L'agent lit le contenu complet avec l'outil read_skill.
 */
export async function skillsIndex(): Promise<string> {
  const skills = await listSkills();
  if (skills.length === 0) return "Aucun skill pour le moment.";
  return skills.map((s) => `- ${s.slug} (${SKILL_KIND_LABEL[s.kind]}) — ${s.name} : ${s.description}`).join("\n");
}

// ---------------------------------------------------------------------------------------------
// Écriture

export function slugify(input: string): string {
  return input
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
}

export interface SkillInput {
  slug?: string;
  kind: SkillKind;
  name: string;
  description: string;
  body?: string;
  data?: Record<string, unknown> | null;
  files?: Record<string, string>;
  referenceAssetIds?: string[];
}

export async function createSkill(input: SkillInput, actor: string | null): Promise<Skill> {
  await ensureSkillsSynced();
  if (!SKILL_KINDS.includes(input.kind)) throw badRequest("Type de skill inconnu.");
  const name = input.name.trim();
  if (!name) throw badRequest("Le skill doit avoir un nom.");
  let slug = slugify(input.slug || name);
  if (slug.length < 2) throw badRequest("Nom de skill trop court.");
  const db = await getDb();
  const skill = await db.tx(async (t) => {
    let i = 2;
    const base = slug;
    while (await t.one(`select 1 as x from atelier.skills where slug = $1`, [slug])) slug = `${base}-${i++}`;
    const r = await t.one(
      `insert into atelier.skills (slug, kind, name, description, body, data, files, reference_asset_ids, source, version, app_edited, updated_by)
       values ($1, $2, $3, $4, $5, $6::jsonb, $7::jsonb, $8::uuid[], 'app', 1, true, $9) returning *`,
      [slug, input.kind, name, input.description.trim(), input.body ?? "", input.data ? JSON.stringify(input.data) : null, JSON.stringify(input.files ?? {}), input.referenceAssetIds ?? [], actor],
    );
    const s = toSkill(r!);
    await insertVersion(t, s, "Création", actor);
    return s;
  });
  await logActivity({ actor, verb: "a créé le skill", objectType: "system", objectId: skill.slug, summary: skill.name });
  return skill;
}

export interface SkillPatch {
  kind?: SkillKind;
  name?: string;
  description?: string;
  body?: string;
  data?: Record<string, unknown> | null;
  files?: Record<string, string>;
  referenceAssetIds?: string[];
  enabled?: boolean;
}

/** Modifie un skill et enregistre une nouvelle version. `note` résume le changement. */
export async function updateSkill(slug: string, patch: SkillPatch, actor: string | null, note?: string | null): Promise<Skill> {
  await ensureSkillsSynced();
  if (patch.kind && !SKILL_KINDS.includes(patch.kind)) throw badRequest("Type de skill inconnu.");
  if (patch.name !== undefined && !patch.name.trim()) throw badRequest("Le skill doit avoir un nom.");
  const db = await getDb();
  const contentChanged = ["kind", "name", "description", "body", "data", "files", "referenceAssetIds"].some((k) => (patch as Record<string, unknown>)[k] !== undefined);
  const skill = await db.tx(async (t) => {
    const cur = await t.one(`select * from atelier.skills where slug = $1 for update`, [slug]);
    if (!cur) throw notFound("Skill");
    const c = toSkill(cur);
    const next = {
      kind: patch.kind ?? c.kind,
      name: patch.name?.trim() ?? c.name,
      description: patch.description?.trim() ?? c.description,
      body: patch.body ?? c.body,
      data: patch.data !== undefined ? patch.data : c.data,
      files: patch.files ?? c.files,
      referenceAssetIds: patch.referenceAssetIds ?? c.referenceAssetIds,
      enabled: patch.enabled ?? c.enabled,
    };
    const r = await t.one(
      `update atelier.skills set kind = $2, name = $3, description = $4, body = $5, data = $6::jsonb, files = $7::jsonb,
         reference_asset_ids = $8::uuid[], enabled = $9, version = version + $10, app_edited = $11,
         updated_at = now(), updated_by = $12
       where slug = $1 returning *`,
      [
        slug,
        next.kind,
        next.name,
        next.description,
        next.body,
        next.data ? JSON.stringify(next.data) : null,
        JSON.stringify(next.files),
        next.referenceAssetIds,
        next.enabled,
        contentChanged ? 1 : 0,
        // Un skill du dépôt n'est « modifié » que si son contenu diffère de la version du dépôt.
        c.source === "repo" ? skillContentHash(next) !== (cur.repo_hash as string | null) : true,
        actor,
      ],
    );
    const s = toSkill(r!);
    if (contentChanged) await insertVersion(t, s, note ?? null, actor);
    return s;
  });
  await logActivity({
    actor,
    verb: contentChanged ? "a amélioré le skill" : patch.enabled === false ? "a désactivé le skill" : "a activé le skill",
    objectType: "system",
    objectId: slug,
    summary: note ? `${skill.name} — ${note}` : skill.name,
  });
  return skill;
}

/** Revient au contenu d'une version précédente (en créant une nouvelle version). */
export async function revertSkill(slug: string, version: number, actor: string | null): Promise<Skill> {
  const db = await getDb();
  const v = await db.one(`select * from atelier.skill_versions where slug = $1 and version = $2`, [slug, version]);
  if (!v) throw notFound("Version");
  const ver = toVersion(v);
  return updateSkill(
    slug,
    { name: ver.name, description: ver.description, body: ver.body, data: ver.data, files: ver.files, referenceAssetIds: ver.referenceAssetIds },
    actor,
    `Retour à la version ${version}`,
  );
}

/** Remplace le contenu par la version du dépôt (abandonne les modifications faites dans l'Atelier). */
export async function resetSkillToRepo(slug: string, actor: string | null): Promise<Skill> {
  const b = getRepoVersion(slug);
  if (!b) throw new HttpError(409, "no_repo_version", "Ce skill n'existe pas dans le dépôt.");
  const db = await getDb();
  const skill = await db.tx(async (t) => {
    const cur = await t.one(`select version from atelier.skills where slug = $1 for update`, [slug]);
    if (!cur) throw notFound("Skill");
    const s = await applyBundled(t, b, num(cur.version) + 1, actor);
    await insertVersion(t, s, "Version du dépôt récupérée", actor);
    return s;
  });
  await logActivity({ actor, verb: "a récupéré la version du dépôt du skill", objectType: "system", objectId: slug, summary: skill.name });
  return skill;
}

/** Supprime un skill créé dans l'Atelier (ceux du dépôt se désactivent). */
export async function deleteSkill(slug: string, actor: string | null): Promise<void> {
  const s = await requireSkill(slug);
  if (s.source === "repo") throw new HttpError(409, "repo_skill", "Ce skill vient du dépôt : désactivez-le plutôt que de le supprimer.");
  const db = await getDb();
  await db.query(`delete from atelier.skills where slug = $1`, [slug]);
  await logActivity({ actor, verb: "a supprimé le skill", objectType: "system", objectId: slug, summary: s.name });
}

// ---------------------------------------------------------------------------------------------
// Export vers le dépôt (scripts/pull-skills.mjs)

function foldDescription(text: string): string {
  const words = text.replace(/\s+/g, " ").trim().split(" ");
  const lines: string[] = [];
  let cur = "";
  for (const w of words) {
    if ((cur + " " + w).trim().length > 92) {
      lines.push(cur);
      cur = w;
    } else cur = (cur + " " + w).trim();
  }
  if (cur) lines.push(cur);
  return lines.map((l) => `  ${l}`).join("\n");
}

/** Fichiers d'un skill au format du dépôt (SKILL.md, data.json, annexes). */
export function skillToFiles(s: Pick<Skill, "kind" | "name" | "description" | "body" | "data" | "files">): Record<string, string> {
  const md = `---\nname: ${s.name.replace(/\n/g, " ")}\ndescription: >\n${foldDescription(s.description)}\nkind: ${s.kind}\n---\n\n${s.body.trim()}\n`;
  const out: Record<string, string> = { "SKILL.md": md };
  if (s.data) out["data.json"] = `${JSON.stringify(s.data, null, 2)}\n`;
  for (const [name, content] of Object.entries(s.files)) if (name !== "SKILL.md" && name !== "data.json") out[name] = content;
  return out;
}

export async function exportSkills(): Promise<{ slug: string; source: Skill["source"]; version: number; enabled: boolean; files: Record<string, string> }[]> {
  const skills = await listSkills({ includeDisabled: true });
  return skills.map((s) => ({ slug: s.slug, source: s.source, version: s.version, enabled: s.enabled, files: skillToFiles(s) }));
}
