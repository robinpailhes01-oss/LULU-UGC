"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { forwardRef, useCallback, useEffect, useImperativeHandle, useLayoutEffect, useRef, useState } from "react";
import { ArrowUp, Eye, EyeOff, Plug, Sparkles, Square, X } from "lucide-react";
import { AssistantMessage, TurnErrorBox, UserMessage } from "@/components/agent/Messages";
import { checkHealth, reloadThread, retryTurn, sendMessage, setDetached, stopTurn, useAgent } from "@/components/agent/store";
import { useAgentScreen, type AgentScreen } from "@/components/agent/screen";
import { useShell } from "@/components/shell/ShellContext";
import { Button } from "@/components/ui/Button";
import { cx } from "@/components/ui/cx";
import { EmptyState } from "@/components/ui/EmptyState";
import type { AgentScreenContext, Folder } from "@/lib/shared/types";

// ---------------------------------------------------------------------------------------------
// Ce que l'agent voit de l'écran

const PAGE_LABEL: [RegExp, string][] = [
  [/^\/$/, "Tableau de bord"],
  [/^\/mediatheque\/recents/, "Récents"],
  [/^\/mediatheque\/favoris/, "Favoris"],
  [/^\/mediatheque\/recherche/, "Recherche"],
  [/^\/mediatheque/, "Médiathèque"],
  [/^\/corbeille/, "Corbeille"],
  [/^\/menage/, "Ménage"],
  [/^\/montage\/.+/, "Montage"],
  [/^\/montage/, "Montages"],
  [/^\/programmation/, "Programmation"],
  [/^\/retouche/, "Retouche"],
  [/^\/skills/, "Skills"],
  [/^\/reglages/, "Réglages"],
  [/^\/agent/, "Agent"],
];

export function screenLabel(screen: AgentScreenContext, pathname: string, folders: Folder[]): string {
  const bits: string[] = [];
  if (screen.folderId) bits.push(`Dossier : ${folders.find((f) => f.id === screen.folderId)?.name ?? "ouvert"}`);
  const n = screen.selectedAssetIds?.length ?? 0;
  if (n) bits.push(`${n} sélectionné${n > 1 ? "s" : ""}`);
  if (screen.montageId) bits.push("Montage ouvert");
  if (screen.postId) bits.push("Publication ouverte");
  if (screen.skillSlug) bits.push(`Skill : ${screen.skillSlug}`);
  if (bits.length === 0) bits.push(PAGE_LABEL.find(([re]) => re.test(pathname))?.[1] ?? screen.page);
  return bits.join(" · ");
}

function ContextChip({ screen }: { screen: AgentScreen }) {
  const pathname = usePathname();
  const { folders } = useShell();
  const { detached } = useAgent();
  const label = screenLabel(screen, pathname, folders);
  if (detached)
    return (
      <div className="flex items-center gap-1.5 px-1 text-[12px] text-faint">
        <EyeOff className="h-3.5 w-3.5" aria-hidden />
        <span>Écran non joint</span>
        <button type="button" className="ml-1 rounded-full px-1.5 font-semibold text-chestnut hover:bg-hover" onClick={() => setDetached(false)}>
          Joindre l&apos;écran
        </button>
      </div>
    );
  return (
    <div className="flex min-w-0 items-center gap-1 px-1">
      <span className="inline-flex min-w-0 items-center gap-1.5 rounded-full bg-select px-2.5 py-0.5 text-[12px] font-medium text-chestnut" title="Ce que l'agent voit de votre écran">
        <Eye className="h-3.5 w-3.5 shrink-0" aria-hidden />
        <span className="sr-only">L&apos;agent voit : </span>
        <span className="truncate">{label}</span>
      </span>
      <button type="button" aria-label="Ne pas joindre l'écran" title="Ne pas joindre l'écran" className="rounded-full p-1 text-faint hover:bg-hover hover:text-ink" onClick={() => setDetached(true)}>
        <X className="h-3 w-3" />
      </button>
    </div>
  );
}

// ---------------------------------------------------------------------------------------------
// Suggestions adaptées à la page

function suggestionsFor(pathname: string, screen: AgentScreenContext): string[] {
  const selected = screen.selectedAssetIds?.length ?? 0;
  if (/^\/mediatheque|^\/corbeille/.test(pathname))
    return [selected ? "Tague ces médias et range-les dans le bon dossier" : "Trie ce dossier et tague les photos", "Trouve les plus belles photos de piscine", "Analyse les photos qui ne sont pas encore taguées"];
  if (pathname.startsWith("/menage")) return ["Propose-moi un ménage", "Trouve les doublons et garde les meilleures", "Quelles photos sont floues ?"];
  if (pathname.startsWith("/montage")) return [selected || screen.montageId ? "Fais un Reel de 15 s avec ces clips" : "Fais un Reel de 15 s avec les meilleurs clips du dernier shooting", "Propose une accroche pour ce montage", "Rends le style immersion plus lent"];
  if (pathname.startsWith("/programmation")) return ["Programme les 3 derniers Reels cette semaine à 18 h", "Qu'est-ce qui est prévu cette semaine ?", "Écris la légende de la prochaine publication"];
  if (pathname.startsWith("/skills")) return [screen.skillSlug ? "Résume ce skill et propose une amélioration" : "Quels skills utilises-tu pour un montage ?", "Rends le style immersion plus lent", "Ajoute une référence au skill Références"];
  if (pathname.startsWith("/retouche")) return ["Retouche cette photo dans le look June", "Applique le même look à toute la sélection"];
  return ["Fais le point sur la médiathèque", "Analyse les photos qui ne sont pas encore taguées", "Propose-moi un ménage"];
}

// ---------------------------------------------------------------------------------------------
// Zone de saisie

export interface ComposerHandle {
  focus: () => void;
}

const Composer = forwardRef<ComposerHandle, { screen: AgentScreen; compact?: boolean }>(function Composer({ screen, compact }, ref) {
  const { status } = useAgent();
  const [value, setValue] = useState("");
  const area = useRef<HTMLTextAreaElement>(null);
  const streaming = status === "streaming";
  useImperativeHandle(ref, () => ({ focus: () => area.current?.focus() }), []);

  useLayoutEffect(() => {
    const el = area.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 220)}px`;
  }, [value]);

  const submit = () => {
    const text = value.trim();
    if (!text || streaming) return;
    setValue("");
    void sendMessage(text, screen);
  };

  return (
    <form
      className={cx("rounded-[18px] border border-line-strong bg-surface p-1.5 shadow-card transition-shadow focus-within:border-chestnut/50 focus-within:shadow-pop")}
      onSubmit={(e) => {
        e.preventDefault();
        submit();
      }}
    >
      <ContextChip screen={screen} />
      <div className="flex items-end gap-1.5">
        <textarea
          ref={area}
          rows={1}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
              e.preventDefault();
              submit();
            }
          }}
          placeholder={streaming ? "L'agent répond…" : "Demandez à l'agent…"}
          aria-label="Message à l'agent"
          className="max-h-[220px] min-h-[40px] flex-1 resize-none bg-transparent px-2.5 py-2 text-[14px] leading-relaxed text-ink placeholder:text-faint focus:outline-none focus-visible:outline-none"
        />
        {streaming ? (
          <button
            type="button"
            onClick={stopTurn}
            className="mb-0.5 inline-flex h-9 shrink-0 items-center gap-1.5 rounded-full border border-line-strong bg-surface px-3 text-[13px] font-semibold text-ink hover:bg-hover"
          >
            <Square className="h-3 w-3 fill-current" aria-hidden />
            Arrêter
          </button>
        ) : (
          <button
            type="submit"
            disabled={!value.trim()}
            aria-label="Envoyer"
            title="Envoyer (Entrée)"
            className="mb-0.5 inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-ink text-surface transition-colors hover:bg-[#3a2f26] disabled:bg-sunken disabled:text-faint"
          >
            <ArrowUp className="h-4 w-4" />
          </button>
        )}
      </div>
      {!compact ? <p className="hidden px-2.5 pb-0.5 text-[11px] text-faint sm:block">Entrée pour envoyer · Maj + Entrée pour aller à la ligne</p> : null}
    </form>
  );
});

// ---------------------------------------------------------------------------------------------
// Conversation complète (panneau et page)

export function NotConfigured({ onNavigate }: { onNavigate?: () => void }) {
  return (
    <EmptyState
      icon={<Plug className="h-6 w-6" />}
      title="Branchez l'agent dans Réglages"
      action={
        <Link href="/reglages" onClick={onNavigate} className="inline-flex h-9 items-center rounded-full border border-line-strong bg-surface px-4 text-[13.5px] font-semibold text-ink hover:bg-hover">
          Ouvrir les réglages
        </Link>
      }
    >
      L&apos;agent, l&apos;analyse IA et les légendes ont besoin d&apos;une clé Claude. Ajoutez <code className="rounded bg-sunken px-1 text-[12px]">ANTHROPIC_API_KEY</code> aux variables d&apos;environnement, puis
      redémarrez l&apos;Atelier.
    </EmptyState>
  );
}

export function Conversation({ variant, onNavigate, autoFocusKey }: { variant: "panel" | "page"; onNavigate?: () => void; autoFocusKey?: unknown }) {
  const st = useAgent();
  const { actor } = useShell();
  const screen = useAgentScreen();
  const pathname = usePathname();
  const listRef = useRef<HTMLDivElement>(null);
  const composer = useRef<ComposerHandle>(null);
  const pinned = useRef(true);
  const screenForAgent = screen;

  useEffect(() => {
    if (st.aiConfigured === null) void checkHealth();
  }, [st.aiConfigured]);

  useEffect(() => {
    // Pas de focus automatique sur mobile : le clavier masquerait la conversation.
    if (autoFocusKey !== undefined && window.matchMedia("(min-width: 768px)").matches) composer.current?.focus();
  }, [autoFocusKey]);

  // Reste collé en bas pendant le flux, sauf si la personne remonte lire.
  const onScroll = useCallback(() => {
    const el = listRef.current;
    if (!el) return;
    pinned.current = el.scrollHeight - el.scrollTop - el.clientHeight < 80;
  }, []);
  useLayoutEffect(() => {
    const el = listRef.current;
    if (el && pinned.current) el.scrollTop = el.scrollHeight;
  }, [st.messages, st.turnError, st.status]);
  useEffect(() => {
    pinned.current = true;
  }, [st.threadId]);

  if (st.aiConfigured === false) {
    return (
      <div className="flex min-h-0 flex-1 flex-col justify-center overflow-y-auto">
        <NotConfigured onNavigate={onNavigate} />
      </div>
    );
  }

  const empty = st.messages.length === 0 && st.status !== "loading" && !st.loadError;
  const lastIndex = st.messages.length - 1;
  const suggestions = suggestionsFor(pathname, screen);
  const firstName = actor ? actor.split(/\s+/)[0] : null;

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div ref={listRef} onScroll={onScroll} className={cx("min-h-0 flex-1 overflow-y-auto", variant === "panel" ? "px-4 py-4" : "px-4 py-6 sm:px-8")}>
        <div className={cx("mx-auto flex flex-col gap-4", variant === "page" ? "max-w-3xl" : "")} role="log" aria-label="Conversation avec l'agent" aria-busy={st.status !== "idle"}>
          {st.status === "loading" ? (
            <div className="space-y-4" aria-label="Chargement de la conversation">
              <div className="skeleton ml-auto h-9 w-2/3 rounded-2xl" />
              <div className="skeleton h-4 w-11/12" />
              <div className="skeleton h-4 w-3/4" />
              <div className="skeleton h-7 w-40 rounded-full" />
              <div className="skeleton ml-auto h-9 w-1/2 rounded-2xl" />
              <div className="skeleton h-4 w-5/6" />
            </div>
          ) : null}
          {st.loadError ? <TurnErrorBox message={`Impossible d'ouvrir la conversation : ${st.loadError}`} onRetry={() => void reloadThread()} /> : null}
          {empty ? (
            <div className={cx("flex flex-col items-center text-center", variant === "panel" ? "pt-8" : "pt-16")}>
              <span className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-honey-soft text-chestnut">
                <Sparkles className="h-5 w-5" />
              </span>
              <h2 className="font-display text-[1.3rem] font-[400] leading-tight text-ink">{firstName ? `Bonjour ${firstName}, on fait quoi ?` : "On fait quoi aujourd'hui ?"}</h2>
              <p className="mt-2 max-w-[19rem] text-[13.5px] leading-relaxed text-muted">Je trie, tague, retouche, monte et programme pour vous, à partir de ce qui est à l&apos;écran et des skills de June.</p>
              <div className="mt-5 flex w-full max-w-sm flex-col gap-2">
                {suggestions.map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => void sendMessage(s, screenForAgent)}
                    className="rounded-xl border border-line bg-surface px-3.5 py-2.5 text-left text-[13.5px] text-ink shadow-[0_1px_2px_rgba(36,29,23,.05)] transition-colors hover:border-line-strong hover:bg-hover"
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
          ) : null}
          {st.messages.map((m, i) =>
            m.role === "user" ? (
              <UserMessage key={m.id} message={m} />
            ) : (
              <AssistantMessage key={m.id} message={m} streaming={st.status === "streaming" && i === lastIndex} screen={st.detached ? null : screenForAgent} onNavigate={onNavigate} />
            ),
          )}
          {st.turnError ? <TurnErrorBox message={st.turnError.message} onRetry={st.turnError.canRetry && st.threadId && st.status === "idle" ? () => void retryTurn(screenForAgent) : undefined} /> : null}
        </div>
      </div>
      <div className={cx("shrink-0 pb-3 pt-1", variant === "panel" ? "px-3" : "px-4 sm:px-8")}>
        <div className={cx("mx-auto", variant === "page" ? "max-w-3xl" : "")}>
          <Composer ref={composer} screen={screenForAgent} compact={variant === "panel"} />
        </div>
      </div>
      <span className="sr-only" aria-live="polite">
        {st.status === "streaming" ? "L'agent répond." : st.messages.length ? "Réponse terminée." : ""}
      </span>
    </div>
  );
}

export function NewThreadButton({ onClick, className }: { onClick: () => void; className?: string }) {
  return (
    <Button size="sm" variant="secondary" onClick={onClick} className={className}>
      Nouvelle conversation
    </Button>
  );
}
