/**
 * Stratégie d'affichage des prix. À modifier ici, et nulle part ailleurs.
 *
 * PRICE_DISPLAY_MODE :
 *  - "hidden"      : aucun prix public (par défaut).
 *  - "starting_at" : « À partir de X € » sur la page Services uniquement.
 *  - "range"       : fourchette « de X à Y € » si `max` est renseigné pour
 *                    l'offre ; sinon rien n'est affiché pour cette offre.
 *
 * Les montants sont provisoires. Le régime de facturation (HT / TTC) n'est
 * pas confirmé : aucune mention n'est ajoutée tant que `TAX_LABEL` est vide.
 * Les prix ne sont jamais affichés sur l'accueil ni dans les métadonnées.
 */
export type PriceDisplayMode = "hidden" | "starting_at" | "range";

export const PRICE_DISPLAY_MODE: PriceDisplayMode = "hidden";
export const TAX_LABEL = "";

export const PRICES: Record<string, { from: number; max?: number }> = {
  "experience-content-day": { from: 490 },
  "the-experience-stay": { from: 790 },
  "experience-coverage": { from: 690 },
};

const fmt = (n: number) => `${n.toLocaleString("fr-FR")} €${TAX_LABEL ? ` ${TAX_LABEL}` : ""}`;

/** Texte prix d'une offre selon le mode, ou null si rien ne doit s'afficher. */
export function priceLabel(slug: string): string | null {
  const p = PRICES[slug];
  if (!p || PRICE_DISPLAY_MODE === "hidden") return null;
  if (PRICE_DISPLAY_MODE === "starting_at") return `À partir de ${fmt(p.from)}`;
  if (PRICE_DISPLAY_MODE === "range" && p.max) return `De ${fmt(p.from)} à ${fmt(p.max)}`;
  return null;
}

export const PRICE_HIDDEN_TEXT = "Prestation adaptée à votre projet";
export const PRICE_CTA = PRICE_DISPLAY_MODE === "hidden" ? "Demander une proposition" : "Parler de votre projet";
