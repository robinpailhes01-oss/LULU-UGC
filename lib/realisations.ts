export type CategorieRealisation = "Reels montés" | "Vidéos UGC" | "Shooting photo";

export type Realisation = {
  titre: string;
  categorie: CategorieRealisation;
  ratio: "9:16" | "4:5";
  /** Chemin du média une fois disponible ; dégradé chaud en attendant. */
  src?: string;
  /** Lien externe (reel Instagram…) : la carte devient cliquable. */
  href?: string;
  gradient: string;
};

export const categories: {
  nom: CategorieRealisation;
  description: string;
}[] = [
  {
    nom: "Reels montés",
    description:
      "Des vidéos verticales courtes, rythmées, qui racontent votre lieu en quelques secondes.",
  },
  {
    nom: "Vidéos UGC",
    description:
      "Je vis l'expérience face caméra, comme une cliente. Le format le plus authentique pour créer la confiance.",
  },
  {
    nom: "Shooting photo",
    description:
      "Des photos retouchées qui capturent la lumière et les matières de votre lieu.",
  },
];

export const realisations: Realisation[] = [
  {
    titre: "Gîte de l'Abric — Cévennes",
    categorie: "Reels montés",
    ratio: "9:16",
    src: "/realisations/gite-abric-cevennes.jpg",
    href: "https://www.instagram.com/reel/DMVPrINId35/?igsh=ZDNnb20zYzJwY3Ax",
    gradient:
      "linear-gradient(160deg, #C98A3C 0%, #7A5230 55%, #241D17 100%)",
  },
  {
    titre: "Una Mas — cocktail bar, Carnon",
    categorie: "Reels montés",
    ratio: "9:16",
    src: "/realisations/una-mas-carnon.jpg",
    href: "https://www.instagram.com/reel/DYwjsCSM7wb/?igsh=MTUzbXluNXBxMDdmYQ==",
    gradient:
      "linear-gradient(200deg, #E8C495 0%, #C98A3C 50%, #6B3F2E 100%)",
  },
  {
    titre: "Harmonie Yacht — location de yacht",
    categorie: "Reels montés",
    ratio: "9:16",
    src: "/realisations/harmonie-yacht.jpg",
    href: "https://www.instagram.com/reel/DZ5ER2RsFEt/?igsh=MWNwMWtybWVrNTJ5eQ==",
    gradient:
      "linear-gradient(150deg, #F0D9B8 0%, #C98A3C 45%, #7A5230 100%)",
  },
];
