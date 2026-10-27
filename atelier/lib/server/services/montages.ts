import "server-only";
import type { Montage, MontageSpec, RenderState } from "@/lib/shared/types";

/**
 * CONTRAT (fondation) — implémenté par le module Montage (HyperFrames).
 */
export interface CreateMontageInput {
  title: string;
  /** Spécification partielle : format, plans, textes… Les valeurs manquantes prennent les défauts. */
  spec?: Partial<MontageSpec>;
  /** Raccourci : crée un plan par média, dans l'ordre. */
  assetIds?: string[];
}

export async function listMontages(): Promise<Montage[]> {
  throw new Error("listMontages : non implémenté");
}

export async function getMontage(id: string): Promise<Montage | null> {
  void id;
  throw new Error("getMontage : non implémenté");
}

export async function createMontage(input: CreateMontageInput, actor: string | null): Promise<Montage> {
  void input;
  void actor;
  throw new Error("createMontage : non implémenté");
}

/** Met à jour le titre, la spécification (fusion superficielle) ou la composition HTML personnalisée. */
export async function updateMontage(id: string, patch: { title?: string; spec?: Partial<MontageSpec>; html?: string | null }, actor: string | null): Promise<Montage> {
  void id;
  void patch;
  void actor;
  throw new Error("updateMontage : non implémenté");
}

export async function deleteMontage(id: string, actor: string | null): Promise<void> {
  void id;
  void actor;
  throw new Error("deleteMontage : non implémenté");
}

/** Composition HyperFrames (HTML complet) prête à prévisualiser ou rendre. */
export async function compositionHtml(id: string, opts?: { forRender?: boolean }): Promise<string> {
  void id;
  void opts;
  throw new Error("compositionHtml : non implémenté");
}

/** Lance le rendu MP4 ; renvoie l'état initial. Le résultat devient un média (source « montage »). */
export async function startRender(id: string, actor: string | null): Promise<RenderState> {
  void id;
  void actor;
  throw new Error("startRender : non implémenté");
}

/** État à jour du rendu (interroge le fournisseur si nécessaire). */
export async function refreshRender(id: string): Promise<Montage> {
  void id;
  throw new Error("refreshRender : non implémenté");
}
