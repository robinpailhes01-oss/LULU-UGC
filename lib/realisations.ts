export type CategorieRealisation = "Reels montés" | "Vidéos UGC" | "Shooting photo";

export type Realisation = {
  titre: string;
  /** Un même contenu peut appartenir à plusieurs catégories. */
  categories: CategorieRealisation[];
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

/**
 * Pour ajouter un projet : déposer la photo dans public/realisations/,
 * puis ajouter une entrée ici. La page d'accueil et /portfolio se mettent
 * à jour automatiquement.
 */
export const realisations: Realisation[] = [
  {
    titre: "Gîte de l'Abric — Cévennes",
    categories: ["Reels montés", "Vidéos UGC"],
    ratio: "9:16",
    src: "/realisations/gite-abric-cevennes.jpg",
    href: "https://www.instagram.com/reel/DMVPrINId35/?igsh=ZDNnb20zYzJwY3Ax",
    gradient:
      "linear-gradient(160deg, #C98A3C 0%, #7A5230 55%, #241D17 100%)",
  },
  {
    titre: "Una Mas — cocktail bar, Carnon",
    categories: ["Reels montés", "Vidéos UGC"],
    ratio: "9:16",
    src: "/realisations/una-mas-carnon.jpg",
    href: "https://www.instagram.com/reel/DYwjsCSM7wb/?igsh=MTUzbXluNXBxMDdmYQ==",
    gradient:
      "linear-gradient(200deg, #E8C495 0%, #C98A3C 50%, #6B3F2E 100%)",
  },
  {
    titre: "Harmonie Yacht — location de yacht",
    categories: ["Reels montés"],
    ratio: "9:16",
    src: "/realisations/harmonie-yacht.jpg",
    href: "https://www.instagram.com/reel/DZ5ER2RsFEt/?igsh=MWNwMWtybWVrNTJ5eQ==",
    gradient:
      "linear-gradient(150deg, #F0D9B8 0%, #C98A3C 45%, #7A5230 100%)",
  },
  {
    titre: "Vidéo UGC — expérience hôtel",
    categories: ["Vidéos UGC"],
    ratio: "9:16",
    src: "/realisations/ugc-hotel.jpg",
    href: "https://www.instagram.com/reel/DZIU42MMlFD/?igsh=MXd1N3V0bHJ6eDJ3Zw==",
    gradient:
      "linear-gradient(180deg, #F0D9B8 0%, #C98A3C 50%, #7A5230 100%)",
  },
  {
    titre: "Vidéo UGC — sortie en mer",
    categories: ["Vidéos UGC"],
    ratio: "9:16",
    src: "/realisations/ugc-bateau.jpg",
    href: "https://www.instagram.com/reel/DasaBUgIF_3/?igsh=eHQ0cGM1MTN3bzR5",
    gradient:
      "linear-gradient(190deg, #E8C495 0%, #C98A3C 50%, #6B3F2E 100%)",
  },
  {
    titre: "Harmonie Yacht — shooting photo",
    categories: ["Shooting photo"],
    ratio: "9:16",
    src: "/realisations/harmonie-yacht-shooting.jpg",
    href: "https://www.instagram.com/p/DasUCeeiM1E/?igsh=NXppc2lyZ3NmcHB0",
    gradient:
      "linear-gradient(165deg, #E8C495 0%, #C98A3C 55%, #241D17 100%)",
  },
  {
    titre: "Next Yacht — shooting en mer",
    categories: ["Shooting photo"],
    ratio: "9:16",
    src: "/realisations/next-yacht.jpg",
    href: "https://www.instagram.com/p/DOTjasHiLwc/?igsh=Z2R0NTZqYWY4OHA1",
    gradient:
      "linear-gradient(170deg, #E8C495 0%, #C98A3C 55%, #241D17 100%)",
  },
  {
    titre: "Hôtel & spa — piscine intérieure",
    categories: ["Shooting photo"],
    ratio: "4:5",
    src: "/realisations/shooting-hotel-piscine.jpg",
    gradient:
      "linear-gradient(160deg, #F0D9B8 0%, #C98A3C 50%, #7A5230 100%)",
  },
  {
    titre: "Hôtel & spa — matin en terrasse",
    categories: ["Shooting photo"],
    ratio: "4:5",
    src: "/realisations/shooting-hotel-terrasse.jpg",
    gradient:
      "linear-gradient(180deg, #E8C495 0%, #C98A3C 55%, #241D17 100%)",
  },
  {
    titre: "Hôtel & spa — vue sur les jardins",
    categories: ["Shooting photo"],
    ratio: "4:5",
    src: "/realisations/shooting-hotel-jardins-vue.jpg",
    gradient:
      "linear-gradient(200deg, #F0D9B8 0%, #C98A3C 45%, #6B3F2E 100%)",
  },
  {
    titre: "Hôtel & spa — les jardins",
    categories: ["Shooting photo"],
    ratio: "4:5",
    src: "/realisations/shooting-hotel-jardins.jpg",
    gradient:
      "linear-gradient(150deg, #E8C495 0%, #C98A3C 50%, #7A5230 100%)",
  },
  {
    titre: "Hôtel & spa — détails de la chambre",
    categories: ["Shooting photo"],
    ratio: "4:5",
    src: "/realisations/shooting-hotel-chambre.jpg",
    gradient:
      "linear-gradient(170deg, #F0D9B8 0%, #C98A3C 55%, #7A5230 100%)",
  },
  {
    titre: "Hôtel & spa — au balcon",
    categories: ["Shooting photo"],
    ratio: "4:5",
    src: "/realisations/shooting-hotel-balcon.jpg",
    gradient:
      "linear-gradient(160deg, #E8C495 0%, #C98A3C 50%, #6B3F2E 100%)",
  },
  {
    titre: "Hôtel & spa — couple en terrasse",
    categories: ["Shooting photo"],
    ratio: "4:5",
    src: "/realisations/shooting-hotel-couple-terrasse.jpg",
    gradient:
      "linear-gradient(180deg, #F0D9B8 0%, #C98A3C 55%, #241D17 100%)",
  },
  {
    titre: "Hôtel & spa — piscine extérieure",
    categories: ["Shooting photo"],
    ratio: "4:5",
    src: "/realisations/shooting-hotel-piscine-ext.jpg",
    gradient:
      "linear-gradient(200deg, #E8C495 0%, #C98A3C 45%, #7A5230 100%)",
  },
  {
    titre: "Hôtel & spa — balcon fleuri",
    categories: ["Shooting photo"],
    ratio: "4:5",
    src: "/realisations/shooting-hotel-balcon-fleuri.jpg",
    gradient:
      "linear-gradient(150deg, #F0D9B8 0%, #C98A3C 50%, #6B3F2E 100%)",
  },
  {
    titre: "Hôtel & spa — moment à deux",
    categories: ["Shooting photo"],
    ratio: "4:5",
    src: "/realisations/shooting-hotel-moment-a-deux.jpg",
    gradient:
      "linear-gradient(170deg, #E8C495 0%, #C98A3C 55%, #241D17 100%)",
  },
];
