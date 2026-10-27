import { fileURLToPath } from "node:url";

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Application autonome dans le dépôt du site : la racine de traçage est ce dossier.
  outputFileTracingRoot: fileURLToPath(new URL(".", import.meta.url)),
  // Permet de lancer plusieurs serveurs de dev en parallèle (un dossier de build chacun).
  distDir: process.env.NEXT_DIST_DIR || ".next",
  // Paquets natifs ou WASM chargés tels quels côté serveur (pas de bundling).
  serverExternalPackages: ["@electric-sql/pglite", "sharp", "postgres", "@hyperframes/lint"],
  experimental: {
    serverActions: { bodySizeLimit: "4mb" },
  },
  images: { unoptimized: true },
};

export default nextConfig;
