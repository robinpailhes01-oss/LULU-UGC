import { z } from "zod";
import { getActor } from "@/lib/server/auth";
import { requestClientFilter } from "@/lib/server/client-scope";
import { body, route } from "@/lib/server/http";
import { createMontage, listMontageCards } from "@/lib/server/services/montages";
import type { MontageSpec } from "@/lib/shared/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Montages du client courant (avec affiche et nom du style) ; ?client=all|<id>. */
export const GET = route(async (req) => ({ montages: await listMontageCards(await requestClientFilter(req)) }));

const Create = z.object({
  title: z.string().max(200).default(""),
  /** Spécification partielle, validée par le service ; `style` = slug d'un skill « montage ». */
  spec: z.record(z.string(), z.unknown()).optional(),
  assetIds: z.array(z.string().uuid()).max(300).optional(),
});

/** Crée un montage dans un style (par défaut « reel-immersion ») ; `assetIds` = un plan par média. */
export const POST = route(async (req) => {
  const input = await body(req, Create);
  return createMontage({ title: input.title, spec: input.spec as Partial<MontageSpec> | undefined, assetIds: input.assetIds }, await getActor());
});
