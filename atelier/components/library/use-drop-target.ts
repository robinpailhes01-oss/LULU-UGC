"use client";

import { useState } from "react";
import { DRAG_ASSETS_MIME } from "@/components/shell/Sidebar";
import { UPLOAD_TARGET_EVENT, useUploads } from "@/components/library/UploadProvider";
import { collectDropped, hasFiles } from "@/lib/client/upload/files";

/**
 * Cible de dépôt pour un dossier (carte, fil d'Ariane) :
 * - médias glissés depuis la grille (DRAG_ASSETS_MIME) → déplacement ;
 * - fichiers venus de l'ordinateur → import directement dans ce dossier.
 */
export function useFolderDropTarget(folderId: string | null, folderName: string, onMoveIds: (ids: string[], folderId: string | null) => void) {
  const [over, setOver] = useState(false);
  const { enqueue } = useUploads();
  return {
    over,
    props: {
      onDragOver: (e: React.DragEvent) => {
        const types = Array.from(e.dataTransfer.types);
        const internal = types.includes(DRAG_ASSETS_MIME);
        if (!internal && !hasFiles(e.dataTransfer)) return;
        // Pas de stopPropagation : le bandeau d'import (écouteur sur window) reste affiché.
        e.preventDefault();
        e.dataTransfer.dropEffect = internal ? "move" : "copy";
        if (!over) {
          setOver(true);
          if (!internal) window.dispatchEvent(new CustomEvent(UPLOAD_TARGET_EVENT, { detail: folderName }));
        }
      },
      onDragLeave: (e: React.DragEvent) => {
        if ((e.currentTarget as HTMLElement).contains(e.relatedTarget as Node | null)) return;
        setOver(false);
        window.dispatchEvent(new CustomEvent(UPLOAD_TARGET_EVENT, { detail: null }));
      },
      onDrop: (e: React.DragEvent) => {
        setOver(false);
        window.dispatchEvent(new CustomEvent(UPLOAD_TARGET_EVENT, { detail: null }));
        const raw = e.dataTransfer.getData(DRAG_ASSETS_MIME);
        if (raw) {
          e.preventDefault();
          e.stopPropagation();
          try {
            const ids = JSON.parse(raw) as string[];
            if (Array.isArray(ids) && ids.length) onMoveIds(ids, folderId);
          } catch {
            /* données invalides */
          }
          return;
        }
        if (hasFiles(e.dataTransfer)) {
          e.preventDefault();
          e.stopPropagation();
          void collectDropped(e.dataTransfer).then((files) => enqueue(files, folderId));
        }
      },
    },
  };
}
