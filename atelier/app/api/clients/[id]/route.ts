import { z } from "zod";
import { getActor } from "@/lib/server/auth";
import { body, route } from "@/lib/server/http";
import { clientNumbers, requireClient, setClientStatus, SocialInput, updateClient } from "@/lib/server/services/clients";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ id: string }> };

/** Fiche client + chiffres clés. */
export const GET = route<Ctx>(async (_req, { params }) => {
  const { id } = await params;
  const client = await requireClient(id);
  return { client, numbers: await clientNumbers(id) };
});

const Patch = z.object({
  name: z.string().min(1).max(120).optional(),
  sector: z.string().max(80).optional(),
  description: z.string().max(2000).optional(),
  website: z.string().max(300).nullable().optional(),
  socials: z.array(SocialInput).max(10).optional(),
  color: z.string().max(9).nullable().optional(),
  /** Fiche marque (étape « Analyse de la marque »). */
  brand: z.record(z.string(), z.unknown()).nullable().optional(),
  status: z.enum(["active", "archived"]).optional(),
});

/** Modifie la fiche ; `status` archive ou réactive le client. */
export const PATCH = route<Ctx>(async (req, { params }) => {
  const { id } = await params;
  const { status, ...patch } = await body(req, Patch);
  const actor = await getActor();
  let client = await updateClient(id, patch, actor);
  if (status) client = await setClientStatus(id, status, actor);
  return client;
});
