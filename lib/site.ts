/** Coordonnées et libellés partagés. Un lien vide n'affiche rien. */
export const CONTACT_EMAIL = "harmonieyacht@gmail.com";
export const INSTAGRAM_URL = "";
export const TIKTOK_URL = "";
export const LINKEDIN_URL = "";
export const CTA = "Parler de mon projet";
export const VIDEO = {
  hero: "/video/hero.mp4",
  approche: "/video/approche.mp4",
  alpe: "/video/alpe.mp4",
};
export const NAV = [
  ["Approche", "#approche"],
  ["Expériences", "#experiences"],
  ["Content Experience", "#content-experience"],
  ["À propos", "#apropos"],
] as const;
export const NAV_MOBILE = [...NAV, ["Contact", "#contact"]] as const;
