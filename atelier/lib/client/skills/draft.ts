import { sameJson } from "@/lib/client/skills/diff";
import { fieldLabel } from "@/lib/client/skills/montage-style";
import type { Skill } from "@/lib/shared/types";

/** Ce que l'on modifie dans l'éditeur avant d'enregistrer (une version par enregistrement). */
export interface SkillDraft {
  name: string;
  description: string;
  body: string;
  data: Record<string, unknown> | null;
  files: Record<string, string>;
  referenceAssetIds: string[];
}

export function draftFromSkill(s: Pick<Skill, keyof SkillDraft>): SkillDraft {
  return { name: s.name, description: s.description, body: s.body, data: s.data, files: { ...s.files }, referenceAssetIds: [...s.referenceAssetIds] };
}

/** Champs modifiés, prêts pour PATCH /api/skills/[slug]. */
export function draftPatch(saved: SkillDraft, draft: SkillDraft): Partial<SkillDraft> {
  const patch: Partial<SkillDraft> = {};
  if (draft.name.trim() !== saved.name) patch.name = draft.name.trim();
  if (draft.description.trim() !== saved.description) patch.description = draft.description.trim();
  if (draft.body !== saved.body) patch.body = draft.body;
  if (!sameJson(draft.data, saved.data)) patch.data = draft.data;
  if (!sameJson(draft.files, saved.files)) patch.files = draft.files;
  if (draft.referenceAssetIds.join(",") !== saved.referenceAssetIds.join(",")) patch.referenceAssetIds = draft.referenceAssetIds;
  return patch;
}

export function isDirty(saved: SkillDraft, draft: SkillDraft): boolean {
  return Object.keys(draftPatch(saved, draft)).length > 0;
}

/**
 * Le skill a changé ailleurs pendant l'édition : on repart de la nouvelle version et on y
 * réapplique seulement ce que la personne a modifié (champ par champ, et paramètre par
 * paramètre pour les données), pour ne pas écraser le travail de l'agent ou d'une collègue.
 */
export function rebaseDraft(oldBase: SkillDraft, draft: SkillDraft, newBase: SkillDraft): SkillDraft {
  const out: SkillDraft = { ...newBase, files: { ...newBase.files }, referenceAssetIds: [...newBase.referenceAssetIds] };
  if (draft.name.trim() !== oldBase.name) out.name = draft.name;
  if (draft.description.trim() !== oldBase.description) out.description = draft.description;
  if (draft.body !== oldBase.body) out.body = draft.body;
  if (draft.referenceAssetIds.join(",") !== oldBase.referenceAssetIds.join(",")) out.referenceAssetIds = [...draft.referenceAssetIds];
  if (!sameJson(draft.files, oldBase.files)) {
    for (const k of new Set([...Object.keys(oldBase.files), ...Object.keys(draft.files)])) {
      if (draft.files[k] === oldBase.files[k]) continue;
      if (draft.files[k] === undefined) delete out.files[k];
      else out.files[k] = draft.files[k];
    }
  }
  if (!sameJson(draft.data, oldBase.data)) {
    if (!draft.data || !newBase.data || !oldBase.data) out.data = draft.data;
    else {
      const merged: Record<string, unknown> = { ...newBase.data };
      for (const k of new Set([...Object.keys(oldBase.data), ...Object.keys(draft.data)])) {
        if (sameJson(draft.data[k], oldBase.data[k])) continue;
        if (draft.data[k] === undefined) delete merged[k];
        else merged[k] = draft.data[k];
      }
      out.data = merged;
    }
  }
  return out;
}

function listFr(items: string[]): string {
  if (items.length <= 1) return items.join("");
  return `${items.slice(0, -1).join(", ")} et ${items[items.length - 1]}`;
}

/** Résumé automatique d'un changement (« Modifié : rythme, couleurs et déroulé »), utilisé si aucune note n'est écrite. */
export function describeChanges(saved: SkillDraft, draft: SkillDraft): string {
  const patch = draftPatch(saved, draft);
  const parts: string[] = [];
  if (patch.name !== undefined) parts.push("nom");
  if (patch.description !== undefined) parts.push("description");
  if (patch.body !== undefined) parts.push("consignes");
  if (patch.data !== undefined) {
    const a = (saved.data ?? {}) as Record<string, unknown>;
    const b = (draft.data ?? {}) as Record<string, unknown>;
    const keys = [...new Set([...Object.keys(a), ...Object.keys(b)])].filter((k) => !sameJson(a[k], b[k]));
    const labels = keys.map((k) => fieldLabel(k).toLowerCase());
    if (labels.length > 0 && labels.length <= 4) parts.push(...labels);
    else parts.push("paramètres");
  }
  if (patch.files !== undefined) {
    const before = new Set(Object.keys(saved.files));
    const after = new Set(Object.keys(draft.files));
    const added = [...after].filter((f) => !before.has(f));
    const removed = [...before].filter((f) => !after.has(f));
    const edited = [...after].filter((f) => before.has(f) && saved.files[f] !== draft.files[f]);
    if (added.length) parts.push(`ajout de ${listFr(added)}`);
    if (removed.length) parts.push(`retrait de ${listFr(removed)}`);
    if (edited.length) parts.push(listFr(edited));
  }
  if (patch.referenceAssetIds !== undefined) parts.push("médias de référence");
  if (parts.length === 0) return "";
  return `Modifié : ${listFr(parts)}`.slice(0, 300);
}

/** Même règle que slugify() côté serveur : l'identifiant affiché avant création. */
export function slugify(input: string): string {
  return input
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
}

/** Remplace le titre principal (« # Ancien nom ») des consignes copiées depuis un autre skill. */
export function retitleBody(body: string, oldName: string, newName: string): string {
  const lines = body.split("\n");
  const idx = lines.findIndex((l) => l.trim() !== "");
  if (idx >= 0 && /^#\s+/.test(lines[idx]) && lines[idx].replace(/^#\s+/, "").trim().toLowerCase() === oldName.trim().toLowerCase()) {
    lines[idx] = `# ${newName.trim()}`;
    return lines.join("\n");
  }
  return body;
}

// ---------------------------------------------------------------------------------------------
// Fichiers annexes

export const ANNEX_EXTENSIONS = [".md", ".html", ".css", ".txt", ".json"];
const RESERVED = new Set(["skill.md", "data.json"]);

/** Message d'erreur pour un nom de fichier annexe, ou null s'il est valide. */
export function annexNameError(name: string, existing: string[]): string | null {
  const n = name.trim();
  if (!n) return "Donnez un nom au fichier.";
  if (n.length > 60) return "60 caractères au maximum.";
  if (!/^[A-Za-z0-9][A-Za-z0-9.-]*$/.test(n)) return "Lettres sans accent, chiffres, tirets et points uniquement (ex. references.md).";
  const ext = n.slice(n.lastIndexOf(".")).toLowerCase();
  if (!n.includes(".") || !ANNEX_EXTENSIONS.includes(ext)) return `Terminez par ${ANNEX_EXTENSIONS.join(", ")}.`;
  if (RESERVED.has(n.toLowerCase())) return "Ce nom est réservé (SKILL.md et data.json sont gérés par l'éditeur).";
  if (existing.some((e) => e.toLowerCase() === n.toLowerCase())) return "Un fichier porte déjà ce nom.";
  return null;
}

export function fileKind(name: string): string {
  const ext = name.slice(name.lastIndexOf(".") + 1).toLowerCase();
  return ({ md: "Markdown", html: "HTML", css: "CSS", txt: "Texte", json: "JSON", svg: "SVG" } as Record<string, string>)[ext] ?? "Texte";
}
