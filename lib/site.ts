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

export const CTA = "Parler de votre projet";
export const CTA_HREF = "/contact";

export const SIGNATURE = "Vous faites vivre l'expérience. June trouve comment la raconter.";
export const POSITIONNEMENT = "Des lieux qui font vivre une expérience. Des contenus qui donnent envie de la vivre.";
export const LIEUX = "Montpellier · Alpe d'Huez — Hiver 26/27";
export const SAISON = "Présente à l'Alpe d'Huez et dans l'Oisans durant l'hiver 2026/2027.";

export const VIDEO = {
  hero: "/video/hero.mp4",
  approche: "/video/approche.mp4",
  alpe: "/video/alpe.mp4",
};

/** Menu : libellé, lien. Les ancres pointent vers l'accueil. */
export const NAV = [
  ["Réalisations", "/realisations"],
  ["Services", "/services"],
  ["L'approche", "/#approche"],
  ["À propos", "/#apropos"],
] as const;
export const NAV_MOBILE = [...NAV, ["Contact", "/contact"]] as const;

export const METHODE: Array<[string, string, string]> = [
  ["01", "Comprendre", "Votre lieu, vos clients et ce que vous souhaitez transmettre."],
  ["02", "Révéler", "Identifier les moments qui rendent votre expérience particulière."],
  ["03", "Vivre", "Découvrir ou capturer l'expérience au plus près de la réalité."],
  ["04", "Raconter", "Créer les contenus qui permettront à vos futurs clients de se projeter."],
];
