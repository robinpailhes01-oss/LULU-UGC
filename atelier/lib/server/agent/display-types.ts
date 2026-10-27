import type { AgentDisplayMessage, PendingAction } from "@/lib/shared/types";

/**
 * Message affichable enrichi (compatible avec AgentDisplayMessage) : l'ordre texte / outils du
 * tour est conservé dans `parts`, pour que la conversation rechargée ressemble à celle vécue.
 * Types purs (aucun code serveur) : importables par l'interface avec `import type`.
 */
export interface DisplayTool {
  id?: string;
  name: string;
  label: string;
  ok: boolean;
  summary: string;
  assetIds?: string[];
  /** En cours d'exécution (flux uniquement). */
  running?: boolean;
  actionId?: string;
}

export type DisplayPart = { type: "text"; text: string } | { type: "tool"; index: number };

export interface DisplayMessage extends AgentDisplayMessage {
  tools: DisplayTool[];
  actions: PendingAction[];
  parts?: DisplayPart[];
  /** Message de suivi envoyé automatiquement après une confirmation (affiché comme une note). */
  note?: boolean;
  /** Réponse interrompue par « Arrêter ». */
  aborted?: boolean;
}
