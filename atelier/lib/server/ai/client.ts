import "server-only";
import Anthropic from "@anthropic-ai/sdk";
import { env } from "@/lib/server/env";
import { notConfigured } from "@/lib/server/http";

let client: Anthropic | null = null;

/** Client Claude partagé. Lève une erreur 503 lisible si ANTHROPIC_API_KEY n'est pas défini. */
export function getAnthropic(): Anthropic {
  if (!env.ai.apiKey) throw notConfigured("L'agent n'est pas encore branché : ajoutez ANTHROPIC_API_KEY dans les variables d'environnement.");
  if (!client) client = new Anthropic({ apiKey: env.ai.apiKey, maxRetries: 3 });
  return client;
}

export function aiConfigured(): boolean {
  return Boolean(env.ai.apiKey);
}

/** Modèle utilisé partout (ATELIER_MODEL, par défaut claude-opus-5-5). */
export function aiModel(): string {
  return env.ai.model;
}
