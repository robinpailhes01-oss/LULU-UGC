/**
 * Jeton de session signé (HMAC-SHA256, Web Crypto) : utilisable dans le middleware (runtime Edge)
 * comme dans les routes Node. Format : base64url(JSON {n, e}) + "." + base64url(signature).
 */
export const SESSION_COOKIE = "atelier_session";
export const SESSION_DAYS = 30;

export interface SessionData {
  /** Prénom de la personne connectée (sert à signer l'activité). */
  n: string;
  /** Expiration, en secondes depuis l'époque Unix. */
  e: number;
}

const enc = new TextEncoder();

function b64url(bytes: Uint8Array): string {
  let bin = "";
  for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function fromB64url(s: string): Uint8Array {
  const pad = s.length % 4 === 0 ? "" : "=".repeat(4 - (s.length % 4));
  const bin = atob(s.replace(/-/g, "+").replace(/_/g, "/") + pad);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

async function hmac(secret: string, data: string): Promise<Uint8Array> {
  const key = await crypto.subtle.importKey("raw", enc.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  return new Uint8Array(await crypto.subtle.sign("HMAC", key, enc.encode(data)));
}

export async function createSessionToken(secret: string, name: string, days = SESSION_DAYS): Promise<string> {
  const data: SessionData = { n: name.slice(0, 40), e: Math.floor(Date.now() / 1000) + days * 86400 };
  const body = b64url(enc.encode(JSON.stringify(data)));
  return `${body}.${b64url(await hmac(secret, body))}`;
}

export async function readSessionToken(secret: string, token: string | undefined | null): Promise<SessionData | null> {
  if (!token) return null;
  const [body, sig] = token.split(".");
  if (!body || !sig) return null;
  const expected = b64url(await hmac(secret, body));
  if (expected.length !== sig.length) return null;
  let diff = 0;
  for (let i = 0; i < expected.length; i++) diff |= expected.charCodeAt(i) ^ sig.charCodeAt(i);
  if (diff !== 0) return null;
  try {
    const data = JSON.parse(new TextDecoder().decode(fromB64url(body))) as SessionData;
    if (typeof data.n !== "string" || typeof data.e !== "number" || data.e * 1000 < Date.now()) return null;
    return data;
  } catch {
    return null;
  }
}
