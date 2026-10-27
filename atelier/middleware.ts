import { NextResponse, type NextRequest } from "next/server";
import { readSessionToken, SESSION_COOKIE } from "@/lib/server/session-token";

/**
 * Accès à Atelier protégé par un mot de passe d'équipe (ATELIER_PASSWORD).
 * Sans mot de passe défini : accès libre en local, mais refusé en production.
 */
const PUBLIC_PREFIXES = ["/login", "/api/auth/", "/api/blob/", "/api/webhooks/", "/_next/", "/favicon", "/icon"];

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  if (PUBLIC_PREFIXES.some((p) => pathname.startsWith(p))) return NextResponse.next();

  const password = process.env.ATELIER_PASSWORD?.trim();
  const isApi = pathname.startsWith("/api/");

  if (!password) {
    if (process.env.NODE_ENV === "production") {
      const message = "Atelier n'est pas encore protégé : définissez ATELIER_PASSWORD dans les variables d'environnement.";
      return isApi
        ? NextResponse.json({ error: { code: "not_configured", message } }, { status: 503 })
        : new NextResponse(message, { status: 503, headers: { "content-type": "text/plain; charset=utf-8" } });
    }
    return NextResponse.next();
  }

  const secret = process.env.ATELIER_SECRET?.trim() || password;
  const session = await readSessionToken(secret, req.cookies.get(SESSION_COOKIE)?.value);
  if (session) return NextResponse.next();

  if (isApi) {
    return NextResponse.json({ error: { code: "unauthorized", message: "Session expirée : reconnectez-vous." } }, { status: 401 });
  }
  const url = req.nextUrl.clone();
  url.pathname = "/login";
  url.search = pathname === "/" ? "" : `?next=${encodeURIComponent(pathname + req.nextUrl.search)}`;
  return NextResponse.redirect(url);
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
