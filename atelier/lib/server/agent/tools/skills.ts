import "server-only";
import { z } from "zod";
import { defineTool, plural, Uuid } from "@/lib/server/agent/tool-kit";
import { getAssets } from "@/lib/server/repo/assets";
import { createSkill, findSkill, listSkills, SKILL_KIND_LABEL, SKILL_KINDS, updateSkill } from "@/lib/server/services/skills";
import type { Skill, SkillKind } from "@/lib/shared/types";

/**
 * Outils des skills : le savoir-faire de June, configuré par Robin dans le dépôt et amélioré par
 * Ludivine dans l'Atelier. Chaque modification crée une version (retour arrière dans « Skills »).
 */

const Kind = z.enum(SKILL_KINDS as [SkillKind, ...SkillKind[]]);

async function requireSkillRef(ref: string): Promise<Skill> {
  const s = await findSkill(ref);
  if (s) return s;
  const all = (await listSkills({ includeDisabled: true })).map((x) => x.slug);
  throw new Error(`Skill « ${ref} » introuvable. Skills : ${all.join(", ") || "aucun"}.`);
}

export const listSkillsTool = defineTool({
  name: "list_skills",
  label: "Lecture des skills",
  description: "Liste les skills actifs (slug, type, nom, description, version). L'index est déjà dans tes instructions : appelle-le surtout pour filtrer par type ou vérifier les versions.",
  input: z.object({ kind: Kind.optional().describe("montage, voice, brand, workflow, references, retouch ou other.") }),
  run: async (i) => {
    const skills = await listSkills({ kind: i.kind });
    return {
      summary: plural(skills.length, "skill"),
      data: { skills: skills.map((s) => ({ slug: s.slug, kind: s.kind, kind_label: SKILL_KIND_LABEL[s.kind], name: s.name, description: s.description, version: s.version, edited_in_atelier: s.appEdited || undefined })) },
    };
  },
});

export const readSkill = defineTool({
  name: "read_skill",
  label: "Lecture d'un skill",
  description:
    "Lit un skill en entier : consignes (Markdown), paramètres structurés (data, ex. le style d'un montage), noms des fichiers annexes et médias de référence. " +
    "À appeler AVANT d'agir dans son domaine (voix-june avant une légende, style de montage avant un montage, tri-shooting avant un tri, programmation avant de programmer, retouche-june avant une retouche) et avant de le modifier.",
  input: z.object({ slug: z.string().min(1).max(80).describe("Slug (ex. reel-immersion) ou nom du skill.") }),
  run: async (i) => {
    const s = await requireSkillRef(i.slug);
    const refs = await getAssets(s.referenceAssetIds);
    return {
      summary: `Skill « ${s.name} » lu (v${s.version})`,
      data: {
        slug: s.slug,
        kind: s.kind,
        name: s.name,
        description: s.description,
        version: s.version,
        enabled: s.enabled,
        edited_in_atelier: s.appEdited,
        body: s.body,
        data: s.data,
        files: Object.keys(s.files),
        file_contents: Object.fromEntries(Object.entries(s.files).filter(([, v]) => v.length <= 4000)),
        references: refs.map((a) => ({ id: a.id, name: a.name, kind: a.kind, title: a.ai?.title ?? undefined })),
        link: `/skills/${s.slug}`,
      },
      assetIds: refs.slice(0, 12).map((a) => a.id),
    };
  },
});

export const updateSkillTool = defineTool({
  name: "update_skill",
  label: "Amélioration d'un skill",
  description:
    "Modifie un skill quand l'utilisateur le demande (« rends le style immersion plus lent », « ajoute cette référence ») ou valide ta proposition. Lis-le d'abord (read_skill). " +
    "body remplace les consignes en entier (renvoie le texte complet, modifié) ; data est fusionné clé par clé (une clé à null est supprimée) ; files est fusionné (un fichier à null est supprimé). " +
    "note résume le changement en une phrase (visible dans l'historique). Chaque modification crée une version, réversible dans l'écran Skills : pas de confirmation nécessaire.",
  input: z.object({
    slug: z.string().min(1).max(80),
    note: z.string().min(3).max(240).describe("Ce qui change et pourquoi, en une phrase."),
    name: z.string().min(1).max(120).optional(),
    description: z.string().min(1).max(600).optional().describe("Quand utiliser ce skill."),
    body: z.string().max(40_000).optional().describe("Consignes complètes en Markdown (remplacent les actuelles)."),
    data: z.record(z.string(), z.unknown()).optional().describe("Paramètres à fusionner dans data (pour un style de montage : MontageStyleData)."),
    files: z.record(z.string().max(80), z.string().max(40_000).nullable()).optional().describe("Fichiers annexes à ajouter, remplacer (texte) ou supprimer (null)."),
    add_reference_asset_ids: z.array(Uuid).max(30).optional().describe("Médias de la médiathèque à ajouter comme références."),
    remove_reference_asset_ids: z.array(Uuid).max(30).optional(),
  }),
  run: async (i, ctx) => {
    const cur = await requireSkillRef(i.slug);
    const patch: Parameters<typeof updateSkill>[1] = {};
    if (i.name !== undefined) patch.name = i.name;
    if (i.description !== undefined) patch.description = i.description;
    if (i.body !== undefined) patch.body = i.body;
    if (i.data !== undefined) {
      const next: Record<string, unknown> = { ...(cur.data ?? {}) };
      for (const [k, v] of Object.entries(i.data)) {
        if (v === null) delete next[k];
        else next[k] = v;
      }
      patch.data = Object.keys(next).length ? next : null;
    }
    if (i.files !== undefined) {
      const next: Record<string, string> = { ...cur.files };
      for (const [k, v] of Object.entries(i.files)) {
        if (k === "SKILL.md" || k === "data.json") throw new Error(`« ${k} » est réservé : utilise body ou data.`);
        if (v === null) delete next[k];
        else next[k] = v;
      }
      patch.files = next;
    }
    if (i.add_reference_asset_ids?.length || i.remove_reference_asset_ids?.length) {
      const add = i.add_reference_asset_ids ?? [];
      const found = await getAssets(add);
      if (found.length !== new Set(add).size) throw new Error("Certains médias de référence sont introuvables.");
      const remove = new Set(i.remove_reference_asset_ids ?? []);
      patch.referenceAssetIds = [...new Set([...cur.referenceAssetIds, ...add])].filter((id) => !remove.has(id));
    }
    if (Object.keys(patch).length === 0) throw new Error("Rien à modifier : indique body, description, data, files ou des références.");
    const s = await updateSkill(cur.slug, patch, ctx.actor, i.note);
    const changed = Object.keys(patch)
      .map((k) => ({ name: "nom", description: "description", body: "consignes", data: "paramètres", files: "fichiers", referenceAssetIds: "références" })[k] ?? k)
      .join(", ");
    return {
      summary: `Skill « ${s.name} » amélioré : version ${s.version}, réversible dans Skills`,
      data: { slug: s.slug, name: s.name, version: s.version, previous_version: cur.version, changed, note: i.note, reversible: `Version ${s.version}, réversible dans Skills (historique des versions).`, link: `/skills/${s.slug}` },
      refresh: ["skills"],
    };
  },
});

export const createSkillTool = defineTool({
  name: "create_skill",
  label: "Création d'un skill",
  description:
    "Crée un nouveau skill dans l'Atelier (nouveau style de montage, nouvelle méthode, nouvelle référence…) quand l'utilisateur le demande. Pour un style de montage, kind = montage et data suit la forme des autres styles (lis-en un avant).",
  input: z.object({
    kind: Kind,
    name: z.string().min(2).max(120),
    description: z.string().min(10).max(600).describe("Quand l'utiliser (lu par l'agent pour choisir)."),
    body: z.string().min(1).max(40_000).describe("Consignes en Markdown."),
    data: z.record(z.string(), z.unknown()).optional(),
  }),
  run: async (i, ctx) => {
    const s = await createSkill({ kind: i.kind, name: i.name, description: i.description, body: i.body, data: i.data ?? null }, ctx.actor);
    return { summary: `Skill « ${s.name} » créé (${SKILL_KIND_LABEL[s.kind]})`, data: { slug: s.slug, name: s.name, kind: s.kind, version: s.version, link: `/skills/${s.slug}` }, refresh: ["skills"] };
  },
});

export const SKILL_TOOLS = [listSkillsTool, readSkill, updateSkillTool, createSkillTool];
