import "server-only";
import type { PostOptions, PostTarget, ScheduledPost, SocialAccount } from "@/lib/shared/types";

/**
 * CONTRAT (fondation) — implémenté par le module Programmation (Zernio).
 */
export interface CreatePostInput {
  caption: string;
  assetIds: string[];
  targets: PostTarget[];
  /** ISO 8601 ; null = brouillon ; "next-slot" = prochain créneau de la file Zernio. */
  scheduledFor: string | null | "next-slot";
  firstComment?: string | null;
  options?: PostOptions;
}

export async function zernioConfigured(): Promise<boolean> {
  throw new Error("zernioConfigured : non implémenté");
}

export async function listSocialAccounts(): Promise<SocialAccount[]> {
  throw new Error("listSocialAccounts : non implémenté");
}

/** Publications dont la date tombe dans [from, to] (ISO), plus les brouillons sans date si includeDrafts. */
export async function listPosts(range: { from?: string; to?: string; includeDrafts?: boolean; status?: ScheduledPost["status"][] }): Promise<ScheduledPost[]> {
  void range;
  throw new Error("listPosts : non implémenté");
}

export async function getPost(id: string): Promise<ScheduledPost | null> {
  void id;
  throw new Error("getPost : non implémenté");
}

/** Crée la publication : brouillon local, ou envoi à Zernio (médias recopiés chez Zernio) si une date est donnée. */
export async function createPost(input: CreatePostInput, actor: string | null): Promise<ScheduledPost> {
  void input;
  void actor;
  throw new Error("createPost : non implémenté");
}

export async function updatePost(id: string, patch: Partial<CreatePostInput>, actor: string | null): Promise<ScheduledPost> {
  void id;
  void patch;
  void actor;
  throw new Error("updatePost : non implémenté");
}

/** Annule une publication programmée (la retire de Zernio, la garde en brouillon). */
export async function cancelPost(id: string, actor: string | null): Promise<ScheduledPost> {
  void id;
  void actor;
  throw new Error("cancelPost : non implémenté");
}

export async function deletePost(id: string, actor: string | null): Promise<void> {
  void id;
  void actor;
  throw new Error("deletePost : non implémenté");
}

/** Resynchronise les statuts avec Zernio (publiées, échecs, liens). */
export async function syncPosts(): Promise<{ updated: number }> {
  throw new Error("syncPosts : non implémenté");
}
