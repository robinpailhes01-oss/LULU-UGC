import { route } from "@/lib/server/http";
import { syncPosts, zernioConfigured } from "@/lib/server/services/posts";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

/** Met à jour les statuts depuis Zernio (publications échues ou en cours). { configured, updated } */
export const POST = route(async () => {
  const configured = await zernioConfigured();
  return { configured, ...(await syncPosts()) };
});
