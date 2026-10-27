/**
 * Références de médias dans une composition.
 *
 * La composition enregistrée (montages.html, onglet « Code ») ne contient jamais d'URL signée,
 * qui expirerait : chaque média y est désigné par une référence stable
 *   atelier-media://<id du média>/<variante>       (variante : original | poster | thumb)
 * remplacée au dernier moment par l'URL adaptée à l'usage : lien signé absolu pour l'aperçu,
 * fichier copié dans le dossier de rendu (chemin relatif) pour le rendu local, lien signé HTTPS
 * longue durée pour un rendu distant. Une composition éditée à la main garde ces références.
 */
export type MediaVariant = "original" | "poster" | "thumb";

export const MEDIA_SCHEME = "atelier-media://";

const REF_RE = /atelier-media:\/\/([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})\/(original|poster|thumb)/gi;

export function mediaRef(assetId: string, variant: MediaVariant = "original"): string {
  return `${MEDIA_SCHEME}${assetId}/${variant}`;
}

export interface MediaRefUse {
  assetId: string;
  variant: MediaVariant;
}

/** Médias référencés par une composition (sans doublons). */
export function collectMediaRefs(html: string): MediaRefUse[] {
  const seen = new Set<string>();
  const out: MediaRefUse[] = [];
  for (const m of html.matchAll(REF_RE)) {
    const key = `${m[1].toLowerCase()}/${m[2].toLowerCase()}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push({ assetId: m[1].toLowerCase(), variant: m[2].toLowerCase() as MediaVariant });
  }
  return out;
}

/** Remplace chaque référence par l'URL fournie (une référence sans URL reste telle quelle). */
export function resolveMediaRefs(html: string, urls: Map<string, string>): string {
  return html.replace(REF_RE, (whole, id: string, variant: string) => urls.get(`${id.toLowerCase()}/${variant.toLowerCase()}`) ?? whole);
}

export const refKey = (r: MediaRefUse) => `${r.assetId}/${r.variant}`;
