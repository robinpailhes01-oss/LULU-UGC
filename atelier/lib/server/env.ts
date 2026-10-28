import "server-only";
import path from "node:path";

/**
 * Configuration centrale d'Atelier, lue une seule fois depuis les variables d'environnement.
 *
 * Deux modes, choisis automatiquement :
 * - « local » : aucune clé nécessaire. Base Postgres embarquée (PGlite) et fichiers sur disque
 *   dans ATELIER_DATA_DIR (par défaut .atelier-data/). Idéal pour tester et travailler hors ligne.
 * - « cloud » : DATABASE_URL (Supabase) pour les métadonnées, stockage S3 compatible
 *   (Cloudflare R2 recommandé) pour les photos et vidéos.
 */

function str(name: string): string | undefined {
  const v = process.env[name];
  return v && v.trim() !== "" ? v.trim() : undefined;
}

const dataDir = path.resolve(process.cwd(), str("ATELIER_DATA_DIR") ?? ".atelier-data");

const s3Configured = Boolean(str("S3_BUCKET") && str("S3_ACCESS_KEY_ID") && str("S3_SECRET_ACCESS_KEY") && (str("S3_ENDPOINT") || str("R2_ACCOUNT_ID")));

export type RenderProvider = "local" | "sandbox" | "heygen" | "none";

function renderProvider(): RenderProvider {
  const v = str("HYPERFRAMES_RENDER");
  if (v === "local" || v === "sandbox" || v === "heygen" || v === "none") return v;
  // Par défaut : rendu local en développement (Chrome + FFmpeg sur la machine), sinon aucun.
  return process.env.NODE_ENV === "production" ? "none" : "local";
}

export const env = {
  isProd: process.env.NODE_ENV === "production",
  appUrl: (str("ATELIER_APP_URL") ?? "http://localhost:3100").replace(/\/$/, ""),
  /** Nom du produit affiché (logo de la barre latérale, titres des pages). Une installation par agence. */
  appName: str("ATELIER_NAME") ?? "Atelier",
  dataDir,

  db: {
    kind: (str("DATABASE_URL") ? "postgres" : "pglite") as "postgres" | "pglite",
    url: str("DATABASE_URL"),
    pgliteDir: path.join(dataDir, "pglite"),
  },

  storage: {
    kind: (s3Configured ? "s3" : "local") as "s3" | "local",
    localDir: path.join(dataDir, "blobs"),
    s3: {
      endpoint: str("S3_ENDPOINT") ?? (str("R2_ACCOUNT_ID") ? `https://${str("R2_ACCOUNT_ID")}.r2.cloudflarestorage.com` : undefined),
      region: str("S3_REGION") ?? "auto",
      bucket: str("S3_BUCKET") ?? "",
      accessKeyId: str("S3_ACCESS_KEY_ID") ?? "",
      secretAccessKey: str("S3_SECRET_ACCESS_KEY") ?? "",
      /** Domaine public optionnel (bucket R2 public ou domaine personnalisé). Sinon URLs pré-signées. */
      publicBaseUrl: str("S3_PUBLIC_BASE_URL")?.replace(/\/$/, ""),
      forcePathStyle: str("S3_FORCE_PATH_STYLE") === "true",
    },
  },

  auth: {
    password: str("ATELIER_PASSWORD"),
    /** Secret de signature des sessions et des liens de fichiers locaux. */
    secret: str("ATELIER_SECRET") ?? str("ATELIER_PASSWORD") ?? "atelier-local-dev-secret",
    team: (str("ATELIER_TEAM") ?? "Ludivine,Robin").split(",").map((s) => s.trim()).filter(Boolean),
  },

  ai: {
    apiKey: str("ANTHROPIC_API_KEY"),
    model: str("ATELIER_MODEL") ?? "claude-opus-5-5",
  },

  zernio: {
    apiKey: str("ZERNIO_API_KEY"),
    baseUrl: (str("ZERNIO_API_URL") ?? "https://zernio.com/api").replace(/\/$/, ""),
    webhookSecret: str("ZERNIO_WEBHOOK_SECRET"),
    timezone: str("ATELIER_TIMEZONE") ?? "Europe/Paris",
  },

  hyperframes: {
    render: renderProvider(),
    heygenApiKey: str("HEYGEN_API_KEY"),
    vercelSandboxToken: str("VERCEL_TOKEN"),
    vercelTeamId: str("VERCEL_TEAM_ID"),
    vercelProjectId: str("VERCEL_PROJECT_ID"),
  },
} as const;

export type AtelierEnv = typeof env;

/** Résumé non sensible de la configuration, pour la page Réglages et /api/health. */
export function configStatus() {
  return {
    mode: env.db.kind === "postgres" && env.storage.kind === "s3" ? "cloud" : env.db.kind === "pglite" && env.storage.kind === "local" ? "local" : "mixte",
    database: env.db.kind,
    storage: env.storage.kind,
    storagePublicDomain: Boolean(env.storage.s3.publicBaseUrl),
    auth: Boolean(env.auth.password),
    team: env.auth.team,
    ai: Boolean(env.ai.apiKey),
    model: env.ai.model,
    zernio: Boolean(env.zernio.apiKey),
    timezone: env.zernio.timezone,
    render: env.hyperframes.render,
    appUrl: env.appUrl,
    appName: env.appName,
  };
}

export type ConfigStatus = ReturnType<typeof configStatus>;
