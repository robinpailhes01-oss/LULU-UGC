import type { Skill, SkillKind } from "@/lib/shared/types";

/**
 * Libellés et regroupements des types de skill côté navigateur.
 * Copie de SKILL_KIND_LABEL (lib/server/services/skills.ts) : le code serveur n'est jamais
 * importé dans un composant client. À garder alignés.
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

/** Une phrase pour choisir le type à la création. */
export const SKILL_KIND_HELP: Record<SkillKind, string> = {
  montage: "Un style de Reel ou de vidéo : rythme, durées, typographies, couleurs, déroulé plan par plan.",
  voice: "Comment écrire les légendes, les hooks et les textes à l'écran.",
  brand: "Qui est June, ce que l'on promet, la direction artistique.",
  workflow: "Une méthode de travail : trier, livrer, programmer, préparer un carrousel.",
  references: "Des inspirations, avec ce que l'on en retient et ce que l'on ne copie pas.",
  retouch: "Comment retoucher les photos et quel look choisir selon la scène.",
  other: "Tout autre savoir-faire que l'agent doit connaître.",
};

export type SkillFilter = "all" | "montage" | "voice-brand" | "workflow" | "retouch" | "references" | "other";

export const SKILL_FILTERS: { id: SkillFilter; label: string; kinds: SkillKind[] | null }[] = [
  { id: "all", label: "Tout", kinds: null },
  { id: "montage", label: "Styles de montage", kinds: ["montage"] },
  { id: "voice-brand", label: "Voix & marque", kinds: ["voice", "brand"] },
  { id: "workflow", label: "Méthodes", kinds: ["workflow"] },
  { id: "retouch", label: "Retouche", kinds: ["retouch"] },
  { id: "references", label: "Références", kinds: ["references"] },
  { id: "other", label: "Autres", kinds: ["other"] },
];

export function matchesFilter(skill: Pick<Skill, "kind">, filter: SkillFilter): boolean {
  const f = SKILL_FILTERS.find((x) => x.id === filter);
  return !f?.kinds || f.kinds.includes(skill.kind);
}

/** Ton du badge de type (aucune information portée par la seule couleur : le libellé est toujours écrit). */
export const SKILL_KIND_TONE: Record<SkillKind, "chestnut" | "plum" | "olive" | "honey" | "neutral" | "terracotta"> = {
  montage: "chestnut",
  voice: "plum",
  brand: "plum",
  workflow: "olive",
  references: "honey",
  retouch: "terracotta",
  other: "neutral",
};

/** « Modifié par Ludivine il y a 2 h », « Version du dépôt, importée hier »… */
export function lastChangeLabel(skill: Pick<Skill, "source" | "appEdited" | "updatedBy" | "updatedAt">, relative: (iso: string) => string): string {
  const when = relative(skill.updatedAt);
  if (skill.updatedBy) return `Modifié par ${skill.updatedBy} ${when}`;
  if (skill.source === "repo" && !skill.appEdited) return `Version du dépôt · ${when}`;
  return `Modifié ${when}`;
}

/** Suggestions pour « Améliorer avec l'agent », selon le type. */
export const IMPROVE_SUGGESTIONS: Record<SkillKind, string[]> = {
  montage: ["rends le rythme plus lent et plus doux", "ajoute un plan de respiration avant la fin", "propose une structure pour un lieu en montagne"],
  voice: ["ajoute trois exemples de hooks", "rends les consignes plus courtes", "ajoute ce qu'il ne faut jamais écrire"],
  brand: ["clarifie les garde-fous", "résume en cinq règles simples"],
  workflow: ["rends la méthode plus courte, étape par étape", "ajoute une liste de vérification finale"],
  references: ["range les références par thème", "ajoute ce que l'on retient de chaque référence"],
  retouch: ["précise quel look choisir pour les intérieurs", "ajoute les erreurs à éviter"],
  other: ["rends les consignes plus claires", "ajoute des exemples concrets"],
};
