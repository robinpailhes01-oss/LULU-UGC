/** Constantes du site June Content Studio (Content Experience). */

export const CONTACT_EMAIL = "harmonieyacht@gmail.com";

/**
 * Lien de prise de rendez-vous (Calendly). Tant qu'il n'est pas fourni via
 * NEXT_PUBLIC_CALENDLY_URL, le bouton ouvre un email pré-rempli.
 */
export const APPEL_URL =
  process.env.NEXT_PUBLIC_CALENDLY_URL ||
  `mailto:${CONTACT_EMAIL}?subject=${encodeURIComponent("Réserver un appel : Content Experience")}&body=${encodeURIComponent(
    "Bonjour Ludivine,\n\nJe souhaite réserver un appel pour parler de mon établissement.\n\nNom du lieu :\nLien de l'annonce :\nMes disponibilités :\n"
  )}`;

export const APPEL_EXTERNE = APPEL_URL.startsWith("http");

/** Lien Instagram : à confirmer par Ludivine. */
export const INSTAGRAM_URL = "";

export const CTA = "Réserver un appel";
