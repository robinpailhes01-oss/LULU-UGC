import "server-only";
import type { BetaTool, BetaToolResultBlockParam } from "@anthropic-ai/sdk/resources/beta/messages/messages";
import { z } from "zod";
import type { ClientScopeStore } from "@/lib/server/client-scope";
import type { PendingAction, RefreshScope } from "@/lib/shared/types";

/**
 * Boîte à outils de l'agent : définition d'un outil (schéma zod unique pour le JSON Schema envoyé
 * à Claude ET la validation à l'exécution), résultat compact, et métadonnées pour l'interface.
 */

export interface ToolContext {
  actor: string | null;
  threadId: string | null;
  /** Client de la conversation (modifiable : set_conversation_client). */
  scope: ClientScopeStore;
  toolUseId: string;
  /** Met à jour le libellé de la puce d'activité pendant un outil long (« Look appliqué : 3/12 »). */
  progress: (label: string) => void;
}

export interface ToolOutcome {
  /** Résumé français affiché dans la puce (« 12 photos taguées »). */
  summary: string;
  /** Données renvoyées au modèle (JSON compact : identifiants, noms, nombres). */
  data?: unknown;
  /** Contenu personnalisé du tool_result (ex. images) ; sinon JSON de { resume, ...data }. */
  content?: Exclude<BetaToolResultBlockParam["content"], string | undefined>;
  /** Zones de l'interface à recharger. */
  refresh?: RefreshScope[];
  /** Médias à montrer en miniatures dans la conversation. */
  assetIds?: string[];
  /** Action en attente de confirmation créée par l'outil. */
  pendingAction?: PendingAction;
}

/** Préparation d'une action à confirmer : résumé explicite + entrée normalisée à exécuter plus tard. */
export interface ConfirmPlan {
  summary: string;
  /** Entrée stockée et exécutée telle quelle à la confirmation (identifiants vérifiés, date résolue…). */
  input: Record<string, unknown>;
  /** Médias concernés (miniatures sur la carte de confirmation). */
  assetIds?: string[];
}

export interface AgentToolDef<S extends z.ZodType> {
  name: string;
  /** Libellé de la puce pendant l'exécution (« Recherche dans la médiathèque »). */
  label: string;
  description: string;
  input: S;
  /** Outil ordinaire. */
  run?: (input: z.output<S>, ctx: ToolContext) => Promise<ToolOutcome>;
  /** Outil sensible : ne s'exécute qu'après confirmation dans l'interface. */
  confirm?: {
    prepare: (input: z.output<S>, ctx: ToolContext) => Promise<ConfirmPlan>;
    execute: (stored: Record<string, unknown>, actor: string | null) => Promise<ToolOutcome>;
  };
}

export interface AgentTool {
  name: string;
  label: string;
  description: string;
  input: z.ZodType;
  inputSchema: BetaTool.InputSchema;
  run?: (input: unknown, ctx: ToolContext) => Promise<ToolOutcome>;
  confirm?: {
    prepare: (input: unknown, ctx: ToolContext) => Promise<ConfirmPlan>;
    execute: (stored: Record<string, unknown>, actor: string | null) => Promise<ToolOutcome>;
  };
}

export function defineTool<S extends z.ZodType>(def: AgentToolDef<S>): AgentTool {
  if (!def.run === !def.confirm) throw new Error(`Outil ${def.name} : run ou confirm (un seul des deux).`);
  return {
    name: def.name,
    label: def.label,
    description: def.description,
    input: def.input,
    inputSchema: toInputSchema(def.input),
    run: def.run as AgentTool["run"],
    confirm: def.confirm as AgentTool["confirm"],
  };
}

/**
 * JSON Schema d'entrée, compact et déterministe : `$schema` retiré, motifs d'uuid retirés (le
 * format suffit), `additionalProperties: false` sur chaque objet sans propriétés libres.
 */
export function toInputSchema(schema: z.ZodType): BetaTool.InputSchema {
  const raw = z.toJSONSchema(schema, { io: "input", unrepresentable: "any" }) as Record<string, unknown>;
  delete raw.$schema;
  const clean = (node: unknown): unknown => {
    if (Array.isArray(node)) return node.map(clean);
    if (!node || typeof node !== "object") return node;
    const o = { ...(node as Record<string, unknown>) };
    if (o.format === "uuid") delete o.pattern;
    if (o.type === "object" && o.properties && o.additionalProperties === undefined) o.additionalProperties = false;
    for (const k of Object.keys(o)) if (k !== "enum" && k !== "required") o[k] = clean(o[k]);
    return o;
  };
  const out = clean(raw) as Record<string, unknown>;
  if (out.type !== "object") throw new Error("Le schéma d'un outil doit être un objet.");
  return out as BetaTool.InputSchema;
}

/** Message français pour une entrée invalide (renvoyé au modèle, qui corrige). */
export function describeZodError(err: z.ZodError): string {
  return err.issues
    .slice(0, 4)
    .map((i) => `${i.path.length ? i.path.join(".") : "entrée"} : ${i.message}`)
    .join(" ; ");
}

// ---------------------------------------------------------------------------------------------
// Aides de schéma et de format

export const Uuid = z.string().uuid("identifiant invalide (uuid attendu)");
export const Ids = (max: number, what = "médias") => z.array(Uuid).min(1, `au moins un identifiant de ${what}`).max(max, `${max} identifiants au plus par appel`);

export function plural(n: number, one: string, many?: string): string {
  return `${n} ${n > 1 ? many ?? `${one}s` : one}`;
}

/** « 3 photos et 1 vidéo », « 12 médias »… */
export function countKinds(assets: { kind: string }[]): string {
  const photos = assets.filter((a) => a.kind === "photo").length;
  const videos = assets.filter((a) => a.kind === "video").length;
  const audio = assets.length - photos - videos;
  if (audio === 0 && videos === 0) return plural(photos, "photo");
  if (audio === 0 && photos === 0) return plural(videos, "vidéo");
  if (audio === 0) return `${plural(photos, "photo")} et ${plural(videos, "vidéo")}`;
  return plural(assets.length, "média");
}

/** Date lisible à l'heure de Paris : « lun. 3 nov. à 18:00 ». */
export function parisDateTime(iso: string, timeZone = "Europe/Paris"): string {
  const d = new Date(iso);
  const date = new Intl.DateTimeFormat("fr-FR", { weekday: "short", day: "numeric", month: "short", timeZone }).format(d);
  const time = new Intl.DateTimeFormat("fr-FR", { hour: "2-digit", minute: "2-digit", timeZone }).format(d);
  return `${date} à ${time}`;
}
