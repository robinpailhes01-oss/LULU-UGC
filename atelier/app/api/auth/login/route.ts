import { NextResponse } from "next/server";
import { timingSafeEqual } from "node:crypto";
import { z } from "zod";
import { env } from "@/lib/server/env";
import { body, route } from "@/lib/server/http";
import { createSessionToken, SESSION_COOKIE, SESSION_DAYS } from "@/lib/server/session-token";

export const runtime = "nodejs";

const Login = z.object({ name: z.string().trim().min(1).max(40), password: z.string().max(200).default("") });

function same(a: string, b: string) {
  const x = Buffer.from(a);
  const y = Buffer.from(b);
  return x.length === y.length && timingSafeEqual(x, y);
}

/** Connexion avec le mot de passe d'équipe et un prénom (pour signer l'activité). */
export const POST = route(async (req) => {
  const { name, password } = await body(req, Login);
  if (env.auth.password && !same(password, env.auth.password)) {
    await new Promise((r) => setTimeout(r, 600));
    return NextResponse.json({ error: { code: "bad_password", message: "Mot de passe incorrect." } }, { status: 401 });
  }
  const res = NextResponse.json({ ok: true, name });
  res.cookies.set(SESSION_COOKIE, await createSessionToken(env.auth.secret, name), {
    httpOnly: true,
    sameSite: "lax",
    secure: env.isProd,
    path: "/",
    maxAge: SESSION_DAYS * 86400,
  });
  return res;
});
