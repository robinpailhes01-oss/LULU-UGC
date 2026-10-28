"use client";

import { ClientScopeChip } from "@/components/clients/ClientScopeChip";
import { useSearchParams } from "next/navigation";
import { Suspense, useEffect, useRef, useState } from "react";
import { MessageSquare, Plus, SquarePen, Trash2 } from "lucide-react";
import { Conversation } from "@/components/agent/Conversation";
import { useAgentScreen } from "@/components/agent/screen";
import { loadThreads, newThread, openThread, removeThread, sendMessage, useAgent } from "@/components/agent/store";
import { useScreenContext, useShell } from "@/components/shell/ShellContext";
import { Button, IconButton } from "@/components/ui/Button";
import { cx } from "@/components/ui/cx";
import { ConfirmDialog } from "@/components/ui/Dialog";
import { useMenu, type MenuEntry } from "@/components/ui/Menu";
import { useToast } from "@/components/ui/Toast";
import { errorMessage } from "@/lib/client/api";
import { formatRelative } from "@/lib/shared/format";
import type { AgentThread } from "@/lib/shared/types";

/** Page /agent : la liste des conversations à gauche, la même conversation que le panneau au centre. */
export function AgentPage() {
  return (
    <Suspense fallback={null}>
      <AgentPageInner />
    </Suspense>
  );
}

function ThreadList({ threads, activeId, error, onOpen, onDelete }: { threads: AgentThread[] | null; activeId: string | null; error: string | null; onOpen: (id: string) => void; onDelete: (t: AgentThread) => void }) {
  const { actor } = useShell();
  if (threads === null && !error)
    return (
      <div className="space-y-2 px-3 py-2" aria-label="Chargement des conversations">
        {[0, 1, 2, 3, 4].map((i) => (
          <div key={i} className="skeleton h-12 rounded-lg" />
        ))}
      </div>
    );
  if (error)
    return (
      <div className="px-4 py-3 text-[13px] text-muted">
        Historique indisponible : {error}{" "}
        <button type="button" className="font-semibold text-chestnut hover:underline" onClick={() => void loadThreads()}>
          Réessayer
        </button>
      </div>
    );
  if (!threads?.length) return <p className="px-4 py-3 text-[13px] leading-relaxed text-muted">Aucune conversation pour le moment. Elles apparaîtront ici, avec celles de l&apos;équipe.</p>;
  const firstOther = threads.findIndex((t) => Boolean(actor && t.createdBy && t.createdBy !== actor));
  return (
    <ul className="space-y-0.5 px-2 pb-4">
      {threads.map((t, i) => {
        const other = Boolean(actor && t.createdBy && t.createdBy !== actor);
        return (
          <li key={t.id} className="group relative">
            {i === firstOther && i > 0 ? <p className="label-eyebrow px-2.5 pb-1 pt-4">De l&apos;équipe</p> : null}
            <div className="relative">
              <button
                type="button"
                onClick={() => onOpen(t.id)}
                aria-current={t.id === activeId ? "true" : undefined}
                className={cx("flex w-full flex-col rounded-lg px-2.5 py-2 pr-9 text-left transition-colors", t.id === activeId ? "bg-select" : "hover:bg-hover")}
              >
                <span className={cx("truncate text-[13.5px] text-ink", t.id === activeId && "font-semibold")}>{t.title}</span>
                <span className="truncate text-[11.5px] text-faint">
                  {formatRelative(t.updatedAt)}
                  {other ? ` · ${t.createdBy}` : ""}
                </span>
              </button>
              <IconButton label={`Supprimer « ${t.title} »`} size="sm" className="absolute right-1.5 top-1/2 -translate-y-1/2 opacity-0 focus:opacity-100 group-hover:opacity-100" onClick={() => onDelete(t)}>
                <Trash2 className="h-3.5 w-3.5" />
              </IconButton>
            </div>
          </li>
        );
      })}
    </ul>
  );
}

function AgentPageInner() {
  useScreenContext({ page: "agent" });
  const st = useAgent();
  const params = useSearchParams();
  const toast = useToast();
  const menu = useMenu();
  const { pendingPrompt, consumePrompt } = useShell();
  const screen = useAgentScreen();
  const [toDelete, setToDelete] = useState<AgentThread | null>(null);
  const [deleting, setDeleting] = useState(false);
  const mobileBtn = useRef<HTMLButtonElement>(null);
  const wanted = params.get("thread");

  useEffect(() => {
    void loadThreads();
  }, []);

  useEffect(() => {
    if (wanted && wanted !== st.threadId) void openThread(wanted);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [wanted]);

  // Garde l'adresse en phase avec la conversation ouverte (lien partageable).
  useEffect(() => {
    const current = new URLSearchParams(window.location.search).get("thread");
    if ((st.threadId ?? null) !== current) window.history.replaceState(null, "", st.threadId ? `/agent?thread=${st.threadId}` : "/agent");
  }, [st.threadId]);

  useEffect(() => {
    if (!pendingPrompt) return;
    const p = consumePrompt();
    if (p) void sendMessage(p, screen);
  }, [pendingPrompt, consumePrompt, screen]);

  const confirmDelete = async () => {
    if (!toDelete) return;
    setDeleting(true);
    try {
      await removeThread(toDelete.id);
      toast("Conversation supprimée");
      setToDelete(null);
    } catch (err) {
      toast(errorMessage(err), { tone: "error" });
    } finally {
      setDeleting(false);
    }
  };

  const openMobileList = () => {
    const el = mobileBtn.current;
    if (!el) return;
    const items: MenuEntry[] = (st.threads ?? []).slice(0, 15).map((t) => ({ label: `${t.title} · ${formatRelative(t.updatedAt)}`, icon: <MessageSquare />, onSelect: () => void openThread(t.id) }));
    if (!items.length) items.push({ label: "Aucune conversation", disabled: true, onSelect: () => undefined });
    menu.openBelow(el, items, "left");
  };

  return (
    <div className="flex h-full min-h-0">
      <aside className="hidden w-72 shrink-0 flex-col border-r border-line md:flex" aria-label="Conversations">
        <div className="flex items-center justify-between gap-2 px-4 pb-3 pt-5">
          <h1 className="page-title">Agent</h1>
          <ClientScopeChip className="ml-auto mr-1 max-w-[120px]" />
          <Button size="sm" variant="secondary" icon={<Plus className="h-3.5 w-3.5" />} onClick={() => newThread()} disabled={!st.threadId && st.messages.length === 0}>
            Nouvelle
          </Button>
        </div>
        <p className="label-eyebrow px-4 pb-1.5">Conversations</p>
        <div className="min-h-0 flex-1 overflow-y-auto">
          <ThreadList threads={st.threads} activeId={st.threadId} error={st.threadsError} onOpen={(id) => void openThread(id)} onDelete={setToDelete} />
        </div>
      </aside>
      <section className="flex min-w-0 flex-1 flex-col bg-surface/40">
        <header className="flex h-12 shrink-0 items-center gap-2 border-b border-line px-4 sm:px-8">
          <h1 className="page-title text-[1.25rem] md:hidden">Agent</h1>
          <ClientScopeChip className="md:hidden" />
          <button ref={mobileBtn} type="button" onClick={openMobileList} className="ml-auto inline-flex h-8 items-center gap-1.5 rounded-full border border-line-strong bg-surface px-3 text-[13px] font-semibold text-ink md:hidden">
            <MessageSquare className="h-3.5 w-3.5" aria-hidden />
            Conversations
          </button>
          <p className="hidden min-w-0 flex-1 truncate text-[14px] font-semibold text-ink md:block">{st.title ?? "Nouvelle conversation"}</p>
          <IconButton label="Nouvelle conversation" onClick={() => newThread()} disabled={!st.threadId && st.messages.length === 0}>
            <SquarePen className="h-[18px] w-[18px]" />
          </IconButton>
        </header>
        <Conversation variant="page" autoFocusKey={st.threadId ?? "new"} />
      </section>
      <ConfirmDialog open={Boolean(toDelete)} onClose={() => setToDelete(null)} onConfirm={() => void confirmDelete()} title="Supprimer la conversation ?" confirmLabel="Supprimer" danger loading={deleting}>
        « {toDelete?.title} » sera supprimée pour toute l&apos;équipe. Les médias, montages et publications ne changent pas.
      </ConfirmDialog>
    </div>
  );
}
