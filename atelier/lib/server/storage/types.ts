/**
 * Stockage des fichiers (photos, vidéos, vignettes, rendus). Deux implémentations :
 * S3 compatible (Cloudflare R2, Supabase Storage S3, AWS…) et disque local.
 * Le navigateur envoie toujours les fichiers directement au stockage via des URLs signées,
 * sans passer par le serveur Next (pas de limite de taille de requête Vercel).
 */
export interface PresignedPut {
  url: string;
  method: "PUT";
  headers: Record<string, string>;
}

export interface BlobHead {
  size: number;
  contentType: string | null;
}

export interface BlobStore {
  readonly kind: "s3" | "local";

  /** URL d'envoi direct (PUT) d'un fichier entier. */
  presignPut(key: string, contentType: string, ttlS?: number): Promise<PresignedPut>;

  /** Envoi en plusieurs parties pour les gros fichiers (parts de 5 Mo minimum sauf la dernière). */
  createMultipart(key: string, contentType: string): Promise<{ uploadId: string }>;
  presignPart(key: string, uploadId: string, partNumber: number, ttlS?: number): Promise<string>;
  completeMultipart(key: string, uploadId: string, parts: { partNumber: number; etag: string }[]): Promise<void>;
  abortMultipart(key: string, uploadId: string): Promise<void>;

  /**
   * URL de lecture absolue. En S3 : URL pré-signée (ou domaine public) lisible par n'importe qui
   * disposant du lien, donc utilisable par Zernio, le rendu HyperFrames et Claude.
   * En local : URL signée vers /api/blob, accessible seulement depuis cette machine.
   */
  presignGet(key: string, opts?: { ttlS?: number; filename?: string; stable?: boolean }): Promise<string>;

  put(key: string, body: Buffer | Uint8Array, contentType: string): Promise<void>;
  getBuffer(key: string): Promise<Buffer>;
  head(key: string): Promise<BlobHead | null>;
  delete(keys: string[]): Promise<void>;
}

/** Clés de stockage normalisées. */
export const keys = {
  original: (assetId: string, ext: string) => `assets/${assetId}/original${ext ? `.${ext.replace(/^\./, "").toLowerCase()}` : ""}`,
  thumb: (assetId: string) => `assets/${assetId}/thumb.webp`,
  poster: (assetId: string) => `assets/${assetId}/poster.webp`,
};

export function extFromName(name: string): string {
  const m = /\.([a-z0-9]{1,8})$/i.exec(name);
  return m ? m[1].toLowerCase() : "";
}
