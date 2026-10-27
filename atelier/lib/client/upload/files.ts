"use client";

import { isAcceptedFile } from "@/lib/client/media/kind";

/**
 * Fichiers déposés : prend aussi le contenu des dossiers glissés depuis le Finder / l'Explorateur
 * (parcours récursif), et écarte les fichiers cachés (.DS_Store…) et les types non pris en charge.
 */

interface FsEntry {
  isFile: boolean;
  isDirectory: boolean;
  name: string;
  file?: (ok: (f: File) => void, ko: (e: unknown) => void) => void;
  createReader?: () => { readEntries: (ok: (entries: FsEntry[]) => void, ko: (e: unknown) => void) => void };
}

/** À appeler PENDANT l'événement drop (les entrées ne sont plus lisibles ensuite). */
export function collectDropped(dt: DataTransfer): Promise<File[]> {
  const entries: FsEntry[] = [];
  const loose: File[] = [];
  if (dt.items && dt.items.length) {
    for (const item of Array.from(dt.items)) {
      if (item.kind !== "file") continue;
      const entry = (item as DataTransferItem & { webkitGetAsEntry?: () => FsEntry | null }).webkitGetAsEntry?.() ?? null;
      if (entry) entries.push(entry);
      else {
        const f = item.getAsFile();
        if (f) loose.push(f);
      }
    }
  } else loose.push(...Array.from(dt.files ?? []));
  return (async () => {
    const out = [...loose];
    for (const e of entries) await walk(e, out, 0);
    return out;
  })();
}

async function walk(entry: FsEntry, out: File[], depth: number): Promise<void> {
  if (entry.name.startsWith(".") || depth > 8 || out.length > 5000) return;
  if (entry.isFile && entry.file) {
    const f = await new Promise<File | null>((resolve) => entry.file!(resolve, () => resolve(null)));
    if (f) out.push(f);
    return;
  }
  if (entry.isDirectory && entry.createReader) {
    const reader = entry.createReader();
    for (;;) {
      const batch = await new Promise<FsEntry[]>((resolve) => reader.readEntries(resolve, () => resolve([])));
      if (batch.length === 0) break;
      for (const child of batch) await walk(child, out, depth + 1);
    }
  }
}

export function splitAccepted(files: File[]): { accepted: File[]; rejected: File[] } {
  const accepted: File[] = [];
  const rejected: File[] = [];
  for (const f of files) {
    if (f.name.startsWith(".")) continue;
    (isAcceptedFile(f) && f.size > 0 ? accepted : rejected).push(f);
  }
  return { accepted, rejected };
}

export function hasFiles(dt: DataTransfer | null): boolean {
  return Boolean(dt && Array.from(dt.types ?? []).includes("Files"));
}
