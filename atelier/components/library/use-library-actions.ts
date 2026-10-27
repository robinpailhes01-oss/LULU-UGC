"use client";

import { useMemo, useRef } from "react";
import { useRouter } from "next/navigation";
import { useShell } from "@/components/shell/ShellContext";
import { useToast } from "@/components/ui/Toast";
import { api, ApiError, errorMessage } from "@/lib/client/api";
import { emitRefresh } from "@/lib/client/refresh";
import { plural } from "@/lib/shared/format";
import type { Asset, Folder } from "@/lib/shared/types";

type BulkOp =
  | { action: "move"; folderId: string | null }
  | { action: "tag"; tags: string[] }
  | { action: "untag"; tags: string[] }
  | { action: "star"; starred: boolean }
  | { action: "trash" }
  | { action: "restore" }
  | { action: "delete" };

export interface LibraryActionsOptions {
  /** Mise à jour locale optimiste de la liste affichée. */
  mutate?: (fn: (items: Asset[]) => Asset[]) => void;
  /** Le média disparaît de la vue courante après déplacement (vue d'un dossier). */
  removesOnMove?: (folderId: string | null) => boolean;
}

const medias = (n: number) => plural(n, "média");

export async function bulk(ids: string[], op: BulkOp): Promise<number> {
  let count = 0;
  for (let i = 0; i < ids.length; i += 2000) {
    const r = await api.post<{ count: number }>("/api/assets/bulk", { ids: ids.slice(i, i + 2000), op });
    count += r.count;
  }
  return count;
}

export function triggerDownload(url: string, name: string) {
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.rel = "noopener";
  a.style.display = "none";
  document.body.appendChild(a);
  a.click();
  a.remove();
}

/**
 * Actions de la médiathèque, partagées par la barre de sélection, le menu contextuel, le panneau
 * Infos et l'aperçu : toasts de résultat (avec « Annuler » quand c'est simple), rafraîchissement
 * des vues concernées et mises à jour optimistes.
 */
export function useLibraryActions(opts: LibraryActionsOptions = {}) {
  const toast = useToast();
  const router = useRouter();
  const { askAgent, folders } = useShell();
  const optsRef = useRef(opts);
  optsRef.current = opts;
  const foldersRef = useRef<Folder[]>(folders);
  foldersRef.current = folders;

  return useMemo(() => {
    const mutate = (fn: (items: Asset[]) => Asset[]) => optsRef.current.mutate?.(fn);
    const folderName = (id: string | null) => (id ? foldersRef.current.find((f) => f.id === id)?.name ?? "dossier" : "Médiathèque");
    const fail = (err: unknown) => toast(errorMessage(err), { tone: "error" });

    const restore = async (assets: Asset[], quiet = false) => {
      const ids = assets.map((a) => a.id);
      try {
        await bulk(ids, { action: "restore" });
        emitRefresh("assets", "folders", "stats", "cleanup");
        if (!quiet) toast(assets.length > 1 ? `${medias(assets.length)} restaurés` : `« ${assets[0].name} » restauré`);
      } catch (err) {
        fail(err);
      }
    };

    const trash = async (assets: Asset[]) => {
      if (assets.length === 0) return;
      const ids = new Set(assets.map((a) => a.id));
      mutate((items) => items.filter((a) => !ids.has(a.id)));
      try {
        const n = await bulk([...ids], { action: "trash" });
        emitRefresh("assets", "folders", "stats", "cleanup");
        toast(n > 1 ? `${medias(n)} mis à la corbeille` : `« ${assets[0].name} » mis à la corbeille`, {
          action: { label: "Annuler", onClick: () => void restore(assets, true).then(() => toast("Restauré", { tone: "info" })) },
          durationMs: 6000,
        });
      } catch (err) {
        emitRefresh("assets");
        fail(err);
      }
    };

    const deleteForever = async (assets: Asset[]) => {
      const ids = new Set(assets.map((a) => a.id));
      mutate((items) => items.filter((a) => !ids.has(a.id)));
      try {
        const n = await bulk([...ids], { action: "delete" });
        emitRefresh("assets", "folders", "stats", "cleanup");
        toast(n > 1 ? `${medias(n)} supprimés définitivement` : "Média supprimé définitivement");
      } catch (err) {
        emitRefresh("assets");
        fail(err);
      }
    };

    const emptyTrash = async () => {
      try {
        const r = await api.del<{ count: number }>("/api/trash");
        mutate(() => []);
        emitRefresh("assets", "folders", "stats", "cleanup");
        toast(r.count > 0 ? `Corbeille vidée : ${medias(r.count)} supprimés` : "La corbeille était déjà vide");
      } catch (err) {
        fail(err);
      }
    };

    const star = async (assets: Asset[], starred: boolean) => {
      const ids = new Set(assets.map((a) => a.id));
      mutate((items) => items.map((a) => (ids.has(a.id) ? { ...a, starred } : a)));
      try {
        await bulk([...ids], { action: "star", starred });
        emitRefresh("assets");
        if (assets.length > 1) toast(starred ? `${medias(assets.length)} ajoutés aux favoris` : `${medias(assets.length)} retirés des favoris`);
      } catch (err) {
        emitRefresh("assets");
        fail(err);
      }
    };

    const move = async (assets: Asset[], folderId: string | null) => {
      if (assets.length === 0) return;
      const previous = new Map<string | null, string[]>();
      for (const a of assets) previous.set(a.folderId, [...(previous.get(a.folderId) ?? []), a.id]);
      const ids = new Set(assets.map((a) => a.id));
      if (optsRef.current.removesOnMove?.(folderId)) mutate((items) => items.filter((a) => !ids.has(a.id)));
      else mutate((items) => items.map((a) => (ids.has(a.id) ? { ...a, folderId } : a)));
      try {
        const n = await bulk([...ids], { action: "move", folderId });
        emitRefresh("assets", "folders");
        toast(`${n > 1 ? `${medias(n)} déplacés` : "Média déplacé"} dans « ${folderName(folderId)} »`, {
          action: {
            label: "Annuler",
            onClick: async () => {
              try {
                for (const [fid, list] of previous) await bulk(list, { action: "move", folderId: fid });
                emitRefresh("assets", "folders");
                toast("Déplacement annulé", { tone: "info" });
              } catch (err) {
                fail(err);
              }
            },
          },
          durationMs: 6000,
        });
      } catch (err) {
        emitRefresh("assets");
        fail(err);
      }
    };

    const tag = async (assets: Asset[], add: string[], remove: string[]) => {
      const ids = assets.map((a) => a.id);
      try {
        if (add.length) await bulk(ids, { action: "tag", tags: add });
        if (remove.length) await bulk(ids, { action: "untag", tags: remove });
        emitRefresh("assets");
        const parts = [add.length ? `${plural(add.length, "mot-clé ajouté", "mots-clés ajoutés")}` : "", remove.length ? `${plural(remove.length, "mot-clé retiré", "mots-clés retirés")}` : ""].filter(Boolean);
        if (parts.length) toast(`${parts.join(", ")} · ${medias(assets.length)}`);
      } catch (err) {
        fail(err);
      }
    };

    const setTags = async (asset: Asset, tags: string[]): Promise<Asset | null> => {
      mutate((items) => items.map((a) => (a.id === asset.id ? { ...a, tags } : a)));
      try {
        const updated = await api.patch<Asset>(`/api/assets/${asset.id}`, { tags });
        mutate((items) => items.map((a) => (a.id === updated.id ? updated : a)));
        emitRefresh("assets");
        return updated;
      } catch (err) {
        emitRefresh("assets");
        fail(err);
        return null;
      }
    };

    const rename = async (asset: Asset, name: string): Promise<boolean> => {
      const clean = name.trim();
      if (!clean || clean === asset.name) return true;
      mutate((items) => items.map((a) => (a.id === asset.id ? { ...a, name: clean } : a)));
      try {
        const updated = await api.patch<Asset>(`/api/assets/${asset.id}`, { name: clean });
        mutate((items) => items.map((a) => (a.id === updated.id ? updated : a)));
        emitRefresh("assets");
        toast(`Renommé en « ${updated.name} »`);
        return true;
      } catch (err) {
        emitRefresh("assets");
        fail(err);
        return false;
      }
    };

    const download = (assets: Asset[]) => {
      if (assets.length === 0) return;
      if (assets.length === 1) {
        triggerDownload(assets[0].urls.download, assets[0].name);
        return;
      }
      toast(`Téléchargement de ${medias(assets.length)}, un par un…`, { tone: "info" });
      assets.forEach((a, i) => window.setTimeout(() => triggerDownload(a.urls.download, a.name), i * 700));
    };

    const copyLink = async (asset: Asset) => {
      const url = new URL(asset.urls.download, window.location.origin).toString();
      try {
        await navigator.clipboard.writeText(url);
        toast("Lien de téléchargement copié");
      } catch {
        window.prompt("Copiez le lien de téléchargement :", url);
      }
    };

    const analyze = async (assets: Asset[], force = false) => {
      const eligible = assets.filter((a) => a.kind !== "audio");
      if (eligible.length === 0) {
        toast("L'analyse IA concerne les photos et les vidéos.", { tone: "info" });
        return;
      }
      toast(`Analyse IA de ${medias(eligible.length)}…`, { tone: "info" });
      try {
        let analyzed = 0;
        let errors = 0;
        for (let i = 0; i < eligible.length; i += 20) {
          const r = await api.post<{ analyzed: Asset[]; skipped: string[]; errors: { id: string; message: string }[] }>("/api/assets/analyze", {
            ids: eligible.slice(i, i + 20).map((a) => a.id),
            force,
          });
          analyzed += r.analyzed?.length ?? 0;
          errors += r.errors?.length ?? 0;
          emitRefresh("assets");
        }
        toast(errors > 0 ? `${medias(analyzed)} analysés, ${plural(errors, "échec")}` : analyzed > 0 ? `${medias(analyzed)} analysés` : "Déjà analysés", { tone: errors ? "error" : "success" });
      } catch (err) {
        toast(err instanceof ApiError && (err.status === 503 || err.status === 501) ? "L'analyse IA n'est pas configurée (clé Anthropic manquante dans les réglages)." : errorMessage(err), { tone: "error" });
      }
    };

    const photoIds = (assets: Asset[]) => assets.filter((a) => a.kind === "photo" || a.kind === "video").map((a) => a.id);

    return {
      trash,
      restore,
      deleteForever,
      emptyTrash,
      star,
      move,
      tag,
      setTags,
      rename,
      download,
      copyLink,
      analyze,
      retouch: (asset: Asset) => router.push(`/retouche/${asset.id}`),
      montage: (assets: Asset[]) => router.push(`/montage?nouveau=1&assets=${photoIds(assets).join(",")}`),
      schedule: (assets: Asset[]) => router.push(`/programmation?nouveau=1&assets=${photoIds(assets).join(",")}`),
      askAbout: (assets: Asset[]) =>
        askAgent(assets.length === 1 ? `Que me proposes-tu pour le média sélectionné (« ${assets[0].name} ») ?` : `Que me proposes-tu pour les ${assets.length} médias sélectionnés ?`),
    };
  }, [toast, router, askAgent]);
}

export type LibraryActions = ReturnType<typeof useLibraryActions>;
