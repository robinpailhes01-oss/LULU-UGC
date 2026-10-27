/**
 * Client minimal de l'API HeyGen « HyperFrames Cloud Render » (REST v3, clé x-api-key).
 * Module pur (fetch injectable) pour pouvoir vérifier la construction des requêtes sans réseau.
 *
 *   1. POST /v3/assets/direct-uploads           → asset_id + upload_url (+ upload_headers)
 *   2. PUT  upload_url                           (zip du projet : index.html à la racine)
 *   3. POST /v3/assets/{asset_id}/complete       (409 « pas encore arrivé » → nouvel essai)
 *   4. POST /v3/hyperframes/renders              → render_id (202)
 *   5. GET  /v3/hyperframes/renders/{render_id}  → status queued | rendering | completed | failed
 * Les réponses enveloppent la donnée dans { data } ; les erreurs dans { error: { code, message } }.
 */
import { createHash } from "node:crypto";
import { strToU8, zipSync } from "fflate";

export const HEYGEN_BASE_URL = "https://api.heygen.com";

export type FetchLike = (url: string, init?: { method?: string; headers?: Record<string, string>; body?: string | Uint8Array }) => Promise<{
  ok: boolean;
  status: number;
  json: () => Promise<unknown>;
  text: () => Promise<string>;
}>;

export interface HeygenRender {
  render_id: string;
  status: "queued" | "rendering" | "completed" | "failed" | string;
  video_url?: string | null;
  thumbnail_url?: string | null;
  duration?: number | null;
  failure_message?: string | null;
  failure_code?: string | null;
}

export class HeygenError extends Error {
  constructor(
    public status: number,
    public code: string,
    message: string,
  ) {
    super(message);
  }
}

export interface HeygenClientOptions {
  apiKey: string;
  baseUrl?: string;
  fetch?: FetchLike;
  sleep?: (ms: number) => Promise<void>;
}

export function createHeygenClient(opts: HeygenClientOptions) {
  const base = (opts.baseUrl ?? HEYGEN_BASE_URL).replace(/\/$/, "");
  const doFetch: FetchLike = opts.fetch ?? (globalThis.fetch as unknown as FetchLike);
  const sleep = opts.sleep ?? ((ms: number) => new Promise<void>((r) => setTimeout(r, ms)));
  const auth = { "x-api-key": opts.apiKey };

  async function call<T>(method: string, pathName: string, body?: unknown, extraHeaders: Record<string, string> = {}): Promise<{ status: number; data: T }> {
    const res = await doFetch(`${base}${pathName}`, {
      method,
      headers: { ...auth, accept: "application/json", ...(body !== undefined ? { "content-type": "application/json" } : {}), ...extraHeaders },
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
    const text = await res.text();
    let json: unknown = null;
    try {
      json = text ? JSON.parse(text) : null;
    } catch {
      json = null;
    }
    if (!res.ok) {
      const err = (json as { error?: { code?: string; message?: string } } | null)?.error;
      throw new HeygenError(res.status, err?.code ?? `http_${res.status}`, err?.message ?? (text.slice(0, 300) || `HTTP ${res.status}`));
    }
    const data = ((json as { data?: unknown } | null)?.data ?? json) as T;
    return { status: res.status, data };
  }

  return {
    /** Projet HyperFrames zippé (index.html à la racine). */
    zipProject(html: string): Uint8Array {
      return zipSync({ "index.html": strToU8(html) }, { level: 9 });
    },

    /** Envoie le projet et lance le rendu ; renvoie l'identifiant du rendu. */
    async submit(params: { html: string; jobId: string; fps: number; aspectRatio: "9:16" | "16:9" | "1:1"; title: string; callbackUrl?: string | null }): Promise<string> {
      const zip = this.zipProject(params.html);
      const sha = createHash("sha256").update(zip).digest("hex");
      const idem = `atelier-${params.jobId}`.replace(/[^A-Za-z0-9_:.-]/g, "-").slice(0, 255);
      const { data: init } = await call<{ asset_id: string; upload_url: string; upload_headers?: Record<string, string> }>(
        "POST",
        "/v3/assets/direct-uploads",
        { filename: "project.zip", content_type: "application/zip", size_bytes: zip.byteLength, checksum_sha256: sha },
        { "Idempotency-Key": `${idem}-upload` },
      );
      const put = await doFetch(init.upload_url, { method: "PUT", headers: { ...(init.upload_headers ?? {}) }, body: zip });
      if (!put.ok) throw new HeygenError(put.status, "upload_failed", `Envoi du projet à HeyGen refusé (HTTP ${put.status}).`);
      let assetId: string | null = null;
      for (let i = 0; i < 6; i++) {
        try {
          const { data } = await call<{ asset_id: string }>("POST", `/v3/assets/${encodeURIComponent(init.asset_id)}/complete`, { checksum_sha256: sha });
          assetId = data.asset_id ?? init.asset_id;
          break;
        } catch (err) {
          if (err instanceof HeygenError && err.status === 409 && i < 5) {
            await sleep(500 * 2 ** i);
            continue;
          }
          throw err;
        }
      }
      const { data } = await call<{ render_id: string }>(
        "POST",
        "/v3/hyperframes/renders",
        {
          project: { type: "asset_id", asset_id: assetId ?? init.asset_id },
          fps: params.fps,
          quality: "standard",
          format: "mp4",
          resolution: "1080p",
          aspect_ratio: params.aspectRatio,
          composition: "index.html",
          title: params.title.slice(0, 200),
          callback_id: params.jobId,
          ...(params.callbackUrl ? { callback_url: params.callbackUrl } : {}),
        },
        { "Idempotency-Key": `${idem}-render` },
      );
      if (!data?.render_id) throw new HeygenError(502, "no_render_id", "HeyGen n'a pas renvoyé d'identifiant de rendu.");
      return data.render_id;
    },

    async get(renderId: string): Promise<HeygenRender> {
      const { data } = await call<HeygenRender>("GET", `/v3/hyperframes/renders/${encodeURIComponent(renderId)}`);
      return data;
    },

    async cancel(renderId: string): Promise<void> {
      await call("DELETE", `/v3/hyperframes/renders/${encodeURIComponent(renderId)}`).catch(() => undefined);
    },
  };
}

export type HeygenClient = ReturnType<typeof createHeygenClient>;
