import "server-only";
import type { Look, RetouchParams } from "@/lib/shared/types";

/**
 * CONTRAT (fondation) — implémenté par le module Retouche.
 * Looks enregistrés (préréglages de couleur). Les looks intégrés (« June doré »…) sont créés
 * automatiquement au premier appel s'ils n'existent pas.
 */
export async function listLooks(): Promise<Look[]> {
  throw new Error("listLooks : non implémenté");
}

export async function getLook(id: string): Promise<Look | null> {
  void id;
  throw new Error("getLook : non implémenté");
}

/** Trouve un look par nom (insensible à la casse et aux accents) — utile pour l'agent. */
export async function findLookByName(name: string): Promise<Look | null> {
  void name;
  throw new Error("findLookByName : non implémenté");
}

export async function createLook(input: { name: string; params: Partial<RetouchParams> }, actor: string | null): Promise<Look> {
  void input;
  void actor;
  throw new Error("createLook : non implémenté");
}

export async function deleteLook(id: string, actor: string | null): Promise<void> {
  void id;
  void actor;
  throw new Error("deleteLook : non implémenté");
}
