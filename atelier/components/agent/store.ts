"use client";

import { useSyncExternalStore } from "react";
import { api, errorMessage } from "@/lib/client/api";
import { emitRefresh } from "@/lib/client/refresh";
import { streamTurn, TurnError, type TurnBody } from "@/components/agent/stream";
import type { DisplayMessage, DisplayTool } from "@/lib/server/agent/display-types";
import type { AgentScreenContext, AgentStreamEvent, AgentThread, PendingAction, RefreshScope } from "@/lib/shared/types";

/**
 * État de la conversation avec l'agent, partagé par le panneau et la page /agent (un seul fil
 * actif : on peut passer de l'un à l'autre sans rien perdre). Petit magasin externe lu avec
 * useSyncExternalStore.
 */

export interface TurnErrorState {
  message: string;
  /** La dernière demande peut être relancée sans la retaper. */
  canRetry: boolean;
}

export interface AgentState {
  threadId: string | null;
  title: string | null;
  messages: DisplayMessage[];
  status: "idle" | "loading" | "streaming";
  loadError: string | null;
  turnError: TurnErrorState | null;
  threads: AgentThread[] | null;
  threadsError: string | null;
  /** null = inconnu (pas encore vérifié). */
  aiConfigured: boolean | null;
  /** Ne pas joindre le contexte de l'écran aux messages. */
  detached: boolean;
  /** Décisions en cours sur des cartes de confirmation. */
  deciding: Record<string, "confirm" | "cancel">;
}

const initial: AgentState = {
  threadId: null,
  title: null,
  messages: [],
  status: "idle",
  loadError: null,
  turnError: null,
  threads: null,
  threadsError: null,
  aiConfigured: null,
  detached: false,
  deciding: {},
};

let state: AgentState = initial;
const listeners = new Set<() => void>();
let controller: AbortController | null = null;
let localSeq = 0;
/**
 * Dernier état de la réponse en cours déjà enregistré côté serveur (à chaque fin d'outils).
 * Sur une erreur, ce qui a été affiché après n'est pas conservé : on revient à cet état pour
 * que l'écran ressemble à ce que l'on retrouvera en rouvrant la conversation.
 */
let committed: DisplayMessage | null = null;
/** Messages de suivi à envoyer dès que l'agent a fini de répondre. */
const queue: { text: string; actionId: string; screen: AgentScreenContext | null }[] = [];

function set(patch: Partial<AgentState> | ((s: AgentState) => Partial<AgentState>)) {
  const p = typeof patch === "function" ? patch(state) : patch;
  state = { ...state, ...p };
  for (const l of listeners) l();
}

function subscribe(l: () => void) {
  listeners.add(l);
  return () => listeners.delete(l);
}

export function useAgent(): AgentState {
  return useSyncExternalStore(subscribe, () => state, () => initial);
}

export function getAgentState(): AgentState {
  return state;
}

const localId = (prefix: string) => `${prefix}-${Date.now().toString(36)}-${++localSeq}`;

/** Met à jour le dernier message de l'agent (celui qui reçoit le flux). */
function updateAssistant(fn: (m: DisplayMessage) => DisplayMessage) {
  set((s) => {
    const msgs = [...s.messages];
    for (let i = msgs.length - 1; i >= 0; i--) {
      if (msgs[i].role === "assistant") {
        msgs[i] = fn(msgs[i]);
        break;
      }
    }
    return { messages: msgs };
  });
}

function lastAssistant(): DisplayMessage | null {
  for (let i = state.messages.length - 1; i >= 0; i--) if (state.messages[i].role === "assistant") return state.messages[i];
  return null;
}

function replaceAction(action: PendingAction) {
  set((s) => ({
    messages: s.messages.map((m) => (m.actions.some((a) => a.id === action.id) ? { ...m, actions: m.actions.map((a) => (a.id === action.id ? action : a)) } : m)),
  }));
}

function onEvent(e: AgentStreamEvent) {
  switch (e.type) {
    case "thread":
      set({ threadId: e.threadId, title: e.title });
      void loadThreads();
      break;
    case "text":
      updateAssistant((m) => {
        const parts = [...(m.parts ?? [])];
        const last = parts[parts.length - 1];
        if (last && last.type === "text") parts[parts.length - 1] = { type: "text", text: last.text + e.delta };
        else parts.push({ type: "text", text: e.delta.replace(/^\n+/, "") });
        return { ...m, text: m.text + e.delta, parts };
      });
      break;
    case "tool_start":
      updateAssistant((m) => {
        const idx = m.tools.findIndex((t) => t.id === e.id);
        if (idx >= 0) {
          const tools = [...m.tools];
          tools[idx] = { ...tools[idx], label: e.label };
          return { ...m, tools };
        }
        const tool: DisplayTool = { id: e.id, name: e.name, label: e.label, ok: true, summary: "", running: true };
        return { ...m, tools: [...m.tools, tool], parts: [...(m.parts ?? []), { type: "tool", index: m.tools.length }] };
      });
      break;
    case "tool_end":
      updateAssistant((m) => {
        const idx = m.tools.findIndex((t) => t.id === e.id);
        const tools = [...m.tools];
        const done: DisplayTool = { ...(idx >= 0 ? tools[idx] : { id: e.id, name: e.name, label: e.name }), ok: e.ok, summary: e.summary, assetIds: e.assetIds, running: false };
        if (idx >= 0) tools[idx] = done;
        else tools.push(done);
        return { ...m, tools, parts: idx >= 0 ? m.parts : [...(m.parts ?? []), { type: "tool", index: tools.length - 1 }] };
      });
      committed = lastAssistant();
      break;
    case "confirm":
      updateAssistant((m) => {
        const tools = [...m.tools];
        for (let i = tools.length - 1; i >= 0; i--) {
          if (tools[i].name === e.action.tool && !tools[i].actionId) {
            tools[i] = { ...tools[i], actionId: e.action.id };
            break;
          }
        }
        return { ...m, tools, actions: [...m.actions.filter((a) => a.id !== e.action.id), e.action] };
      });
      break;
    case "refresh":
      emitRefresh(...e.scopes);
      if (e.scopes.includes("threads") || e.scopes.includes("clients")) void loadThreads();
      break;
    case "error": {
      const snapshot = committed;
      if (snapshot) updateAssistant((m) => (m.id === snapshot.id ? { ...snapshot, actions: m.actions } : m));
      set({ turnError: { message: e.message, canRetry: true } });
      break;
    }
    case "done":
      break;
  }
}

/** Retire le message de l'agent resté vide (erreur avant toute réponse). */
function dropEmptyAssistant() {
  set((s) => {
    const last = s.messages[s.messages.length - 1];
    if (last && last.role === "assistant" && !last.text.trim() && last.tools.length === 0 && last.actions.length === 0) return { messages: s.messages.slice(0, -1) };
    return {};
  });
}

async function runTurn(body: TurnBody) {
  controller = new AbortController();
  const ctrl = controller;
  const placeholder: DisplayMessage = { id: localId("a"), role: "assistant", text: "", tools: [], actions: [], parts: [], createdAt: new Date().toISOString() };
  committed = placeholder;
  set((s) => ({ status: "streaming", turnError: null, messages: [...s.messages, placeholder] }));
  try {
    await streamTurn({ ...body, threadId: state.threadId }, onEvent, ctrl.signal);
  } catch (err) {
    if (ctrl.signal.aborted) {
      updateAssistant((m) => (m.text.trim() ? { ...m, aborted: true, tools: m.tools.map((t) => (t.running ? { ...t, running: false } : t)) } : m));
    } else if (err instanceof TurnError && err.code === "not_configured") {
      set({ aiConfigured: false, turnError: null });
    } else {
      set({ turnError: { message: errorMessage(err), canRetry: !(err instanceof TurnError && err.status === 400) } });
    }
  } finally {
    if (controller === ctrl) controller = null;
    dropEmptyAssistant();
    updateAssistant((m) => (m.tools.some((t) => t.running) ? { ...m, tools: m.tools.map((t) => (t.running ? { ...t, running: false, ok: false, summary: t.summary || "Interrompu" } : t)) } : m));
    set({ status: "idle" });
    void loadThreads();
    const next = queue.shift();
    if (next) void sendMessage(next.text, next.screen, { actionId: next.actionId, note: true });
  }
}

export async function sendMessage(text: string, screen: AgentScreenContext | null, opts: { actionId?: string; note?: boolean } = {}) {
  const message = text.trim();
  if (!message) return;
  if (state.status === "streaming") {
    if (opts.actionId) queue.push({ text: message, actionId: opts.actionId, screen });
    return;
  }
  set((s) => ({ messages: [...s.messages, { id: localId("u"), role: "user", text: message, tools: [], actions: [], createdAt: new Date().toISOString(), note: opts.note }] }));
  await runTurn({ message, screen: state.detached ? null : screen, actionId: opts.actionId ?? null });
}

export async function retryTurn(screen: AgentScreenContext | null) {
  if (state.status === "streaming" || !state.threadId) return;
  await runTurn({ retry: true, screen: state.detached ? null : screen });
}

export function stopTurn() {
  controller?.abort();
}

export function newThread() {
  stopTurn();
  queue.length = 0;
  set({ threadId: null, title: null, messages: [], turnError: null, loadError: null, status: "idle" });
}

export async function openThread(id: string) {
  if (state.threadId === id && state.messages.length) return;
  stopTurn();
  queue.length = 0;
  const title = state.threads?.find((t) => t.id === id)?.title ?? null;
  set({ threadId: id, title, messages: [], status: "loading", loadError: null, turnError: null });
  try {
    const messages = await api.get<DisplayMessage[]>(`/api/agent/threads/${id}`);
    if (state.threadId !== id) return;
    set({ messages, status: "idle" });
  } catch (err) {
    if (state.threadId !== id) return;
    set({ status: "idle", loadError: errorMessage(err) });
  }
}

export async function reloadThread() {
  const id = state.threadId;
  if (!id) return;
  set({ messages: [] });
  await openThread(id);
}

export async function loadThreads() {
  try {
    const { threads } = await api.get<{ threads: AgentThread[] }>("/api/agent/threads");
    set((s) => ({ threads, threadsError: null, title: s.threadId ? threads.find((t) => t.id === s.threadId)?.title ?? s.title : s.title }));
  } catch (err) {
    set({ threadsError: errorMessage(err) });
  }
}

export async function removeThread(id: string) {
  await api.del(`/api/agent/threads/${id}`);
  if (state.threadId === id) newThread();
  set((s) => ({ threads: s.threads?.filter((t) => t.id !== id) ?? null }));
}

export async function checkHealth() {
  try {
    const h = await api.get<{ ai: boolean }>("/api/health");
    set({ aiConfigured: Boolean(h.ai) });
  } catch {
    /* hors ligne : on réessaiera à l'envoi */
  }
}

export function setDetached(detached: boolean) {
  set({ detached });
}

/**
 * Confirme ou annule une carte : exécution côté serveur, rafraîchissement des vues, puis message
 * de suivi automatique pour que l'agent continue (« J'ai confirmé : … »).
 */
export async function decideAction(action: PendingAction, decision: "confirm" | "cancel", screen: AgentScreenContext | null): Promise<{ ok: boolean; message: string; refresh: RefreshScope[] }> {
  set((s) => ({ deciding: { ...s.deciding, [action.id]: decision } }));
  try {
    const out = await api.post<{ action: PendingAction; refresh: RefreshScope[] }>(`/api/agent/actions/${action.id}`, { decision });
    replaceAction(out.action);
    if (out.refresh.length) emitRefresh(...out.refresh);
    const summary = action.summary.replace(/[.\s]+$/, "");
    const follow = decision === "confirm" ? `J'ai confirmé : ${summary}.` : `J'ai annulé : ${summary}.`;
    void sendMessage(follow, screen, { actionId: action.id, note: true });
    const result = out.action.result as { summary?: string; error?: string } | null;
    return { ok: out.action.status !== "failed", message: out.action.status === "failed" ? result?.error ?? "Échec de l'action." : result?.summary ?? (decision === "confirm" ? "Fait" : "Annulé"), refresh: out.refresh };
  } catch (err) {
    // Déjà traitée ou expirée : on relit l'état réel.
    try {
      replaceAction(await api.get<PendingAction>(`/api/agent/actions/${action.id}`));
    } catch {
      /* ignoré */
    }
    return { ok: false, message: errorMessage(err), refresh: [] };
  } finally {
    set((s) => {
      const d = { ...s.deciding };
      delete d[action.id];
      return { deciding: d };
    });
  }
}
