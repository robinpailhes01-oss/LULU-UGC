"use client";

import { ApiError } from "@/lib/client/api";

/** Envoi annulé par l'utilisateur. */
export class AbortedError extends Error {
  constructor() {
    super("Envoi annulé.");
  }
}

/** Échec d'envoi vers le stockage (statut HTTP 0 = réseau). */
export class StorageError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
  get retryable() {
    return this.status === 0 || this.status === 408 || this.status === 429 || this.status >= 500;
  }
}

function storageMessage(status: number): string {
  if (status === 0) return "Connexion interrompue pendant l'envoi.";
  if (status === 403) return "Lien d'envoi refusé ou expiré.";
  if (status === 413) return "Fichier trop volumineux pour le stockage.";
  if (status >= 500) return `Le stockage ne répond pas (erreur ${status}).`;
  return `Envoi refusé par le stockage (erreur ${status}).`;
}

/** PUT direct vers le stockage avec suivi de progression (XMLHttpRequest). */
export function xhrPut(
  url: string,
  body: Blob,
  headers: Record<string, string>,
  opts: { signal?: AbortSignal; onProgress?: (loaded: number) => void } = {},
): Promise<{ etag: string | null }> {
  return new Promise((resolve, reject) => {
    if (opts.signal?.aborted) return reject(new AbortedError());
    const xhr = new XMLHttpRequest();
    const onAbort = () => xhr.abort();
    opts.signal?.addEventListener("abort", onAbort, { once: true });
    const cleanup = () => opts.signal?.removeEventListener("abort", onAbort);
    xhr.open("PUT", url, true);
    for (const [k, v] of Object.entries(headers)) {
      // Les navigateurs interdisent certains en-têtes (Content-Length…) : on les ignore.
      if (/^(content-length|host|connection)$/i.test(k)) continue;
      xhr.setRequestHeader(k, v);
    }
    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable) opts.onProgress?.(e.loaded);
    };
    xhr.onload = () => {
      cleanup();
      if (xhr.status >= 200 && xhr.status < 300) {
        opts.onProgress?.(body.size);
        resolve({ etag: xhr.getResponseHeader("ETag") ?? xhr.getResponseHeader("etag") });
      } else reject(new StorageError(xhr.status, storageMessage(xhr.status)));
    };
    xhr.onerror = () => {
      cleanup();
      reject(new StorageError(0, storageMessage(0)));
    };
    xhr.ontimeout = () => {
      cleanup();
      reject(new StorageError(0, storageMessage(0)));
    };
    xhr.onabort = () => {
      cleanup();
      reject(new AbortedError());
    };
    xhr.send(body);
  });
}

/** POST JSON vers l'API d'Atelier, annulable, avec les erreurs françaises du serveur. */
export async function postJson<T>(path: string, body: unknown, signal?: AbortSignal): Promise<T> {
  let res: Response;
  try {
    res = await fetch(path, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body), credentials: "same-origin", signal });
  } catch (err) {
    if (signal?.aborted) throw new AbortedError();
    throw new ApiError(0, "network", err instanceof Error && /fetch/i.test(err.message) ? "Serveur injoignable : vérifiez la connexion." : "Serveur injoignable.");
  }
  if (res.status === 401 && typeof window !== "undefined") {
    window.location.href = `/login?next=${encodeURIComponent(window.location.pathname + window.location.search)}`;
  }
  const text = await res.text();
  let data: unknown = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = null;
  }
  if (!res.ok) {
    const e = (data as { error?: { code?: string; message?: string } } | null)?.error;
    throw new ApiError(res.status, e?.code ?? "http_error", e?.message ?? `Erreur ${res.status}`);
  }
  return data as T;
}

export function sleep(ms: number, signal?: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    if (signal?.aborted) return reject(new AbortedError());
    const t = window.setTimeout(() => {
      signal?.removeEventListener("abort", onAbort);
      resolve();
    }, ms);
    const onAbort = () => {
      window.clearTimeout(t);
      reject(new AbortedError());
    };
    signal?.addEventListener("abort", onAbort, { once: true });
  });
}
