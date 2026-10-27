import { z } from "zod";
import { getActor } from "@/lib/server/auth";
import { body, notFound, route } from "@/lib/server/http";
import { deleteFolder, getFolder, getFolderPath, updateFolder } from "@/lib/server/repo/folders";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ id: string }> };

/** Le dossier et son chemin depuis la racine (fil d'Ariane). */
export const GET = route<Ctx>(async (_req, { params }) => {
  const { id } = await params;
  const folder = await getFolder(id);
  if (!folder) throw notFound("Dossier");
  return { folder, path: await getFolderPath(id) };
});

const Patch = z.object({ name: z.string().min(1).max(120).optional(), parentId: z.string().uuid().nullable().optional(), color: z.string().max(20).nullable().optional() });

export const PATCH = route<Ctx>(async (req, { params }) => updateFolder((await params).id, await body(req, Patch), await getActor()));

export const DELETE = route<Ctx>(async (_req, { params }) => deleteFolder((await params).id, await getActor()));
