import { getActor } from "@/lib/server/auth";
import { body, notFound, route } from "@/lib/server/http";
import { deletePost, getPost, postAssets, updatePost } from "@/lib/server/services/posts";
import { PatchPostSchema } from "@/lib/server/zernio/schemas";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 300;

type Ctx = { params: Promise<{ id: string }> };

/** { post, assets } */
export const GET = route<Ctx>(async (_req, { params }) => {
  const post = await getPost((await params).id);
  if (!post) throw notFound("Publication");
  return { post, assets: await postAssets([post]) };
});

/** Modifie la publication. scheduledFor : date ISO / "next-slot" = programmer, null = repasser en brouillon. */
export const PATCH = route<Ctx>(async (req, { params }) => updatePost((await params).id, await body(req, PatchPostSchema), await getActor()));

/** Supprime la publication ici et chez Zernio (sauf si déjà publiée : elle reste en ligne). */
export const DELETE = route<Ctx>(async (_req, { params }) => {
  await deletePost((await params).id, await getActor());
  return { ok: true };
});
