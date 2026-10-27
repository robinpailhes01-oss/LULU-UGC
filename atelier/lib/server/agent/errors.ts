import "server-only";
import Anthropic from "@anthropic-ai/sdk";
import { HttpError } from "@/lib/server/http";

/**
 * Erreurs de l'API Claude → messages français affichables. Le SDK a déjà réessayé seul les
 * erreurs passagères (connexion, 408, 409, 429, 5xx : maxRetries du client partagé).
 * Ordre : du plus précis au plus général (toutes les classes héritent d'APIError).
 */
export function describeAiError(err: unknown): { message: string; retryable: boolean; status: number | null } {
  if (err instanceof HttpError) return { message: err.message, retryable: false, status: err.status };
  if (err instanceof Anthropic.APIUserAbortError) return { message: "Réponse interrompue.", retryable: true, status: null };
  if (err instanceof Anthropic.APIConnectionTimeoutError) return { message: "Claude met trop de temps à répondre. Réessayez dans un instant.", retryable: true, status: null };
  if (err instanceof Anthropic.APIConnectionError) return { message: "Connexion à Claude impossible. Vérifiez la connexion et réessayez.", retryable: true, status: null };
  if (err instanceof Anthropic.RateLimitError) return { message: "Trop de demandes envoyées à Claude en ce moment. Réessayez dans une minute.", retryable: true, status: 429 };
  if (err instanceof Anthropic.AuthenticationError) return { message: "Clé Claude refusée : vérifiez ANTHROPIC_API_KEY dans les réglages de déploiement.", retryable: false, status: 401 };
  if (err instanceof Anthropic.PermissionDeniedError) return { message: "Cette clé Claude n'a pas accès au modèle demandé (ATELIER_MODEL).", retryable: false, status: 403 };
  if (err instanceof Anthropic.NotFoundError) return { message: "Modèle Claude introuvable : vérifiez ATELIER_MODEL.", retryable: false, status: 404 };
  if (err instanceof Anthropic.BadRequestError) return { message: `Claude a refusé la requête : ${shortApiMessage(err)}`, retryable: false, status: 400 };
  if (err instanceof Anthropic.UnprocessableEntityError) return { message: `Requête illisible pour Claude : ${shortApiMessage(err)}`, retryable: false, status: 422 };
  if (err instanceof Anthropic.InternalServerError) return { message: "Claude est surchargé ou indisponible pour le moment. Réessayez dans un instant.", retryable: true, status: err.status ?? 500 };
  if (err instanceof Anthropic.APIError) {
    // Erreur reçue en cours de flux (ex. « overloaded_error ») : pas de statut HTTP.
    const type = (err.error as { error?: { type?: string } } | undefined)?.error?.type;
    if (type === "overloaded_error") return { message: "Claude est surchargé pour le moment. Réessayez dans un instant.", retryable: true, status: null };
    return { message: `Erreur de Claude${err.status ? ` (${err.status})` : ""}. Réessayez.`, retryable: true, status: err.status ?? null };
  }
  if (err instanceof Anthropic.AnthropicError) return { message: "Réponse de Claude illisible. Réessayez.", retryable: true, status: null };
  return { message: err instanceof Error ? err.message : "Erreur inattendue de l'agent.", retryable: false, status: null };
}

function shortApiMessage(err: InstanceType<typeof Anthropic.APIError>): string {
  const inner = (err.error as { error?: { message?: string } } | undefined)?.error?.message;
  return (inner ?? err.message ?? "").slice(0, 240);
}

/** Message d'erreur d'un service, rendu lisible (les modules pas encore livrés lèvent « non implémenté »). */
export function serviceErrorMessage(err: unknown): string {
  if (err instanceof HttpError) return err.message;
  const msg = err instanceof Error ? err.message : String(err);
  const m = /^(\w+) : non implémenté$/.exec(msg);
  if (m) return `Cette fonction de l'Atelier n'est pas encore disponible (${m[1]}).`;
  return msg || "Erreur inattendue.";
}
