export type Realisation = {
  titre: string;
  type: string;
  ratio: "9:16" | "4:5";
  /** Chemin du média une fois disponible ; dégradé chaud en attendant. */
  src?: string;
  gradient: string;
};

export const realisations: Realisation[] = [
  {
    titre: "Logement insolite — Port de Carnon",
    type: "Reel + photos",
    ratio: "9:16",
    gradient:
      "linear-gradient(160deg, #C98A3C 0%, #8A3B33 55%, #241D17 100%)",
  },
  {
    titre: "Bientôt : votre lieu ici",
    type: "Reel restaurant",
    ratio: "9:16",
    gradient:
      "linear-gradient(200deg, #E8C495 0%, #C98A3C 50%, #6B3F2E 100%)",
  },
  {
    titre: "Bientôt : votre lieu ici",
    type: "Photos hôtel",
    ratio: "9:16",
    gradient:
      "linear-gradient(150deg, #F0D9B8 0%, #C98A3C 45%, #8A3B33 100%)",
  },
];
