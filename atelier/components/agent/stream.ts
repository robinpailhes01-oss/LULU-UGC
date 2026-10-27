"use client";

import type { AgentScreenContext, AgentStreamEvent } from "@/lib/shared/types";

export interface TurnBody {
  threadId?: string | null;
  message?: string;
  screen?: AgentScreenContext | null;
  actionId?: string | null;
  retry?: boolean;
}

export class TurnError extends Error {
  constructor(
    public status: number,
    public code: string,
    message: string,
  ) {
    super(message);
  }
}

/**
 * POST /api/agent et lecture du flux NDJSON : une ligne JSON par événement. Les lignes qui ne
 * commencent pas par « { » (battements de cœur « : ping ») sont ignorées. Les erreurs avant le flux
 * (clé absente, conversation occupée…) arrivent en JSON classique et lèvent TurnError.
 */
export async function streamTurn(body: TurnBody, onEvent: (e: AgentStreamEvent) => void, signal: AbortSignal): Promise<void> {
  const res = await fetch("/api/agent", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
    credentials: "same-origin",
    signal,
  });
  const type = res.headers.get("content-type") ?? "";
  if (!res.ok || !type.includes("ndjson") || !res.body) {
    if (res.status === 401) window.location.href = `/login?next=${encodeURIComponent(window.location.pathname)}`;
    const data = (await res.json().catch(() => null)) as { error?: { code?: string; message?: string } } | null;
    throw new TurnError(res.status, data?.error?.code ?? "http_error", data?.error?.message ?? `Erreur ${res.status}`);
  }
  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buf = "";
  const flush = (line: string) => {
    const l = line.trim();
    if (!l.startsWith("{")) return;
    try {
      onEvent(JSON.parse(l) as AgentStreamEvent);
    } catch {
      /* ligne illisible : ignorée */
    }
  };
  for (;;) {
    const { value, done } = await reader.read();
    if (done) break;
    buf += decoder.decode(value, { stream: true });
    let nl: number;
    while ((nl = buf.indexOf("\n")) >= 0) {
      flush(buf.slice(0, nl));
      buf = buf.slice(nl + 1);
    }
  }
  if (buf) flush(buf);
}
