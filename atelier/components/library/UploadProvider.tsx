"use client";

/**
 * STUB (fondation) — remplacé par le module Médiathèque.
 * Contrat : fournit la file d'envoi (tiroir de progression en bas à droite, façon Drive),
 * le sélecteur de fichiers et le dépôt par glisser-déposer.
 */
import { createContext, useContext } from "react";

export interface UploadsApi {
  /** Ouvre le sélecteur de fichiers puis envoie dans le dossier donné (null = racine). */
  pickFiles: (folderId: string | null) => void;
  /** Ajoute des fichiers à la file d'envoi. */
  enqueue: (files: File[], folderId: string | null) => void;
}

const Ctx = createContext<UploadsApi>({ pickFiles: () => undefined, enqueue: () => undefined });

export function UploadProvider({ children }: { children: React.ReactNode }) {
  return <Ctx.Provider value={{ pickFiles: () => undefined, enqueue: () => undefined }}>{children}</Ctx.Provider>;
}

export function useUploads(): UploadsApi {
  return useContext(Ctx);
}
