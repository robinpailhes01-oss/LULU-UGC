import { z } from "zod";
import { getActor } from "@/lib/server/auth";
import { body, route } from "@/lib/server/http";
import { requireAsset, updateAsset } from "@/lib/server/repo/assets";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ id: string }> };

export const GET = route<Ctx>(async (_req, { params }) => requireAsset((await params).id));

const Patch = z.object({
  name: z.string().min(1).max(255).optional(),
  folderId: z.string().uuid().nullable().optional(),
  tags: z.array(z.string().max(40)).max(40).optional(),
  starred: z.boolean().optional(),
});

export const PATCH = route<Ctx>(async (req, { params }) => updateAsset((await params).id, await body(req, Patch), await getActor()));
