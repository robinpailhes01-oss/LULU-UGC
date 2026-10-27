import { z } from "zod";
import { body, route } from "@/lib/server/http";
import { lintMontage } from "@/lib/server/services/montages";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ id: string }> };

/** Vérification HyperFrames (@hyperframes/lint) + remarques d'Atelier sur la composition enregistrée. */
export const GET = route<Ctx>(async (_req, { params }) => lintMontage((await params).id));

const Override = z.object({
  spec: z.record(z.string(), z.unknown()).optional(),
  html: z.string().max(2_000_000).nullable().optional(),
});

/** Vérifie une version pas encore enregistrée (code en cours d'édition). */
export const POST = route<Ctx>(async (req, { params }) => lintMontage((await params).id, await body(req, Override)));
