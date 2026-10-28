import "server-only";
import { createHmac, timingSafeEqual } from "node:crypto";
import { env } from "@/lib/server/env";
import { HttpError, notConfigured } from "@/lib/server/http";
import type {
  ZAccountsResponse,
  ZCreatePostRequest,
  ZErrorBody,
  ZNextSlot,
  ZPost,
  ZPostWriteResponse,
  ZPresignContentType,
  ZPresignResponse,
  ZProfile,
  ZTikTokCreatorInfo,
  ZUpdatePostRequest,
  ZValidateMediaResponse,
  ZValidatePostResponse,
  ZWriteResult,
} from "@/lib/server/zernio/types";

/**
 * Client HTTP typé de Zernio (fetch, côté serveur uniquement).
 * - Authorization: Bearer ZERNIO_API_KEY (la clé n'est jamais journalisée ni renvoyée) ;
 * - 429 / 503 : on attend Retry-After puis on réessaie (2 fois au plus) ;
 * - 207 : une réussite HTTP qui signale une publication incomplète, toujours renvoyée à part ;
 * - les erreurs deviennent des HttpError au message français (avec le message de Zernio).
 */

export const NOT_CONFIGURED_MESSAGE = "Connectez Zernio dans Réglages (ZERNIO_API_KEY) pour programmer.";

const MAX_RETRIES = 2;
const MAX_WAIT_S = 20;
const JSON_TIMEOUT_MS = 30_000;
const UPLOAD_TIMEOUT_MS = 10 * 60_000;

type Query = Record<string, string | number | boolean | undefined | null>;
interface RequestOpts {
  query?: Query;
  body?: unknown;
  headers?: Record<string, string>;
}

/** Erreur renvoyée par Zernio, conservée telle quelle (statut, code stable, identifiant de requête). */
export class ZernioError extends HttpError {
  constructor(
    status: number,
    code: string,
    message: string,
    public readonly zernio: { status: number; body: ZErrorBody | null; requestId: string | null; retryAfterS: number | null },
  ) {
    super(status, code, message);
  }
  get zernioCode(): string | undefined {
    return this.zernio.body?.code;
  }
}

function zernioMessage(body: ZErrorBody | null): string {
  if (!body) return "";
  const m = typeof body.error === "string" ? body.error : "";
  return m ? ` (Zernio : ${m.replace(/\s+/g, " ").slice(0, 300)})` : "";
}

/** Traduit une réponse d'erreur Zernio en message affichable. */
export function toZernioError(status: number, body: ZErrorBody | null, requestId: string | null, retryAfterS: number | null): ZernioError {
  const code = body?.code ?? "";
  const detail = zernioMessage(body);
  const meta = { status, body, requestId, retryAfterS };
  let out: [number, string, string];
  if (status === 401) out = [502, "zernio_auth", `La clé Zernio est refusée : vérifiez ZERNIO_API_KEY dans les Réglages.${detail}`];
  else if (status === 402) out = [402, "zernio_payment", `L'abonnement Zernio demande une action (paiement).${detail}`];
  else if (status === 403) {
    if (code === "ACCOUNT_DISCONNECTED") out = [403, "zernio_account_disconnected", `Un compte est déconnecté de Zernio : reconnectez-le dans Zernio, puis réessayez.${detail}`];
    else if (code === "ACCOUNT_NOT_ENABLED_FOR_POSTING") out = [403, "zernio_account_disabled", `Ce compte ne peut pas publier via Zernio.${detail}`];
    else out = [403, "zernio_forbidden", `Zernio refuse l'accès à cette ressource.${detail}`];
  } else if (status === 404) out = [404, "zernio_not_found", `Introuvable chez Zernio.${detail}`];
  else if (status === 409) {
    if (code === "idempotency_conflict") out = [409, "zernio_in_progress", `Zernio traite déjà cette publication : patientez quelques secondes.${detail}`];
    else if (code === "queue_slot_conflict") out = [409, "zernio_slot_taken", `Ce créneau de la file vient d'être pris : choisissez une autre heure.${detail}`];
    else out = [409, "zernio_duplicate", `Zernio a déjà reçu une publication identique pour ce compte dans les dernières 24 h : modifiez la légende ou les médias.${detail}`];
  } else if (status === 429) out = [429, "zernio_rate_limited", `Trop de requêtes vers Zernio${retryAfterS ? ` : réessayez dans ${retryAfterS} s` : " : réessayez dans un instant"}.${detail}`];
  else if (status >= 500) out = [502, "zernio_unavailable", `Zernio est momentanément indisponible : réessayez dans quelques minutes.${detail}`];
  else out = [400, code ? `zernio_${code.toLowerCase()}` : "zernio_invalid", `Zernio a refusé la demande${detail || "."}`];
  return new ZernioError(out[0], out[1], out[2], meta);
}

function parseJson(text: string): unknown {
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch {
    return { error: text.slice(0, 300) };
  }
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

export class ZernioClient {
  constructor(
    private readonly apiKey: string,
    private readonly baseUrl: string,
  ) {}

  private async request<T>(method: string, path: string, o: RequestOpts = {}): Promise<{ status: number; data: T }> {
    const url = new URL(this.baseUrl + path);
    for (const [k, v] of Object.entries(o.query ?? {})) if (v !== undefined && v !== null && v !== "") url.searchParams.set(k, String(v));
    for (let attempt = 0; ; attempt++) {
      let res: Response;
      try {
        res = await fetch(url, {
          method,
          cache: "no-store",
          signal: AbortSignal.timeout(JSON_TIMEOUT_MS),
          headers: {
            Authorization: `Bearer ${this.apiKey}`,
            Accept: "application/json",
            ...(o.body !== undefined ? { "Content-Type": "application/json" } : {}),
            ...o.headers,
          },
          body: o.body !== undefined ? JSON.stringify(o.body) : undefined,
        });
      } catch (err) {
        const timeout = err instanceof Error && (err.name === "TimeoutError" || err.name === "AbortError");
        throw new HttpError(502, "zernio_unreachable", timeout ? "Zernio ne répond pas (délai dépassé) : réessayez dans un instant." : "Impossible de joindre Zernio : vérifiez la connexion du serveur.");
      }
      const retryAfterS = Number(res.headers.get("retry-after")) || null;
      // POST /v1/posts peut être rejoué sans risque : il porte toujours un Idempotency-Key.
      if ((res.status === 429 || res.status === 503) && attempt < MAX_RETRIES) {
        const waitS = Math.min(MAX_WAIT_S, retryAfterS ?? 2 ** attempt);
        await res.text().catch(() => undefined);
        await sleep(waitS * 1000);
        continue;
      }
      const data = parseJson(await res.text());
      if (!res.ok) throw toZernioError(res.status, data as ZErrorBody | null, res.headers.get("x-request-id"), retryAfterS);
      return { status: res.status, data: data as T };
    }
  }

  private write(method: "POST" | "PUT", path: string, body: unknown, headers?: Record<string, string>): Promise<ZWriteResult> {
    return this.request<ZPostWriteResponse>(method, path, { body, headers }).then(({ status, data }) => {
      if (status === 207) return { kind: "incomplete", status, body: data } as const;
      if (status === 201) return { kind: "created", status, body: data } as const;
      return { kind: "ok", status: 200, body: data } as const;
    });
  }

  // Profils et comptes -------------------------------------------------------------------------
  listProfiles(q: { externalId?: string; name?: string } = {}) {
    return this.request<{ profiles: ZProfile[] }>("GET", "/v1/profiles", { query: q }).then((r) => r.data.profiles ?? []);
  }
  /** POST /v1/profiles — un profil par client (externalId = identifiant du client dans l'Atelier). */
  createProfile(input: { name: string; description?: string; color?: string; timezone?: string; externalId?: string }, idempotencyKey?: string) {
    return this.request<{ message?: string; profile: ZProfile }>("POST", "/v1/profiles", { body: input, headers: idempotencyKey ? { "Idempotency-Key": idempotencyKey } : undefined }).then((r) => r.data.profile);
  }
  /**
   * GET /v1/connect/{platform}?profileId&redirect_url → { authUrl, state }. Zernio renvoie ensuite
   * le navigateur sur redirect_url avec connected=<plateforme>&profileId&accountId&username, ou
   * error=<code>&platform (et error_message facultatif).
   */
  connectUrl(platform: string, q: { profileId: string; redirectUrl: string }) {
    return this.request<{ authUrl: string; state?: string }>("GET", `/v1/connect/${encodeURIComponent(platform)}`, { query: { profileId: q.profileId, redirect_url: q.redirectUrl } }).then((r) => r.data);
  }
  listAccounts(q: { profileId?: string; platform?: string } = {}) {
    return this.request<ZAccountsResponse>("GET", "/v1/accounts", { query: q }).then((r) => r.data.accounts ?? []);
  }
  tiktokCreatorInfo(accountId: string, mediaType: "video" | "photo" = "video") {
    return this.request<ZTikTokCreatorInfo>("GET", `/v1/accounts/${encodeURIComponent(accountId)}/tiktok/creator-info`, { query: { mediaType } }).then((r) => r.data);
  }

  // Médias -------------------------------------------------------------------------------------
  presign(req: { filename: string; contentType: ZPresignContentType; size?: number }) {
    return this.request<ZPresignResponse>("POST", "/v1/media/presign", { body: req }).then((r) => r.data);
  }

  /** PUT des octets sur l'URL pré-signée de Zernio (sans en-tête Authorization). Longueur toujours fournie. */
  async upload(uploadUrl: string, body: Buffer | ReadableStream<Uint8Array>, contentType: string, size: number): Promise<void> {
    const init: RequestInit & { duplex?: "half" } = {
      method: "PUT",
      headers: { "Content-Type": contentType, "Content-Length": String(size) },
      body: body as BodyInit,
      signal: AbortSignal.timeout(UPLOAD_TIMEOUT_MS),
    };
    if (!(body instanceof Buffer)) init.duplex = "half";
    let res: Response;
    try {
      res = await fetch(uploadUrl, init);
    } catch {
      throw new HttpError(502, "zernio_upload_failed", "L'envoi du média vers Zernio a échoué (connexion interrompue) : réessayez.");
    }
    if (!res.ok) {
      const text = await res.text().catch(() => "");
      throw new HttpError(502, "zernio_upload_failed", `L'envoi du média vers Zernio a échoué (HTTP ${res.status})${text ? ` : ${text.slice(0, 160)}` : "."}`);
    }
  }

  validateMedia(url: string) {
    return this.request<ZValidateMediaResponse>("POST", "/v1/tools/validate/media", { body: { url } }).then((r) => r.data);
  }

  // Publications -------------------------------------------------------------------------------
  validatePost(req: ZCreatePostRequest) {
    return this.request<ZValidatePostResponse>("POST", "/v1/tools/validate/post", { body: req }).then((r) => r.data);
  }
  createPost(req: ZCreatePostRequest, idempotencyKey: string) {
    return this.write("POST", "/v1/posts", req, { "Idempotency-Key": idempotencyKey });
  }
  getPost(postId: string) {
    return this.request<{ post: ZPost }>("GET", `/v1/posts/${encodeURIComponent(postId)}`).then((r) => r.data.post);
  }
  listPosts(q: { status?: string; fromDate?: string; toDate?: string; limit?: number; page?: number; sortBy?: string } = {}) {
    return this.request<{ posts: ZPost[] }>("GET", "/v1/posts", { query: q }).then((r) => r.data.posts ?? []);
  }
  updatePost(postId: string, patch: ZUpdatePostRequest) {
    return this.write("PUT", `/v1/posts/${encodeURIComponent(postId)}`, patch);
  }
  deletePost(postId: string) {
    return this.request<{ message?: string }>("DELETE", `/v1/posts/${encodeURIComponent(postId)}`).then((r) => r.data);
  }
  retryPost(postId: string) {
    return this.write("POST", `/v1/posts/${encodeURIComponent(postId)}/retry`, {});
  }

  // File de publication ------------------------------------------------------------------------
  nextSlot(profileId: string, queueId?: string) {
    return this.request<ZNextSlot>("GET", "/v1/queue/next-slot", { query: { profileId, queueId } }).then((r) => r.data);
  }
}

/** Client configuré depuis l'environnement ; lève « non configuré » sans clé. */
export function getZernio(): ZernioClient {
  if (!env.zernio.apiKey) throw notConfigured(NOT_CONFIGURED_MESSAGE);
  return new ZernioClient(env.zernio.apiKey, env.zernio.baseUrl);
}

/** X-Zernio-Signature = HMAC-SHA256 hexadécimal (minuscules) du corps brut. Comparaison à temps constant. */
export function verifyZernioSignature(rawBody: string, signatureHeader: string | null, secret: string): boolean {
  if (!signatureHeader) return false;
  const expected = Buffer.from(createHmac("sha256", secret).update(rawBody, "utf8").digest("hex"), "utf8");
  const given = Buffer.from(signatureHeader.trim().toLowerCase().replace(/^sha256=/, ""), "utf8");
  return expected.length === given.length && timingSafeEqual(expected, given);
}
