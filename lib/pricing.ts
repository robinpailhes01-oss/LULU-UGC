/**
 * Affichage des prix, à modifier ici uniquement.
 *  - "hidden"      : aucun prix public.
 *  - "starting_at" : « À partir de X € — sur devis selon votre projet ».
 * Le régime de facturation (HT / TTC) n'est pas confirmé : aucune mention
 * tant que TAX_LABEL est vide. Jamais affiché sur l'accueil ni dans les
 * métadonnées. Le volume final, la durée de captation et le devis sont
 * confirmés avant réservation (voir PRICE_SCOPE_NOTE).
 */
export type PriceDisplayMode = "hidden" | "starting_at";

export const PRICE_DISPLAY_MODE: PriceDisplayMode = "starting_at";
export const TAX_LABEL = "";
export const PRICES: Record<string, { from: number }> = { "experience-content-day": { from: 490 } };

const fmt = (n: number) => `${n.toLocaleString("fr-FR")} €${TAX_LABEL ? ` ${TAX_LABEL}` : ""}`;

export function priceLabel(slug: string): string | null {
  const p = PRICES[slug];
  if (!p || PRICE_DISPLAY_MODE === "hidden") return null;
  return `À partir de ${fmt(p.from)} — sur devis selon votre projet`;
}

export const PRICE_HIDDEN_TEXT = "Prestation adaptée à votre projet — sur devis";
export const PRICE_SCOPE_NOTE = "Le volume final de contenus, la durée de captation et le devis sont confirmés ensemble avant la réservation. Le tarif indicatif correspond à une session de base ; il évolue selon le périmètre.";
