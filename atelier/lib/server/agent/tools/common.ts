import "server-only";
import { getAssets } from "@/lib/server/repo/assets";
import { listFolders } from "@/lib/server/repo/folders";
import type { Asset, Folder } from "@/lib/shared/types";

/** Représentations compactes renvoyées au modèle (identifiants + noms + nombres, rien de superflu). */

export interface FolderIndex {
  byId: Map<string, Folder>;
  name: (id: string | null | undefined) => string | null;
  path: (id: string | null | undefined) => string | null;
}

/** Index de tous les dossiers (pour nommer le dossier de n'importe quel média). */
export async function folderIndex(): Promise<FolderIndex> {
  const all = await listFolders(null);
  const byId = new Map(all.map((f) => [f.id, f]));
  const path = (id: string | null | undefined): string | null => {
    if (!id) return null;
    const parts: string[] = [];
    const seen = new Set<string>();
    let cur = byId.get(id);
    while (cur && !seen.has(cur.id)) {
      seen.add(cur.id);
      parts.unshift(cur.name);
      cur = cur.parentId ? byId.get(cur.parentId) : undefined;
    }
    return parts.length ? parts.join(" / ") : null;
  };
  return { byId, name: (id) => (id ? byId.get(id)?.name ?? null : null), path };
}

const round1 = (n: number) => Math.round(n * 10) / 10;

export function compactAsset(a: Asset, folders: FolderIndex) {
  return {
    id: a.id,
    name: a.name,
    kind: a.kind,
    folder: folders.path(a.folderId),
    tags: a.tags,
    title: a.ai?.title ?? null,
    size: a.width && a.height ? `${a.width}×${a.height}` : null,
    duration_s: a.durationS ? round1(a.durationS) : undefined,
    taken: a.takenAt ? a.takenAt.slice(0, 10) : null,
    created: a.createdAt.slice(0, 10),
    starred: a.starred || undefined,
    quality: a.ai?.quality?.score,
    trashed: a.trashedAt ? true : undefined,
  };
}

export function detailedAsset(a: Asset, folders: FolderIndex) {
  return {
    ...compactAsset(a, folders),
    folder_id: a.folderId,
    mime: a.mime,
    bytes: a.sizeBytes,
    camera: a.camera,
    source: a.source,
    parent_asset_id: a.parentAssetId,
    sharpness: a.blurScore === null ? null : round1(a.blurScore),
    luma: a.lumaMean === null ? null : Math.round(a.lumaMean * 100) / 100,
    ai: a.ai
      ? {
          description: a.ai.description,
          univers: a.ai.univers,
          people: a.ai.people,
          quality_issues: a.ai.quality?.issues ?? [],
          alt: a.ai.alt,
          caption_idea: a.ai.captionIdea,
          suggested_folder: a.ai.suggestedFolder,
        }
      : null,
    link: a.folderId ? `/mediatheque/dossier/${a.folderId}` : "/mediatheque",
  };
}

/** Charge des médias dans l'ordre demandé ; erreur claire si certains n'existent pas. */
export async function requireAssets(ids: string[], opts: { allowTrashed?: boolean } = {}): Promise<Asset[]> {
  const unique = [...new Set(ids)];
  const found = await getAssets(unique);
  const missing = unique.filter((id) => !found.some((a) => a.id === id));
  if (missing.length) throw new Error(`Médias introuvables : ${missing.slice(0, 5).join(", ")}${missing.length > 5 ? "…" : ""}. N'utilise que des identifiants renvoyés par les outils.`);
  if (!opts.allowTrashed) {
    const trashed = found.filter((a) => a.trashedAt);
    if (trashed.length === found.length) throw new Error("Ces médias sont à la corbeille (restore_assets pour les restaurer).");
  }
  return found;
}

export function quoteNames(names: string[], max = 3): string {
  const shown = names.slice(0, max).map((n) => `« ${n} »`);
  return names.length > max ? `${shown.join(", ")} et ${names.length - max} autre${names.length - max > 1 ? "s" : ""}` : shown.join(", ");
}
