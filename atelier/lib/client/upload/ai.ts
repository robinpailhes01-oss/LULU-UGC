"use client";

import { api, ApiError } from "@/lib/client/api";

/**
 * Configuration du serveur utile à l'envoi (GET /api/health, mise en cache 10 min) :
 * - ai : analyse IA disponible ;
 * - storage : « local » (fichiers servis par l'application) ou « s3 ».
 */
export interface ServerInfo {
  ai: boolean;
  storage: "local" | "s3" | "unknown";
}

let health: { at: number; value: Promise<ServerInfo> } | null = null;

export function serverInfo(): Promise<ServerInfo> {
  if (!health || Date.now() - health.at > 10 * 60_000) {
    health = {
      at: Date.now(),
      value: api
        .get<{ ai?: boolean; storage?: string }>("/api/health")
        .then((h) => ({ ai: Boolean(h.ai), storage: h.storage === "local" || h.storage === "s3" ? h.storage : "unknown" }) as ServerInfo)
        .catch(() => ({ ai: false, storage: "unknown" }) as ServerInfo),
    };
  }
  return health.value;
}

export async function aiAvailable(): Promise<boolean> {
  return (await serverInfo()).ai;
}

/**
 * Analyse IA automatique après import : par lots de 10 médias, un lot à la fois, seulement si
 * l'IA est configurée. Sans bruit : un seul message discret si le service est indisponible
 * (500/501/503), les autres erreurs sont ignorées.
 */
export class AiBatcher {
  private buffer: string[] = [];
  private timer: number | null = null;
  private chain: Promise<void> = Promise.resolve();
  private warned = false;

  constructor(private hooks: { onAnalyzed: () => void; onUnavailable: () => void }) {}

  add(assetId: string) {
    this.buffer.push(assetId);
    if (this.buffer.length >= 10) this.flush();
    else {
      if (this.timer !== null) window.clearTimeout(this.timer);
      this.timer = window.setTimeout(() => this.flush(), 2500);
    }
  }

  flush() {
    if (this.timer !== null) window.clearTimeout(this.timer);
    this.timer = null;
    while (this.buffer.length) {
      const ids = this.buffer.splice(0, 10);
      this.chain = this.chain.then(() => this.send(ids));
    }
  }

  private async send(ids: string[]) {
    if (!(await aiAvailable())) return;
    try {
      await api.post("/api/assets/analyze", { ids });
      this.hooks.onAnalyzed();
    } catch (err) {
      const status = err instanceof ApiError ? err.status : 0;
      if ((status === 500 || status === 501 || status === 503) && !this.warned) {
        this.warned = true;
        this.hooks.onUnavailable();
      }
    }
  }
}
