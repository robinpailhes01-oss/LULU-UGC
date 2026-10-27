import { getActor } from "@/lib/server/auth";
import { badRequest, body, route, searchParams } from "@/lib/server/http";
import { createPost, listPosts, postAssets } from "@/lib/server/services/posts";
import { CreatePostSchema } from "@/lib/server/zernio/schemas";
import type { PostStatus } from "@/lib/shared/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 300;

const STATUSES: PostStatus[] = ["draft", "scheduled", "publishing", "published", "failed", "cancelled"];

function isoParam(v: string | null, name: string): string | undefined {
  if (!v) return undefined;
  const t = Date.parse(v);
  if (Number.isNaN(t)) throw badRequest(`Paramètre « ${name} » invalide (date ISO attendue).`);
  return new Date(t).toISOString();
}

/**
 * GET /api/posts?from=ISO&to=ISO&drafts=1&status=scheduled,failed
 * → { posts, assets } : publications datées dans l'intervalle (+ brouillons sans date si drafts=1).
 */
export const GET = route(async (req) => {
  const sp = searchParams(req);
  const status = sp.get("status")?.split(",").filter((s): s is PostStatus => STATUSES.includes(s as PostStatus));
  const posts = await listPosts({ from: isoParam(sp.get("from"), "from"), to: isoParam(sp.get("to"), "to"), includeDrafts: sp.get("drafts") === "1", status });
  return { posts, assets: await postAssets(posts) };
});

/** Crée un brouillon (scheduledFor null) ou programme chez Zernio (date ISO ou "next-slot"). */
export const POST = route(async (req) => {
  const post = await createPost(await body(req, CreatePostSchema), await getActor());
  return Response.json(post, { status: 201 });
});
