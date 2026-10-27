import "server-only";
import type { DisplayMessage, DisplayTool } from "@/lib/server/agent/display-types";
import { listThreadActions, loadMessages, presentAction } from "@/lib/server/agent/store";
import { toolLabel } from "@/lib/server/agent/tools";

/**
 * Reconstruit la conversation affichable depuis les blocs stockés :
 * - message de la personne : le texte tapé (sans le bloc <ecran>) ;
 * - réponses de l'agent : tous les tours d'un même message regroupés (texte seulement, la
 *   réflexion n'est pas affichée), puces d'outils appariées tool_use / tool_result, cartes de
 *   confirmation avec leur état à jour.
 */
export async function displayMessages(threadId: string): Promise<DisplayMessage[]> {
  const [rows, actions] = await Promise.all([loadMessages(threadId), listThreadActions(threadId)]);
  const actionById = new Map(actions.map((a) => [a.id, presentAction(a)]));
  const out: DisplayMessage[] = [];
  let current: DisplayMessage | null = null;
  const toolIndex = new Map<string, { msg: DisplayMessage; index: number }>();

  const assistant = (id: string, createdAt: string): DisplayMessage => {
    if (current) return current;
    current = { id, role: "assistant", text: "", tools: [], actions: [], parts: [], createdAt };
    out.push(current);
    return current;
  };

  for (const row of rows) {
    if (row.meta.kind === "user") {
      current = null;
      const text = row.meta.text ?? row.content.filter((b) => b.type === "text").map((b) => (b as { text: string }).text).filter((t) => !t.trimStart().startsWith("<ecran>")).join("\n");
      out.push({ id: row.id, role: "user", text, tools: [], actions: [], createdAt: row.createdAt, note: row.meta.actionId ? true : undefined });
      continue;
    }
    if (row.role === "assistant") {
      const msg = assistant(row.id, row.createdAt);
      if (row.meta.aborted) msg.aborted = true;
      for (const block of row.content) {
        if (block.type === "text" && block.text.trim()) {
          msg.text = msg.text ? `${msg.text}\n\n${block.text}` : block.text;
          msg.parts!.push({ type: "text", text: block.text });
        } else if (block.type === "tool_use") {
          const tool: DisplayTool = { id: block.id, name: block.name, label: toolLabel(block.name), ok: false, summary: "Interrompu" };
          msg.tools.push(tool);
          const index = msg.tools.length - 1;
          msg.parts!.push({ type: "tool", index });
          toolIndex.set(block.id, { msg, index });
        }
      }
      continue;
    }
    // Résultats d'outils : complètent les puces du message de l'agent en cours.
    for (const chip of row.meta.tools ?? []) {
      const ref = toolIndex.get(chip.id);
      if (!ref) continue;
      ref.msg.tools[ref.index] = { id: chip.id, name: chip.name, label: chip.label, ok: chip.ok, summary: chip.summary, assetIds: chip.assetIds, actionId: chip.actionId };
      const action = chip.actionId ? actionById.get(chip.actionId) : undefined;
      if (action && !ref.msg.actions.some((a) => a.id === action.id)) ref.msg.actions.push(action);
    }
  }
  return out.filter((m) => m.role === "user" || m.text.trim() || m.tools.length || m.actions.length);
}
