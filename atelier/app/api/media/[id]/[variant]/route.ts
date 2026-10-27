import { NextResponse } from "next/server";
import { notFound, route } from "@/lib/server/http";
import { getStorageKeys } from "@/lib/server/repo/assets";
import { getStore } from "@/lib/server/storage";

/**
 * URL stable d'un média pour <img>/<video> : redirige vers le stockage (URL signée, stable à
 * l'heure près pour profiter du cache). Variantes : original, thumb, poster, download.
 */
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export const GET = route<{ params: Promise<{ id: string; variant: string }> }>(async (_req, { params }) => {
  const { id, variant } = await params;
  const k = await getStorageKeys(id);
  if (!k) throw notFound("Média");
  const store = getStore();
  let target: string | null;
  switch (variant) {
    case "original":
      target = await store.presignGet(k.original, { stable: true });
      break;
    case "thumb":
      target = k.thumb ? await store.presignGet(k.thumb, { stable: true }) : k.mime.startsWith("image/") ? await store.presignGet(k.original, { stable: true }) : null;
      break;
    case "poster":
      target = k.poster ? await store.presignGet(k.poster, { stable: true }) : null;
      break;
    case "download":
      target = await store.presignGet(k.original, { filename: k.name, ttlS: 3600 });
      break;
    default:
      throw notFound("Variante");
  }
  if (!target) throw notFound("Aperçu");
  // En local, presignGet renvoie une URL absolue sur ATELIER_APP_URL : on la rend relative pour
  // fonctionner quel que soit l'hôte utilisé dans le navigateur (localhost, IP du réseau…).
  const location = target.startsWith("http") && store.kind === "local" ? new URL(target).pathname + new URL(target).search : target;
  return new NextResponse(null, {
    status: 302,
    headers: { Location: location, "Cache-Control": variant === "download" ? "no-store" : "private, max-age=1800" },
  });
});
