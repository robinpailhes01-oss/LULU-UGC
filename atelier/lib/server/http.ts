import "server-only";
import { NextResponse } from "next/server";
import { z, type ZodType } from "zod";

/**
 * Conventions des routes API d'Atelier :
 * - succès : le JSON de la ressource directement (status 200/201) ;
 * - erreur : { error: { code, message } } avec un status HTTP cohérent, message en français.
 */
export class HttpError extends Error {
  constructor(
    public status: number,
    public code: string,
    message: string,
  ) {
    super(message);
  }
}

export const notFound = (what = "Élément") => new HttpError(404, "not_found", `${what} introuvable.`);
export const badRequest = (message: string) => new HttpError(400, "bad_request", message);
export const notConfigured = (message: string) => new HttpError(503, "not_configured", message);

type Handler<C> = (req: Request, ctx: C) => Promise<Response | unknown>;

/**
 * Enveloppe une route : renvoie en JSON ce que le handler retourne (sauf si c'est déjà une Response)
 * et transforme les erreurs en réponses propres.
 */
export function route<C = { params: Promise<Record<string, string>> }>(handler: Handler<C>) {
  return async (req: Request, ctx: C): Promise<Response> => {
    try {
      const out = await handler(req, ctx);
      if (out instanceof Response) return out;
      return NextResponse.json(out ?? { ok: true });
    } catch (err) {
      return errorResponse(err);
    }
  };
}

export function errorResponse(err: unknown): Response {
  if (err instanceof HttpError) {
    return NextResponse.json({ error: { code: err.code, message: err.message } }, { status: err.status });
  }
  if (err instanceof z.ZodError) {
    const first = err.issues[0];
    const where = first?.path?.length ? ` (${first.path.join(".")})` : "";
    return NextResponse.json({ error: { code: "invalid", message: `Données invalides${where} : ${first?.message ?? ""}` } }, { status: 400 });
  }
  console.error("[atelier] erreur serveur", err);
  const message = err instanceof Error ? err.message : "Erreur inattendue.";
  return NextResponse.json({ error: { code: "server_error", message } }, { status: 500 });
}

export async function body<T>(req: Request, schema: ZodType<T>): Promise<T> {
  let raw: unknown;
  try {
    raw = await req.json();
  } catch {
    throw badRequest("Corps de requête JSON attendu.");
  }
  return schema.parse(raw);
}

export function searchParams(req: Request): URLSearchParams {
  return new URL(req.url).searchParams;
}
