/**
 * Avis clients de la version test (/v2). Aucun avis n'a encore été fourni :
 * ces entrées sont des gabarits visibles, à remplacer par de vrais retours
 * (texte, prénom, établissement, photo). `placeholder: true` affiche la
 * mention « Exemple » sur la carte.
 */
export type Avis = { id: number; texte: string; par: string; image: string; placeholder?: boolean };

export const AVIS: Avis[] = [
  { id: 0, texte: "L'avis d'un hôtel accompagné par June viendra ici, avec ses mots à lui.", par: "Prénom, établissement", image: "/realisations/shooting-hotel-chambre.jpg", placeholder: true },
  { id: 1, texte: "Un retour sur l'immersion, la façon de travailler et ce que les contenus ont changé.", par: "Prénom, gîte", image: "/wall/gite.jpg", placeholder: true },
  { id: 2, texte: "Quelques lignes d'un restaurant, d'un spa ou d'une activité qui a vécu une Content Experience.", par: "Prénom, restaurant", image: "/wall/unamas.jpg", placeholder: true },
  { id: 3, texte: "Ce que le regard extérieur de June a révélé, et ce que le client n'aurait pas vu seul.", par: "Prénom, expérience", image: "/wall/yacht-reel.jpg", placeholder: true },
  { id: 4, texte: "Le mot d'un établissement qui a réservé une saison entière, ou une seule journée.", par: "Prénom, spa", image: "/wall/beltra.jpg", placeholder: true },
];
