import "server-only";
import type Anthropic from "@anthropic-ai/sdk";
import { LOW_EFFORT, ONE_SHOT_BETAS } from "@/lib/server/agent/config";
import { aiModel } from "@/lib/server/ai/client";

/**
 * Titre d'une conversation. Un message court sert tel quel ; sinon un petit appel (effort bas,
 * sans outils, en parallèle de la réponse) résume la demande en quelques mots. En cas d'échec,
 * on garde les 60 premiers caractères.
 */
export function provisionalTitle(message: string): string {
  const line = message.replace(/\s+/g, " ").trim();
  if (!line) return "Nouvelle conversation";
  const cut = line.length > 60 ? `${line.slice(0, 59).replace(/\s+\S*$/, "")}…` : line;
  return cut.charAt(0).toUpperCase() + cut.slice(1);
}

export function needsGeneratedTitle(message: string): boolean {
  return message.replace(/\s+/g, " ").trim().length > 48;
}

export async function generateTitle(client: Anthropic, message: string, signal?: AbortSignal): Promise<string | null> {
  try {
    const msg = await client.beta.messages.create(
      {
        model: aiModel(),
        max_tokens: 2_000,
        betas: ONE_SHOT_BETAS,
        fallbacks: "default",
        output_config: { effort: LOW_EFFORT },
        system: "Tu donnes un titre à une conversation dans un outil de travail : 2 à 6 mots en français, comme un nom de tâche (« Tri du shooting Abric », « Reel piscine en 15 s »). Réponds uniquement par le titre, sans guillemets ni point final.",
        messages: [{ role: "user", content: `Premier message de la conversation :\n${message.slice(0, 1500)}` }],
      },
      { signal, timeout: 30_000, maxRetries: 1 },
    );
    if (msg.stop_reason === "refusal") return null;
    const text = msg.content.find((b) => b.type === "text");
    const title = text && text.type === "text" ? text.text.replace(/\s+/g, " ").trim().replace(/^["«“]\s*|\s*["»”]$/g, "").replace(/[.。]+$/, "") : "";
    return title && title.length <= 80 ? title : null;
  } catch {
    return null;
  }
}
