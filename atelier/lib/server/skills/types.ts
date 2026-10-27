import type { SkillKind } from "@/lib/shared/types";

/** Skill tel qu'écrit dans le dépôt (atelier/skills/<slug>/), embarqué au build. */
export interface BundledSkill {
  slug: string;
  kind: SkillKind;
  name: string;
  description: string;
  body: string;
  data: Record<string, unknown> | null;
  files: Record<string, string>;
  /** Empreinte du contenu, pour savoir si le dépôt a changé depuis l'import. */
  hash: string;
}
