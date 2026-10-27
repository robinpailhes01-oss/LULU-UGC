"use client";

/**
 * STUB (fondation) — remplacé par le module Agent.
 * Contrat : panneau latéral droit (≈ 400 px, plein écran sur mobile), toujours monté pour garder
 * la conversation ; `open` contrôle seulement l'affichage. Lit useShell() : screen, pendingPrompt,
 * consumePrompt, setAgentOpen.
 */
export function AgentPanel({ open }: { open: boolean }) {
  if (!open) return null;
  return <aside className="hidden w-[400px] shrink-0 border-l border-line bg-surface xl:block" aria-label="Agent" />;
}
