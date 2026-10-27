import "server-only";
import { cookies } from "next/headers";
import { env } from "@/lib/server/env";
import { readSessionToken, SESSION_COOKIE } from "@/lib/server/session-token";

/** Prénom de la personne connectée, ou null (mode local sans session). */
export async function getActor(): Promise<string | null> {
  const store = await cookies();
  const session = await readSessionToken(env.auth.secret, store.get(SESSION_COOKIE)?.value);
  return session?.n ?? null;
}
