"use client";

/**
 * STUB (fondation) — remplacé par le module Médiathèque.
 * Contrat : vue façon Google Drive pour tous les modes de la médiathèque.
 */
export type LibraryMode = "root" | "folder" | "recent" | "starred" | "trash" | "search";

export function LibraryView({ mode, folderId, query }: { mode: LibraryMode; folderId?: string; query?: string }) {
  return <div className="p-6 text-muted">Médiathèque — {mode} {folderId ?? ""} {query ?? ""}</div>;
}
