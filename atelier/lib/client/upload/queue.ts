"use client";

import { errorMessage } from "@/lib/client/api";
import { guessMime, kindOf } from "@/lib/client/media/kind";
import { AbortedError } from "@/lib/client/upload/transport";
import { abortRemote, newJob, runPipeline, type UploadJob, type UploadPhase } from "@/lib/client/upload/pipeline";
import type { Asset, AssetKind } from "@/lib/shared/types";

export type { UploadPhase } from "@/lib/client/upload/pipeline";

/** Une ligne du tiroir d'envoi (instantané immuable, lu par l'interface). */
export interface UploadItem {
  id: string;
  name: string;
  size: number;
  kind: AssetKind | null;
  folderId: string | null;
  phase: UploadPhase;
  /** Octets de l'original déjà envoyés. */
  loaded: number;
  error: string | null;
  duplicateOf: string | null;
  assetId: string | null;
  /** URL objet de la vignette calculée (aperçu dans le tiroir). */
  previewUrl: string | null;
  note: string | null;
}

export interface UploadSnapshot {
  items: UploadItem[];
  /** Au moins un fichier en attente ou en cours. */
  busy: boolean;
}

export interface QueueOptions {
  concurrency?: number;
  onCompleted?: (asset: Asset, item: UploadItem) => void;
}

interface Entry {
  job: UploadJob;
  controller: AbortController | null;
}

const ACTIVE: UploadPhase[] = ["analyzing", "uploading", "finishing"];

/**
 * File d'envoi : 3 fichiers à la fois, état observable (useSyncExternalStore), annulation,
 * nouvel essai avec reprise. Les mises à jour de progression sont regroupées (≈ 8 par seconde)
 * pour ne pas surcharger le rendu.
 */
export class UploadQueue {
  private items: UploadItem[] = [];
  private entries = new Map<string, Entry>();
  private listeners = new Set<() => void>();
  private snapshot: UploadSnapshot = { items: [], busy: false };
  private running = 0;
  private seq = 0;
  private emitTimer: number | null = null;
  private readonly concurrency: number;

  constructor(private opts: QueueOptions = {}) {
    this.concurrency = opts.concurrency ?? 3;
  }

  subscribe = (listener: () => void) => {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  };

  getSnapshot = () => this.snapshot;

  setOptions(opts: QueueOptions) {
    this.opts = { ...this.opts, ...opts };
  }

  /** Ajoute des fichiers ; renvoie le nombre de fichiers acceptés. */
  enqueue(files: File[], folderId: string | null): number {
    let added = 0;
    for (const file of files) {
      const id = `u${++this.seq}-${Date.now().toString(36)}`;
      const kind = kindOf(guessMime(file));
      this.entries.set(id, { job: newJob(file, folderId), controller: null });
      this.items = [
        ...this.items,
        { id, name: file.name, size: file.size, kind, folderId, phase: "queued", loaded: 0, error: null, duplicateOf: null, assetId: null, previewUrl: null, note: null },
      ];
      added++;
    }
    if (added) {
      this.emit(true);
      this.pump();
    }
    return added;
  }

  cancel(id: string) {
    const item = this.find(id);
    const entry = this.entries.get(id);
    if (!item || !entry || item.phase === "done" || item.phase === "cancelled") return;
    entry.controller?.abort();
    const init = entry.job.init;
    if (init) void abortRemote(init.assetId, init.original.mode === "multipart" ? init.original.uploadId : null);
    entry.job.init = undefined;
    this.patch(id, { phase: "cancelled", error: null }, true);
  }

  cancelAll() {
    for (const item of this.items) if (item.phase === "queued" || ACTIVE.includes(item.phase) || item.phase === "error") this.cancel(item.id);
  }

  retry(id: string) {
    const item = this.find(id);
    if (!item || (item.phase !== "error" && item.phase !== "cancelled")) return;
    this.patch(id, { phase: "queued", error: null }, true);
    this.pump();
  }

  retryAll() {
    for (const item of this.items) if (item.phase === "error") this.patch(item.id, { phase: "queued", error: null });
    this.emit(true);
    this.pump();
  }

  /** Retire les lignes terminées (envoyées, annulées, en erreur). */
  clearFinished() {
    const keep: UploadItem[] = [];
    for (const item of this.items) {
      if (item.phase === "done" || item.phase === "cancelled" || item.phase === "error") {
        if (item.phase === "error") {
          const init = this.entries.get(item.id)?.job.init;
          if (init) void abortRemote(init.assetId, init.original.mode === "multipart" ? init.original.uploadId : null);
        }
        if (item.previewUrl) URL.revokeObjectURL(item.previewUrl);
        this.entries.delete(item.id);
      } else keep.push(item);
    }
    this.items = keep;
    this.emit(true);
  }

  private find(id: string) {
    return this.items.find((i) => i.id === id);
  }

  private patch(id: string, p: Partial<UploadItem>, urgent = false) {
    let changed = false;
    this.items = this.items.map((i) => {
      if (i.id !== id) return i;
      changed = true;
      return { ...i, ...p };
    });
    if (changed) this.emit(urgent);
  }

  private emit(urgent: boolean) {
    const flush = () => {
      this.emitTimer = null;
      this.snapshot = { items: this.items, busy: this.items.some((i) => i.phase === "queued" || ACTIVE.includes(i.phase)) };
      for (const l of this.listeners) l();
    };
    if (urgent) {
      if (this.emitTimer !== null) window.clearTimeout(this.emitTimer);
      flush();
    } else if (this.emitTimer === null) this.emitTimer = window.setTimeout(flush, 120);
  }

  private pump() {
    while (this.running < this.concurrency) {
      const next = this.items.find((i) => i.phase === "queued");
      if (!next) return;
      this.running++;
      this.patch(next.id, { phase: "analyzing" }, true);
      void this.run(next.id).finally(() => {
        this.running--;
        this.pump();
      });
    }
  }

  private async run(id: string) {
    const entry = this.entries.get(id);
    if (!entry) return;
    const controller = new AbortController();
    entry.controller = controller;
    const isCurrent = () => entry.controller === controller && !controller.signal.aborted;
    try {
      const asset = await runPipeline(entry.job, {
        signal: controller.signal,
        phase: (phase) => isCurrent() && this.patch(id, { phase }, true),
        progress: (loaded) => isCurrent() && this.patch(id, { loaded }),
        analyzed: (a) => {
          if (!isCurrent()) return;
          const blob = a.thumb ?? a.poster;
          const cur = this.find(id);
          if (cur?.previewUrl) URL.revokeObjectURL(cur.previewUrl);
          this.patch(id, { kind: a.kind, previewUrl: blob ? URL.createObjectURL(blob) : null, note: a.notes[0] ?? null }, true);
        },
        duplicate: (dup) => isCurrent() && this.patch(id, { duplicateOf: dup }, true),
      });
      if (!isCurrent()) return;
      this.patch(id, { phase: "done", loaded: entry.job.file.size, assetId: asset.id, error: null }, true);
      const item = this.find(id);
      if (item) this.opts.onCompleted?.(asset, item);
    } catch (err) {
      if (err instanceof AbortedError || controller.signal.aborted) return;
      this.patch(id, { phase: "error", error: errorMessage(err) }, true);
    } finally {
      if (entry.controller === controller) entry.controller = null;
    }
  }
}
