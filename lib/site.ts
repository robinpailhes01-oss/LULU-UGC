/**
 * Informations et textes récurrents du site. Un lien vide n'affiche rien.
 * Les offres sont dans lib/offres.ts, l'affichage des prix dans lib/pricing.ts,
 * les projets dans lib/projets.ts.
 */
export const SITE_URL = "https://www.junecontentstudio.fr";
export const SITE_NAME = "June Content Studio";
export const CONTACT_EMAIL = "harmonieyacht@gmail.com";
export const INSTAGRAM_URL = "";
export const TIKTOK_URL = "";
export const LINKEDIN_URL = "";

export const CTA = "Parlons de votre projet";
export const CTA_HREF = "/contact";

export const SIGNATURE = "Vous faites vivre l'expérience. June la fait ressentir.";
export const PROMESSE = "Des contenus qui donnent envie de vivre votre expérience. Sans avoir à les créer vous-même.";
export const POSITIONNEMENT = "Des lieux qui font vivre une expérience. Des contenus qui donnent envie de la vivre.";
export const LIEUX = "Montpellier · Alpe d'Huez — hiver 2026/27";
export const SAISON = "Présente à l'Alpe d'Huez et dans l'Oisans durant l'hiver 2026/2027.";

/** Vidéos facultatives. Laisser vide tant que le fichier n'est pas déposé dans public/video/ (sinon requête 404 à chaque visite). */
export const VIDEO = {
  hero: "",
  approche: "/video/approche.mp4",
  alpe: "/video/alpe.mp4",
};

/** Menu : libellé, lien. Les ancres pointent vers l'accueil. */
export const NAV = [
  ["Accueil", "/"],
  ["L'offre", "/offre"],
  ["Réalisations", "/realisations"],
  ["À propos", "/#apropos"],
  ["Contact", "/contact"],
] as const;
export const NAV_MOBILE = NAV;

export const METHODE: Array<[string, string, string]> = [
  ["01", "Comprendre", "Votre activité, votre clientèle et vos besoins."],
  ["02", "Révéler", "Ce qui rend votre lieu ou votre expérience particulière."],
  ["03", "Créer", "Des photos et vidéos adaptées à votre univers."],
  ["04", "Partager", "Des contenus préparés et organisés pour faciliter votre communication."],
];
