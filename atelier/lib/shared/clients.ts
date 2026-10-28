/**
 * Aides partagées (navigateur + serveur) pour les fiches clients : réseaux, normalisation des
 * adresses et identifiants, initiales et couleurs d'avatar, secteurs proposés.
 */
import type { ClientSocial, SocialPlatform } from "@/lib/shared/types";

export const SOCIAL_PLATFORMS: SocialPlatform[] = ["instagram", "tiktok", "facebook", "linkedin", "youtube"];

export const SOCIAL_LABEL: Record<SocialPlatform, string> = {
  instagram: "Instagram",
  tiktok: "TikTok",
  facebook: "Facebook",
  linkedin: "LinkedIn",
  youtube: "YouTube",
};

/** Exemple affiché dans les champs du formulaire. */
export const SOCIAL_PLACEHOLDER: Record<SocialPlatform, string> = {
  instagram: "@lecomptoir ou instagram.com/lecomptoir",
  tiktok: "@lecomptoir",
  facebook: "facebook.com/lecomptoir",
  linkedin: "linkedin.com/company/lecomptoir",
  youtube: "@lecomptoir",
};

/** Secteurs proposés (saisie libre possible). */
export const SECTOR_SUGGESTIONS = ["Restaurant", "Hôtel", "Boutique", "Bien-être", "Artisan", "Immobilier", "Événementiel", "Café", "Spa", "Gîte et chambres d'hôtes", "Caviste", "Coiffure et beauté", "Sport", "Culture"];

/** Couleurs d'avatar proposées (palette chaude de l'Atelier, contraste AA avec du texte clair). */
export const CLIENT_COLORS = ["#7F5530", "#4F5D38", "#6E4B5E", "#933E23", "#8A6A1F", "#3F5A63", "#5E4A3A", "#7A3F53"];

const HOSTS: Record<SocialPlatform, RegExp> = {
  instagram: /(^|\.)instagram\.com$/i,
  tiktok: /(^|\.)tiktok\.com$/i,
  facebook: /(^|\.)(facebook\.com|fb\.com|fb\.me)$/i,
  linkedin: /(^|\.)linkedin\.com$/i,
  youtube: /(^|\.)(youtube\.com|youtu\.be)$/i,
};

const BASE_URL: Record<SocialPlatform, (h: string) => string> = {
  instagram: (h) => `https://www.instagram.com/${h}/`,
  tiktok: (h) => `https://www.tiktok.com/@${h}`,
  facebook: (h) => `https://www.facebook.com/${h}`,
  linkedin: (h) => `https://www.linkedin.com/company/${h}/`,
  youtube: (h) => `https://www.youtube.com/@${h}`,
};

const HANDLE = /^[a-z0-9._-]{1,100}$/i;

/**
 * Normalise ce que la personne a tapé pour un réseau : « @Le.Comptoir », « instagram.com/le.comptoir »,
 * « https://www.instagram.com/le.comptoir/?hl=fr » → { handle: "le.comptoir", url: "https://www.instagram.com/le.comptoir/" }.
 * Renvoie null si le champ est vide ; lève une Error (message français) si c'est illisible.
 */
export function normalizeSocial(platform: SocialPlatform, raw: string): ClientSocial | null {
  const v = raw.trim();
  if (!v) return null;
  const label = SOCIAL_LABEL[platform];
  const looksLikeUrl = /^https?:\/\//i.test(v) || /^(www\.)?[a-z0-9-]+\.[a-z]{2,}\//i.test(v) || /\.(com|be|me)(\/|$)/i.test(v);
  if (!looksLikeUrl) {
    const handle = v.replace(/^@+/, "").replace(/\/+$/, "");
    if (!HANDLE.test(handle)) throw new Error(`${label} : identifiant invalide (« @nom » ou adresse du profil).`);
    return { platform, handle: handle.toLowerCase(), url: BASE_URL[platform](handle.toLowerCase()) };
  }
  let url: URL;
  try {
    url = new URL(/^https?:\/\//i.test(v) ? v : `https://${v}`);
  } catch {
    throw new Error(`${label} : adresse illisible.`);
  }
  if (!HOSTS[platform].test(url.hostname)) throw new Error(`${label} : cette adresse n'est pas une adresse ${label}.`);
  const parts = url.pathname.split("/").filter(Boolean);
  let handle: string | null = null;
  if (platform === "linkedin") handle = parts[0] === "company" || parts[0] === "in" || parts[0] === "school" ? parts[1] ?? null : parts[0] ?? null;
  else if (platform === "youtube") handle = parts[0]?.startsWith("@") ? parts[0].slice(1) : parts[0] === "c" || parts[0] === "user" || parts[0] === "channel" ? parts[1] ?? null : parts[0] ?? null;
  else if (platform === "facebook" && parts[0] === "profile.php") handle = url.searchParams.get("id");
  else handle = parts[0]?.replace(/^@/, "") ?? null;
  if (handle && !HANDLE.test(handle)) handle = null;
  const clean = `${url.protocol}//${url.hostname.toLowerCase()}${url.pathname.replace(/\/+$/, "") || ""}${platform === "facebook" && parts[0] === "profile.php" ? url.search : ""}`;
  return { platform, handle: handle ? handle.toLowerCase() : null, url: clean };
}

/** Normalise l'adresse d'un site : « lecomptoir.fr » → « https://lecomptoir.fr ». Null si vide. */
export function normalizeWebsite(raw: string | null | undefined): string | null {
  const v = (raw ?? "").trim();
  if (!v) return null;
  let url: URL;
  try {
    url = new URL(/^https?:\/\//i.test(v) ? v : `https://${v}`);
  } catch {
    throw new Error("Site web : adresse illisible.");
  }
  if (!/\./.test(url.hostname)) throw new Error("Site web : adresse illisible.");
  const path = url.pathname.replace(/\/+$/, "");
  return `${url.protocol}//${url.hostname.toLowerCase()}${path}${url.search}`;
}

/** Initiales d'un nom de client : « Le Comptoir du Port » → « CP », « Hôtel Mira » → « HM », « Le Comptoir » → « LC ». */
export function clientInitials(name: string): string {
  const stop = new Set(["le", "la", "les", "l", "de", "du", "des", "d", "et", "a", "au", "aux", "the", "&"]);
  const words = name
    .replace(/[’']/g, " ")
    .split(/[\s\-_/]+/)
    .filter(Boolean);
  const main = words.filter((w) => !stop.has(w.toLowerCase()));
  const pick = (main.length >= 2 ? main : words).slice(0, 2);
  const out = pick.map((w) => w[0]).join("");
  return (out || name.slice(0, 2) || "?").toUpperCase();
}

/** Couleur d'avatar stable d'après le nom (quand aucune couleur n'est choisie). */
export function clientColor(c: { color: string | null; name: string }): string {
  if (c.color && /^#[0-9a-f]{6}$/i.test(c.color)) return c.color;
  let h = 0;
  for (const ch of c.name) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  return CLIENT_COLORS[h % CLIENT_COLORS.length];
}

/** Adresse sans protocole, pour l'affichage. */
export function displayUrl(url: string): string {
  return url.replace(/^https?:\/\/(www\.)?/i, "").replace(/\/$/, "");
}
