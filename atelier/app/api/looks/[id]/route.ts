import { getActor } from "@/lib/server/auth";
import { notFound, route } from "@/lib/server/http";
import { deleteLook, getLook } from "@/lib/server/services/looks";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ id: string }> };

export const GET = route<Ctx>(async (_req, { params }) => {
  const look = await getLook((await params).id);
  if (!look) throw notFound("Look");
  return look;
});

/** Supprime un look enregistré (les looks intégrés ne peuvent pas l'être : 403). */
export const DELETE = route<Ctx>(async (_req, { params }) => {
  await deleteLook((await params).id, await getActor());
  return { ok: true };
});
