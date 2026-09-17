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
    nom: "Gîte de l'Abric",
    univers: "Hébergement",
    type: "Vidéo",
    image: "/wall/gite.jpg",
    w: 393,
    h: 633,
    video: "/video/work/gite-abric.mp4",
    href: "https://www.instagram.com/reel/DMVPrINId35/?igsh=ZDNnb20zYzJwY3Ax",
    pos: "50% 30%",
  },
  {
    nom: "Hôtel & spa",
    univers: "Hôtel & spa",
    type: "Photos",
    image: "/realisations/shooting-hotel-piscine-ext.jpg",
    w: 1080,
    h: 1616,
    video: "/video/work/hotel-spa.mp4",
    pos: "50% 55%",
    large: true,
  },
  {
    nom: "Expérience hôtel",
    univers: "Hébergement",
    type: "Vidéo vécue",
    image: "/wall/ugc-hotel.jpg",
    w: 393,
    h: 622,
    video: "/video/work/experience-hotel.mp4",
    href: "https://www.instagram.com/reel/DZIU42MMlFD/?igsh=MXd1N3V0bHJ6eDJ3Zw==",
  },
  {
    nom: "Harmonie Yacht",
    univers: "Tourisme",
    type: "Vidéo",
    image: "/wall/yacht-reel.jpg",
    w: 389,
    h: 614,
    video: "/video/work/harmonie-yacht.mp4",
    href: "https://www.instagram.com/reel/DZ5ER2RsFEt/?igsh=MWNwMWtybWVrNTJ5eQ==",
  },
  {
    nom: "Beltra Physical Therapy",
    univers: "Bien-être",
    type: "Photos",
    image: "/realisations/beltra-therapy.jpg",
    w: 1179,
    h: 1465,
    video: "/video/work/beltra.mp4",
    href: "https://www.instagram.com/p/DSKXshciI5F/?img_index=1&igsh=NnV2cnc3ejduaGZp",
  },
  {
    nom: "Una Mas",
    univers: "Restaurant & bar",
    type: "Vidéo",
    image: "/wall/unamas.jpg",
    w: 392,
    h: 629,
    video: "/video/work/una-mas.mp4",
    href: "https://www.instagram.com/reel/DYwjsCSM7wb/?igsh=MTUzbXluNXBxMDdmYQ==",
  },
  {
    nom: "Sortie en mer",
    univers: "Tourisme",
    type: "Vidéo vécue",
    image: "/wall/ugc-bateau.jpg",
    w: 386,
    h: 615,
    video: "/video/work/sortie-en-mer.mp4",
    href: "https://www.instagram.com/reel/DasaBUgIF_3/?igsh=eHQ0cGM1MTN3bzR5",
  },
  {
    nom: "Next Yacht",
    univers: "Tourisme",
    type: "Photos",
    image: "/realisations/next-yacht.jpg",
    w: 584,
    h: 1040,
    video: "/video/work/next-yacht.mp4",
    href: "https://www.instagram.com/p/DOTjasHiLwc/?igsh=Z2R0NTZqYWY4OHA1",
    pos: "50% 30%",
  },
];
