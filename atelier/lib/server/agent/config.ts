import "server-only";
import type { AnthropicBeta } from "@anthropic-ai/sdk/resources/beta/beta";

/**
 * Réglages des appels à Claude (vérifiés sur les types de @anthropic-ai/sdk 0.133.0).
 * Documentation : docs/agent.md (« Modèle, effort, repli »).
 */

/** Repli côté serveur sur refus de politique : `fallbacks: "default"` exige exactement cet en-tête. */
export const FALLBACK_BETA: AnthropicBeta = "server-side-fallback-2026-07-01";
/** `thinking.block_binding` (comportement explicite si l'historique relu ne correspond plus). */
export const THINKING_BINDING_BETA: AnthropicBeta = "thinking-binding-controls-2026-08-01";
/** Nettoyage serveur des anciens résultats d'outils dans les longues conversations (pas une édition d'historique). */
export const CONTEXT_MANAGEMENT_BETA: AnthropicBeta = "context-management-2025-06-27";

export const AGENT_BETAS: AnthropicBeta[] = [FALLBACK_BETA, THINKING_BINDING_BETA, CONTEXT_MANAGEMENT_BETA];
/** Appels ponctuels (analyse, légendes, titres) : seulement le repli. */
export const ONE_SHOT_BETAS: AnthropicBeta[] = [FALLBACK_BETA];

/** Effort de l'agent : constant (un changement d'effort invalide le cache des messages). */
export const AGENT_EFFORT = "medium" as const;
/** Effort des appels en lot (analyse IA) et des petits appels. */
export const LOW_EFFORT = "low" as const;

/** La réflexion compte dans max_tokens sur Claude Opus 5.5 (toujours active). */
export const AGENT_MAX_TOKENS = 32_000;
/** Requêtes à Claude au plus par message de l'utilisateur. */
export const AGENT_MAX_ITERATIONS = 15;
