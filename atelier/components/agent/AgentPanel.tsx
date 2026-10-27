"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { History, Maximize2, MessageSquare, SquarePen, Sparkles, X } from "lucide-react";
import { Conversation } from "@/components/agent/Conversation";
import { useAgentScreen } from "@/components/agent/screen";
import { loadThreads, newThread, openThread, sendMessage, useAgent } from "@/components/agent/store";
import { useShell } from "@/components/shell/ShellContext";
import { IconButton } from "@/components/ui/Button";
import { cx } from "@/components/ui/cx";
import { useMenu, type MenuEntry } from "@/components/ui/Menu";
import { formatRelative } from "@/lib/shared/format";

/**
 * Panneau de l'agent, monté en permanence par la coque (la conversation survit à la fermeture).
 * ≥ 1280 px : colonne de droite de 400 px ; en dessous : feuille par-dessus le contenu, plein
 * écran sur mobile. Sur /agent, la page plein écran prend le relais (même conversation).
 */
export function AgentPanel({ open }: { open: boolean }) {
  const pathname = usePathname();
  const router = useRouter();
  const menu = useMenu();
  const { setAgentOpen, pendingPrompt, consumePrompt } = useShell();
  const screen = useAgentScreen();
  const st = useAgent();
  const [focusKey, setFocusKey] = useState(0);
  const historyBtn = useRef<HTMLButtonElement>(null);
  const onAgentPage = pathname === "/agent" || pathname.startsWith("/agent/");
  const visible = open && !onAgentPage;

  // Demande envoyée depuis un autre écran (askAgent) : envoyée dès l'ouverture.
  useEffect(() => {
    if (!visible || !pendingPrompt) return;
    const p = consumePrompt();
    if (p) void sendMessage(p, screen);
  }, [visible, pendingPrompt, consumePrompt, screen]);

  useEffect(() => {
    if (!visible) return;
    if (st.threads === null) void loadThreads();
    setFocusKey((k) => k + 1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible]);

  const isOverlay = () => typeof window !== "undefined" && window.innerWidth < 1280;
  const close = () => setAgentOpen(false);
  const closeIfOverlay = () => {
    if (isOverlay()) close();
  };

  const openHistory = () => {
    const el = historyBtn.current;
    if (!el) return;
    const threads = (st.threads ?? []).slice(0, 12);
    const items: MenuEntry[] = threads.length
      ? threads.map((t) => ({ label: `${t.title} · ${formatRelative(t.updatedAt)}`, icon: <MessageSquare />, onSelect: () => void openThread(t.id) }))
      : [{ label: st.threadsError ? "Historique indisponible" : "Aucune conversation pour le moment", disabled: true, onSelect: () => undefined }];
    items.push("separator", { label: "Toutes les conversations", icon: <Maximize2 />, onSelect: () => router.push("/agent") });
    menu.openBelow(el, items, "right");
    void loadThreads();
  };

  return (
    <>
      {visible ? <div className="fixed inset-0 z-panel bg-night/30 xl:hidden" aria-hidden onClick={close} /> : null}
      <aside
        aria-label="Agent"
        onKeyDown={(e) => {
          if (e.key === "Escape" && isOverlay()) close();
        }}
        className={cx(
          "z-panel flex-col bg-surface",
          "fixed inset-0 sm:inset-y-0 sm:left-auto sm:right-0 sm:w-[420px] sm:border-l sm:border-line sm:shadow-pop",
          "xl:static xl:z-auto xl:w-[400px] xl:shrink-0 xl:shadow-none",
          visible ? "flex animate-fade-in" : "hidden",
        )}
      >
        <header className="flex h-14 shrink-0 items-center gap-1 border-b border-line pl-4 pr-2">
          <Sparkles className="h-4 w-4 shrink-0 text-chestnut" aria-hidden />
          <h2 className="ml-1.5 min-w-0 flex-1 truncate text-[14px] font-semibold text-ink" title={st.title ?? undefined}>
            {st.title ?? "Agent"}
          </h2>
          <IconButton label="Nouvelle conversation" onClick={() => newThread()} disabled={!st.threadId && st.messages.length === 0}>
            <SquarePen className="h-[18px] w-[18px]" />
          </IconButton>
          <IconButton ref={historyBtn} label="Historique des conversations" onClick={openHistory}>
            <History className="h-[18px] w-[18px]" />
          </IconButton>
          <Link
            href={st.threadId ? `/agent?thread=${st.threadId}` : "/agent"}
            aria-label="Ouvrir en grand"
            title="Ouvrir en grand"
            className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-muted transition-colors hover:bg-hover hover:text-ink"
          >
            <Maximize2 className="h-4 w-4" />
          </Link>
          <IconButton label="Fermer le panneau" onClick={close}>
            <X className="h-[18px] w-[18px]" />
          </IconButton>
        </header>
        <Conversation variant="panel" onNavigate={closeIfOverlay} autoFocusKey={focusKey} />
      </aside>
    </>
  );
}
