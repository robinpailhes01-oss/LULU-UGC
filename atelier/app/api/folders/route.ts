import { z } from "zod";
import { getActor } from "@/lib/server/auth";
import { requestClientFilter } from "@/lib/server/client-scope";
import { body, route } from "@/lib/server/http";
import { createFolder, listFolders } from "@/lib/server/repo/folders";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Dossiers du client courant (?client=all|<id> pour passer outre). */
export const GET = route(async (req) => ({ folders: await listFolders(await requestClientFilter(req)) }));

const Create = z.object({ name: z.string().min(1).max(120), parentId: z.string().uuid().nullable().optional(), color: z.string().max(20).nullable().optional() });

export const POST = route(async (req) => createFolder(await body(req, Create), await getActor()));
