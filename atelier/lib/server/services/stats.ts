import "server-only";
import { listActivity } from "@/lib/server/repo/activity";
import { listAssets, storageTotals } from "@/lib/server/repo/assets";
import { getCleanupReport, suggestionCount } from "@/lib/server/services/cleanup";
import { listMontages } from "@/lib/server/services/montages";
import { listPosts } from "@/lib/server/services/posts";
import type { DashboardStats, Montage, ScheduledPost } from "@/lib/shared/types";

/** DashboardStats + quelques compléments affichés par le tableau de bord. */
export interface DashboardPayload extends DashboardStats {
  audio: number;
  /** Octets libérés si l'on suit les suggestions du ménage. */
  cleanupBytes: number;
  /** Faux tant que le module concerné n'est pas branché (le tableau de bord l'explique). */
  available: { posts: boolean; montages: boolean };
}

const DAY = 86_400_000;

async function upcomingPosts(): Promise<ScheduledPost[] | null> {
  try {
    const now = Date.now();
    const posts = await listPosts({ from: new Date(now - 3_600_000).toISOString(), to: new Date(now + 7 * DAY).toISOString() });
    return posts
      .filter((p) => p.scheduledFor && p.status !== "cancelled")
      .sort((a, b) => (a.scheduledFor ?? "").localeCompare(b.scheduledFor ?? ""))
      .slice(0, 8);
  } catch {
    return null; // module Programmation pas encore disponible
  }
}

async function activeMontages(): Promise<Montage[] | null> {
  try {
    const all = await listMontages();
    return all
      .filter((m) => m.status !== "failed" || Date.now() - new Date(m.updatedAt).getTime() < 7 * DAY)
      .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
      .slice(0, 6)
      .map((m) => ({ ...m, html: null })); // la composition HTML est lourde et inutile ici
  } catch {
    return null; // module Montage pas encore disponible
  }
}

/** Tout ce qu'affiche la page d'accueil, en un appel. Le rapport de ménage est mis en cache 60 s. */
export async function getDashboardStats(): Promise<DashboardPayload> {
  const [totals, recent, activity, posts, montages, cleanup] = await Promise.all([
    storageTotals(),
    listAssets({ sort: "recent", limit: 12 }),
    listActivity(60),
    upcomingPosts(),
    activeMontages(),
    getCleanupReport().catch((err) => {
      console.error("[atelier] ménage (tableau de bord)", err);
      return null;
    }),
  ]);
  return {
    photos: totals.photos,
    videos: totals.videos,
    audio: totals.audio,
    bytes: totals.bytes,
    untagged: totals.untagged,
    trashed: totals.trashed,
    cleanupCandidates: cleanup ? suggestionCount(cleanup) : 0,
    cleanupBytes: cleanup?.reclaimableBytes ?? 0,
    upcomingPosts: posts ?? [],
    montages: montages ?? [],
    recentAssets: recent.items.filter((a) => a.status === "ready"),
    activity,
    available: { posts: posts !== null, montages: montages !== null },
  };
}
