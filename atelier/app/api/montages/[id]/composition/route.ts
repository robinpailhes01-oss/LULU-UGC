import { z } from "zod";
import { badRequest, body, route, searchParams } from "@/lib/server/http";
import { previewComposition } from "@/lib/server/services/montages";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ id: string }> };

/**
 * Composition HyperFrames pour l'aperçu (text/html). Les médias sont des liens signés absolus sur
 * l'origine de la requête : le lecteur (iframe isolé, sans cookies) peut les lire directement.
 * La version « rendu » (liens longue durée) n'est jamais servie au navigateur.
 * L'en-tête CSP « sandbox » isole aussi la page si on l'ouvre directement.
 */
function htmlResponse(html: string): Response {
  return new Response(html, {
    status: 200,
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Cache-Control": "no-store",
      "X-Content-Type-Options": "nosniff",
      "Content-Security-Policy": "sandbox allow-scripts",
    },
  });
}

function originOf(req: Request): string {
  const h = req.headers;
  const host = h.get("x-forwarded-host") ?? h.get("host");
  const proto = h.get("x-forwarded-proto") ?? new URL(req.url).protocol.replace(":", "");
  return host ? `${proto}://${host}` : new URL(req.url).origin;
}

export const GET = route<Ctx>(async (req, { params }) => {
  if (searchParams(req).get("render")) throw badRequest("La version de rendu n'est pas servie au navigateur.");
  return htmlResponse(await previewComposition((await params).id, originOf(req)));
});

const Preview = z.object({
  /** Spécification pas encore enregistrée (fusion superficielle) à prévisualiser. */
  spec: z.record(z.string(), z.unknown()).optional(),
  /** Code personnalisé pas encore enregistré, ou null pour la version générée. */
  html: z.string().max(2_000_000).nullable().optional(),
});

/** Aperçu d'une modification non enregistrée (spécification ou code). */
export const POST = route<Ctx>(async (req, { params }) => {
  const input = await body(req, Preview);
  return htmlResponse(await previewComposition((await params).id, originOf(req), input));
});
