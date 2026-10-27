"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { useResource } from "@/lib/client/use-resource";
import type { AgentScreenContext, Folder } from "@/lib/shared/types";

interface ShellState {
  actor: string | null;
  team: string[];
  /** Panneau de l'agent ouvert à droite. */
  agentOpen: boolean;
  setAgentOpen: (open: boolean) => void;
  toggleAgent: () => void;
  /** Envoie un message à l'agent depuis n'importe quel écran (ouvre le panneau). */
  askAgent: (message: string) => void;
  /** Consommé par le panneau de l'agent. */
  pendingPrompt: string | null;
  consumePrompt: () => string | null;
  /** Ce que l'écran courant montre (dossier, sélection, montage…), transmis à l'agent. */
  screen: AgentScreenContext;
  setScreen: (ctx: AgentScreenContext) => void;
  folders: Folder[];
  reloadFolders: () => Promise<void>;
  sidebarOpen: boolean;
  setSidebarOpen: (open: boolean) => void;
}

const Ctx = createContext<ShellState | null>(null);

export function ShellProvider({ actor, team, children }: { actor: string | null; team: string[]; children: React.ReactNode }) {
  const [agentOpen, setAgentOpenState] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [screen, setScreen] = useState<AgentScreenContext>({ page: "tableau-de-bord" });
  const [pendingPrompt, setPendingPrompt] = useState<string | null>(null);
  const promptRef = useRef<string | null>(null);
  const folders = useResource<{ folders: Folder[] }>("/api/folders", ["folders", "assets"]);

  useEffect(() => {
    try {
      if (window.localStorage.getItem("atelier:agent-open") === "1" && window.innerWidth >= 1280) setAgentOpenState(true);
    } catch {
      /* stockage indisponible */
    }
  }, []);

  const setAgentOpen = useCallback((open: boolean) => {
    setAgentOpenState(open);
    try {
      window.localStorage.setItem("atelier:agent-open", open ? "1" : "0");
    } catch {
      /* stockage indisponible */
    }
  }, []);

  const toggleAgent = useCallback(() => setAgentOpen(!agentOpen), [agentOpen, setAgentOpen]);

  const askAgent = useCallback(
    (message: string) => {
      promptRef.current = message;
      setPendingPrompt(message);
      setAgentOpen(true);
    },
    [setAgentOpen],
  );

  const consumePrompt = useCallback(() => {
    const p = promptRef.current;
    promptRef.current = null;
    setPendingPrompt(null);
    return p;
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "j") {
        e.preventDefault();
        setAgentOpen(!agentOpen);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [agentOpen, setAgentOpen]);

  const value = useMemo<ShellState>(
    () => ({
      actor,
      team,
      agentOpen,
      setAgentOpen,
      toggleAgent,
      askAgent,
      pendingPrompt,
      consumePrompt,
      screen,
      setScreen,
      folders: folders.data?.folders ?? [],
      reloadFolders: folders.reload,
      sidebarOpen,
      setSidebarOpen,
    }),
    [actor, team, agentOpen, setAgentOpen, toggleAgent, askAgent, pendingPrompt, consumePrompt, screen, folders.data, folders.reload, sidebarOpen],
  );
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useShell(): ShellState {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useShell doit être utilisé dans <ShellProvider>");
  return ctx;
}

/** À appeler dans chaque page pour dire à l'agent ce qui est à l'écran. */
export function useScreenContext(ctx: AgentScreenContext) {
  const { setScreen } = useShell();
  const key = JSON.stringify(ctx);
  useEffect(() => {
    setScreen(JSON.parse(key) as AgentScreenContext);
  }, [key, setScreen]);
}
