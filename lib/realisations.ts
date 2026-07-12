export type CategorieRealisation = "Reels montés" | "Vidéos UGC" | "Shooting photo";

export type Media = {
  /** Chemin du média sous public/ ; dégradé chaud en fallback. */
  src?: string;
  /** Lien externe (reel ou post Instagram) : la carte devient cliquable. */
  href?: string;
  /** true si le média renvoie vers une vidéo (affiche le bouton play). */
  video?: boolean;
  gradient: string;
};

export type Projet = {
  lieu: string;
  formats: CategorieRealisation[];
  medias: Media[];
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
 * Le portfolio est organisé lieu par lieu : un projet = un lieu, avec tous
 * ses médias. Pour ajouter un projet : déposer les photos dans
 * public/realisations/ puis ajouter une entrée ici. L'accueil et /portfolio
 * se mettent à jour automatiquement.
 */
export const projets: Projet[] = [
  {
    lieu: "Gîte de l'Abric — Cévennes",
    formats: ["Reels montés", "Vidéos UGC"],
    medias: [
      {
        src: "/realisations/gite-abric-cevennes.jpg",
        href: "https://www.instagram.com/reel/DMVPrINId35/?igsh=ZDNnb20zYzJwY3Ax",
        video: true,
        gradient:
          "linear-gradient(160deg, #C98A3C 0%, #7A5230 55%, #241D17 100%)",
      },
    ],
  },
  {
    lieu: "Una Mas — cocktail bar, Carnon",
    formats: ["Reels montés", "Vidéos UGC"],
    medias: [
      {
        src: "/realisations/una-mas-carnon.jpg",
        href: "https://www.instagram.com/reel/DYwjsCSM7wb/?igsh=MTUzbXluNXBxMDdmYQ==",
        video: true,
        gradient:
          "linear-gradient(200deg, #E8C495 0%, #C98A3C 50%, #6B3F2E 100%)",
      },
    ],
  },
  {
    lieu: "Harmonie Yacht — location de yacht",
    formats: ["Reels montés", "Shooting photo"],
    medias: [
      {
        src: "/realisations/harmonie-yacht.jpg",
        href: "https://www.instagram.com/reel/DZ5ER2RsFEt/?igsh=MWNwMWtybWVrNTJ5eQ==",
        video: true,
        gradient:
          "linear-gradient(150deg, #F0D9B8 0%, #C98A3C 45%, #7A5230 100%)",
      },
      {
        src: "/realisations/harmonie-yacht-shooting.jpg",
        href: "https://www.instagram.com/p/DasUCeeiM1E/?igsh=NXppc2lyZ3NmcHB0",
        gradient:
          "linear-gradient(165deg, #E8C495 0%, #C98A3C 55%, #241D17 100%)",
      },
    ],
  },
  {
    lieu: "Hôtel & spa",
    formats: ["Shooting photo"],
    medias: [
      {
        src: "/realisations/shooting-hotel-piscine.jpg",
        gradient:
          "linear-gradient(160deg, #F0D9B8 0%, #C98A3C 50%, #7A5230 100%)",
      },
      {
        src: "/realisations/shooting-hotel-terrasse.jpg",
        gradient:
          "linear-gradient(180deg, #E8C495 0%, #C98A3C 55%, #241D17 100%)",
      },
      {
        src: "/realisations/shooting-hotel-jardins-vue.jpg",
        gradient:
          "linear-gradient(200deg, #F0D9B8 0%, #C98A3C 45%, #6B3F2E 100%)",
      },
      {
        src: "/realisations/shooting-hotel-jardins.jpg",
        gradient:
          "linear-gradient(150deg, #E8C495 0%, #C98A3C 50%, #7A5230 100%)",
      },
      {
        src: "/realisations/shooting-hotel-chambre.jpg",
        gradient:
          "linear-gradient(170deg, #F0D9B8 0%, #C98A3C 55%, #7A5230 100%)",
      },
      {
        src: "/realisations/shooting-hotel-balcon.jpg",
        gradient:
          "linear-gradient(160deg, #E8C495 0%, #C98A3C 50%, #6B3F2E 100%)",
      },
      {
        src: "/realisations/shooting-hotel-couple-terrasse.jpg",
        gradient:
          "linear-gradient(180deg, #F0D9B8 0%, #C98A3C 55%, #241D17 100%)",
      },
      {
        src: "/realisations/shooting-hotel-piscine-ext.jpg",
        gradient:
          "linear-gradient(200deg, #E8C495 0%, #C98A3C 45%, #7A5230 100%)",
      },
      {
        src: "/realisations/shooting-hotel-balcon-fleuri.jpg",
        gradient:
          "linear-gradient(150deg, #F0D9B8 0%, #C98A3C 50%, #6B3F2E 100%)",
      },
      {
        src: "/realisations/shooting-hotel-moment-a-deux.jpg",
        gradient:
          "linear-gradient(170deg, #E8C495 0%, #C98A3C 55%, #241D17 100%)",
      },
    ],
  },
  {
    lieu: "Beltra Physical Therapy — thérapie manuelle",
    formats: ["Shooting photo"],
    medias: [
      {
        src: "/realisations/beltra-therapy.jpg",
        href: "https://www.instagram.com/p/DSKXshciI5F/?img_index=1&igsh=NnV2cnc3ejduaGZp",
        gradient:
          "linear-gradient(175deg, #E8C495 0%, #C98A3C 50%, #241D17 100%)",
      },
    ],
  },
  {
    lieu: "Next Yacht — shooting en mer",
    formats: ["Shooting photo"],
    medias: [
      {
        src: "/realisations/next-yacht.jpg",
        href: "https://www.instagram.com/p/DOTjasHiLwc/?igsh=Z2R0NTZqYWY4OHA1",
        gradient:
          "linear-gradient(170deg, #E8C495 0%, #C98A3C 55%, #241D17 100%)",
      },
    ],
  },
  {
    lieu: "Expérience hôtel",
    formats: ["Vidéos UGC"],
    medias: [
      {
        src: "/realisations/ugc-hotel.jpg",
        href: "https://www.instagram.com/reel/DZIU42MMlFD/?igsh=MXd1N3V0bHJ6eDJ3Zw==",
        video: true,
        gradient:
          "linear-gradient(180deg, #F0D9B8 0%, #C98A3C 50%, #7A5230 100%)",
      },
    ],
  },
  {
    lieu: "Sortie en mer",
    formats: ["Vidéos UGC"],
    medias: [
      {
        src: "/realisations/ugc-bateau.jpg",
        href: "https://www.instagram.com/reel/DasaBUgIF_3/?igsh=eHQ0cGM1MTN3bzR5",
        video: true,
        gradient:
          "linear-gradient(190deg, #E8C495 0%, #C98A3C 50%, #6B3F2E 100%)",
      },
    ],
  },
];
