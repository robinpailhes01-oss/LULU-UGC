/**
 * Selected work : la galerie éditoriale de l'accueil. Une entrée = un projet.
 * `video` est un chemin sous public/ (ex. /video/work/harmonie-yacht.mp4) :
 * tant que le fichier n'existe pas, l'image reste affichée. `href` ouvre le
 * contenu publié sur Instagram.
 */
export type Work = {
  nom: string;
  univers: string;
  type: string;
  image: string;
  w: number;
  h: number;
  video?: string;
  href?: string;
  /** Point d'ancrage du cadrage. */
  pos?: string;
  /** Plaque large (16:10) au lieu de verticale. */
  large?: boolean;
};

export const works: Work[] = [
  {
    nom: "Harmonie Yacht",
    univers: "Tourism",
    type: "Experience",
    image: "/wall/yacht-reel.jpg",
    w: 389,
    h: 614,
    video: "/video/work/harmonie-yacht.mp4",
    href: "https://www.instagram.com/reel/DZ5ER2RsFEt/?igsh=MWNwMWtybWVrNTJ5eQ==",
  },
  {
    nom: "Hôtel & spa",
    univers: "Hospitality",
    type: "Experience",
    image: "/realisations/shooting-hotel-piscine-ext.jpg",
    w: 1080,
    h: 1616,
    video: "/video/work/hotel-spa.mp4",
    pos: "50% 55%",
    large: true,
  },
  {
    nom: "Gîte de l'Abric",
    univers: "Hospitality",
    type: "Experience",
    image: "/wall/gite.jpg",
    w: 393,
    h: 633,
    video: "/video/work/gite-abric.mp4",
    href: "https://www.instagram.com/reel/DMVPrINId35/?igsh=ZDNnb20zYzJwY3Ax",
    pos: "50% 30%",
  },
  {
    nom: "Expérience hôtel",
    univers: "Hospitality",
    type: "UGC",
    image: "/wall/ugc-hotel.jpg",
    w: 393,
    h: 622,
    video: "/video/work/experience-hotel.mp4",
    href: "https://www.instagram.com/reel/DZIU42MMlFD/?igsh=MXd1N3V0bHJ6eDJ3Zw==",
  },
  {
    nom: "Beltra Physical Therapy",
    univers: "Wellness",
    type: "Experience",
    image: "/realisations/beltra-therapy.jpg",
    w: 1179,
    h: 1465,
    video: "/video/work/beltra.mp4",
    href: "https://www.instagram.com/p/DSKXshciI5F/?img_index=1&igsh=NnV2cnc3ejduaGZp",
  },
  {
    nom: "Una Mas",
    univers: "Food & Lifestyle",
    type: "Experience",
    image: "/wall/unamas.jpg",
    w: 392,
    h: 629,
    video: "/video/work/una-mas.mp4",
    href: "https://www.instagram.com/reel/DYwjsCSM7wb/?igsh=MTUzbXluNXBxMDdmYQ==",
  },
  {
    nom: "Sortie en mer",
    univers: "Tourism",
    type: "UGC",
    image: "/wall/ugc-bateau.jpg",
    w: 386,
    h: 615,
    video: "/video/work/sortie-en-mer.mp4",
    href: "https://www.instagram.com/reel/DasaBUgIF_3/?igsh=eHQ0cGM1MTN3bzR5",
  },
  {
    nom: "Next Yacht",
    univers: "Tourism",
    type: "Experience",
    image: "/realisations/next-yacht.jpg",
    w: 584,
    h: 1040,
    video: "/video/work/next-yacht.mp4",
    href: "https://www.instagram.com/p/DOTjasHiLwc/?igsh=Z2R0NTZqYWY4OHA1",
    pos: "50% 30%",
  },
];
