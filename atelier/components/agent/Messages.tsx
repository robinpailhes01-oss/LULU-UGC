"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { AlertTriangle, CalendarClock, CalendarX2, Check, CircleSlash, Loader2, RotateCcw, Trash2, X } from "lucide-react";
import { frenchSpaces, Markdown } from "@/components/agent/Markdown";
import { decideAction, useAgent } from "@/components/agent/store";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { cx } from "@/components/ui/cx";
import { useToast } from "@/components/ui/Toast";
import { api } from "@/lib/client/api";
import type { DisplayMessage, DisplayTool } from "@/lib/server/agent/display-types";
import type { AgentScreenContext, Asset, PendingAction } from "@/lib/shared/types";

// ---------------------------------------------------------------------------------------------
// Message de la personne

export function UserMessage({ message }: { message: DisplayMessage }) {
  if (message.note) {
    const cancelled = /^J'ai annulé/.test(message.text);
    return (
      <div className="flex justify-center px-2">
        <p className="inline-flex max-w-full items-center gap-1.5 rounded-full bg-hover px-3 py-1 text-[12px] text-muted">
          {cancelled ? <X className="h-3.5 w-3.5 shrink-0" aria-hidden /> : <Check className="h-3.5 w-3.5 shrink-0 text-olive" aria-hidden />}
          <span className="truncate" title={message.text}>{frenchSpaces(message.text)}</span>
        </p>
      </div>
    );
  }
  return (
    <div className="flex justify-end pl-10">
      <p className="max-w-full whitespace-pre-wrap break-words rounded-2xl rounded-br-md bg-sunken px-3.5 py-2 text-[14px] leading-relaxed text-ink">{message.text}</p>
    </div>
  );
}

// ---------------------------------------------------------------------------------------------
// Activité des outils

function ToolChip({ tool }: { tool: DisplayTool }) {
  const text = tool.running ? `${tool.label}…` : tool.summary || tool.label;
  return (
    <span
      title={tool.running ? tool.label : `${tool.label} — ${tool.summary}`}
      className={cx(
        "inline-flex max-w-full items-center gap-1.5 rounded-full border px-2.5 py-1 text-[12.5px] leading-tight",
        tool.running ? "border-honey/40 bg-honey-soft/40 text-ink" : tool.ok ? "border-line bg-surface text-muted" : "border-terracotta/25 bg-terracotta-soft/50 text-terracotta",
      )}
    >
      {tool.running ? (
        <Loader2 className="h-3.5 w-3.5 shrink-0 animate-spin text-honey" aria-hidden />
      ) : tool.ok ? (
        <Check className="h-3.5 w-3.5 shrink-0 text-olive" aria-hidden />
      ) : (
        <AlertTriangle className="h-3.5 w-3.5 shrink-0" aria-hidden />
      )}
      <span className="sr-only">{tool.running ? "En cours : " : tool.ok ? "Terminé : " : "Erreur : "}</span>
      <span className="min-w-0 truncate">{frenchSpaces(text)}</span>
    </span>
  );
}

function Thumb({ id, size, onOpen }: { id: string; size: number; onOpen: (id: string) => void }) {
  const [src, setSrc] = useState(`/api/media/${id}/thumb`);
  const [failed, setFailed] = useState(false);
  return (
    <button
      type="button"
      onClick={() => onOpen(id)}
      aria-label="Ouvrir le dossier de ce média"
      className="relative shrink-0 overflow-hidden rounded-lg border border-line bg-sunken transition-transform duration-fast hover:-translate-y-px hover:border-line-strong"
      style={{ width: size, height: size }}
    >
      {failed ? null : (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={src}
          alt=""
          loading="lazy"
          className="h-full w-full object-cover"
          onError={() => {
            if (src.endsWith("/thumb")) setSrc(`/api/media/${id}/poster`);
            else setFailed(true);
          }}
        />
      )}
    </button>
  );
}

export function AssetStrip({ ids, max = 8, size = 46, onNavigate }: { ids: string[]; max?: number; size?: number; onNavigate?: () => void }) {
  const router = useRouter();
  const toast = useToast();
  const unique = [...new Set(ids)];
  if (unique.length === 0) return null;
  const shown = unique.slice(0, max);
  const open = async (id: string) => {
    try {
      const a = await api.get<Asset>(`/api/assets/${id}`);
      onNavigate?.();
      router.push(a.trashedAt ? "/corbeille" : a.folderId ? `/mediatheque/dossier/${a.folderId}?media=${id}` : `/mediatheque?media=${id}`);
    } catch {
      toast("Ce média n'existe plus.", { tone: "error" });
    }
  };
  return (
    <div className="flex flex-wrap gap-1.5" aria-label={`${unique.length} média${unique.length > 1 ? "s" : ""}`}>
      {shown.map((id) => (
        <Thumb key={id} id={id} size={size} onOpen={open} />
      ))}
      {unique.length > shown.length ? (
        <span className="flex items-center justify-center rounded-lg bg-sunken text-[12px] font-semibold text-muted" style={{ width: size, height: size }}>
          +{unique.length - shown.length}
        </span>
      ) : null}
    </div>
  );
}

// ---------------------------------------------------------------------------------------------
// Carte de confirmation

const ACTION_ICON: Record<string, React.ComponentType<{ className?: string }>> = { trash_assets: Trash2, schedule_post: CalendarClock, cancel_post: CalendarX2 };

export function ConfirmCard({ action, assetIds, screen, onNavigate }: { action: PendingAction; assetIds?: string[]; screen: AgentScreenContext | null; onNavigate?: () => void }) {
  const { deciding, status } = useAgent();
  const toast = useToast();
  const busy = deciding[action.id];
  const Icon = ACTION_ICON[action.tool] ?? Check;
  const result = (action.result ?? null) as { summary?: string; error?: string; expired?: boolean; message?: string } | null;
  const decide = async (d: "confirm" | "cancel") => {
    const r = await decideAction(action, d, screen);
    if (!r.ok) toast(r.message, { tone: "error" });
    else if (d === "confirm") toast(r.message);
  };
  return (
    <div className={cx("rounded-card border bg-surface p-3.5 shadow-card", action.status === "pending" ? "border-honey/45" : "border-line")} role="group" aria-label="Action à confirmer">
      <div className="flex items-start gap-2.5">
        <span className={cx("mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full", action.tool === "trash_assets" ? "bg-terracotta-soft text-terracotta" : "bg-plum-soft text-plum")}>
          <Icon className="h-3.5 w-3.5" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="label-eyebrow">{action.status === "pending" ? "À confirmer" : "Action proposée"}</p>
          <p className="mt-1 text-[13.5px] font-medium leading-snug text-ink">{frenchSpaces(action.summary)}</p>
        </div>
      </div>
      {assetIds?.length ? (
        <div className="mt-2.5 pl-[38px]">
          <AssetStrip ids={assetIds} max={6} size={40} onNavigate={onNavigate} />
        </div>
      ) : null}
      <div className="mt-3 flex flex-wrap items-center gap-2 pl-[38px]">
        {action.status === "pending" ? (
          <>
            <Button size="sm" variant="primary" loading={busy === "confirm"} disabled={Boolean(busy)} onClick={() => void decide("confirm")} icon={<Check className="h-3.5 w-3.5" />}>
              Confirmer
            </Button>
            <Button size="sm" variant="secondary" loading={busy === "cancel"} disabled={Boolean(busy)} onClick={() => void decide("cancel")}>
              Annuler
            </Button>
            {status === "streaming" ? <span className="text-[12px] text-faint">L&apos;agent termine sa réponse…</span> : null}
          </>
        ) : action.status === "executed" ? (
          <>
            <Badge tone="olive">
              <Check className="h-3 w-3" aria-hidden /> Fait
            </Badge>
            {result?.summary ? <span className="text-[12.5px] text-muted">{frenchSpaces(result.summary)}</span> : null}
          </>
        ) : action.status === "failed" ? (
          <>
            <Badge tone="terracotta">
              <AlertTriangle className="h-3 w-3" aria-hidden /> Échec
            </Badge>
            {result?.error ? <span className="text-[12.5px] text-terracotta">{result.error}</span> : null}
          </>
        ) : (
          <Badge tone="neutral">
            <CircleSlash className="h-3 w-3" aria-hidden /> {result?.expired ? "Expiré" : "Annulé"}
          </Badge>
        )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------------------------
// Réponse de l'agent

type Group = { type: "text"; text: string; key: string } | { type: "tools"; tools: DisplayTool[]; key: string };

function groupParts(m: DisplayMessage): Group[] {
  const parts = m.parts?.length ? m.parts : [...m.tools.map((_, index) => ({ type: "tool" as const, index })), ...(m.text ? [{ type: "text" as const, text: m.text }] : [])];
  const out: Group[] = [];
  parts.forEach((p, i) => {
    if (p.type === "text") {
      if (!p.text.trim()) return;
      const last = out[out.length - 1];
      if (last && last.type === "text") last.text += p.text;
      else out.push({ type: "text", text: p.text, key: `t${i}` });
    } else {
      const tool = m.tools[p.index];
      if (!tool) return;
      const last = out[out.length - 1];
      if (last && last.type === "tools") last.tools.push(tool);
      else out.push({ type: "tools", tools: [tool], key: `o${i}` });
    }
  });
  return out;
}

export function AssistantMessage({ message, streaming, screen, onNavigate }: { message: DisplayMessage; streaming: boolean; screen: AgentScreenContext | null; onNavigate?: () => void }) {
  const groups = groupParts(message);
  const running = message.tools.some((t) => t.running);
  const lastGroup = groups[groups.length - 1];
  const waiting = streaming && !running && (!lastGroup || lastGroup.type === "tools");
  return (
    <div className="space-y-2.5 pr-2">
      {groups.map((g) => {
        if (g.type === "text") return <Markdown key={g.key} text={g.text} onNavigate={onNavigate} />;
        const assetIds = [...new Set(g.tools.filter((t) => !t.actionId).flatMap((t) => t.assetIds ?? []))];
        return (
          <div key={g.key} className="space-y-2">
            <div className="flex flex-wrap gap-1.5">
              {g.tools
                .filter((t) => !t.actionId || !message.actions.some((a) => a.id === t.actionId))
                .map((t, i) => (
                  <ToolChip key={t.id ?? i} tool={t} />
                ))}
            </div>
            {assetIds.length && !g.tools.some((t) => t.running) ? <AssetStrip ids={assetIds} onNavigate={onNavigate} /> : null}
            {g.tools
              .filter((t) => t.actionId)
              .map((t) => {
                const action = message.actions.find((a) => a.id === t.actionId);
                return action ? <ConfirmCard key={action.id} action={action} assetIds={t.assetIds} screen={screen} onNavigate={onNavigate} /> : null;
              })}
          </div>
        );
      })}
      {/* Cartes sans puce associée (ne devrait pas arriver, par sécurité). */}
      {message.actions
        .filter((a) => !message.tools.some((t) => t.actionId === a.id))
        .map((a) => (
          <ConfirmCard key={a.id} action={a} screen={screen} onNavigate={onNavigate} />
        ))}
      {waiting ? <Thinking /> : null}
      {message.aborted ? <p className="text-[12px] text-faint">Réponse interrompue.</p> : null}
    </div>
  );
}

export function Thinking() {
  return (
    <div className="flex items-center gap-2 text-[13px] text-muted" role="status">
      <span className="flex gap-1" aria-hidden>
        {[0, 1, 2].map((i) => (
          <span key={i} className="h-1.5 w-1.5 animate-pulse rounded-full bg-honey" style={{ animationDelay: `${i * 180}ms` }} />
        ))}
      </span>
      Réflexion…
    </div>
  );
}

export function TurnErrorBox({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div className="flex items-start gap-2.5 rounded-xl border border-terracotta/25 bg-terracotta-soft/45 px-3.5 py-3 text-[13px] text-ink" role="alert">
      <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-terracotta" aria-hidden />
      <p className="min-w-0 flex-1 leading-snug">{message}</p>
      {onRetry ? (
        <button type="button" onClick={onRetry} className="inline-flex shrink-0 items-center gap-1 rounded-full px-2 py-0.5 text-[12.5px] font-semibold text-chestnut hover:bg-hover">
          <RotateCcw className="h-3.5 w-3.5" aria-hidden />
          Réessayer
        </button>
      ) : null}
    </div>
  );
}
