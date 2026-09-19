/**
 * Réalisations. Une entrée = un contenu publié ou une photo livrée.
 * `video` : chemin sous public/ (ex. /video/work/harmonie-yacht.mp4) ; tant
 * que le fichier n'existe pas, l'image reste affichée. `href` ouvre le contenu
 * publié sur Instagram. `home` : montré sur la page d'accueil. `feature` : la
 * pièce mise en avant en grand.
 */
export type Univers = "Hébergement" | "Tourisme" | "Bien-être" | "Restaurant & bar";

export type Work = {
  nom: string;
  univers: Univers;
  type: "Vidéo" | "Vidéo vécue" | "Photo" | "Photos & vidéo";
  image: string;
  w: number;
  h: number;
  video?: string;
  href?: string;
  pos?: string;
  /** Plaque large (16:10) au lieu de verticale. */
  large?: boolean;
  home?: boolean;
  feature?: boolean;
  /** Vues Instagram lues sur la capture réelle, à confirmer par Ludivine. */
  vues?: string;
};

export const UNIVERS: Univers[] = ["Hébergement", "Tourisme", "Bien-être", "Restaurant & bar"];

export const works: Work[] = [
  {
    nom: "Hôtel & spa",
    univers: "Hébergement",
    type: "Photos & vidéo",
    image: "/realisations/shooting-hotel-piscine-ext.jpg",
    w: 1080,
    h: 1616,
    video: "/video/work/hotel-spa.mp4",
    pos: "50% 55%",
    large: true,
    home: true,
    feature: true,
  },
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
    home: true,
    vues: "4 403",
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
    home: true,
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
    home: true,
    vues: "20,3 K",
  },
  {
    nom: "Hôtel & spa · la chambre",
    univers: "Hébergement",
    type: "Photo",
    image: "/realisations/shooting-hotel-chambre.jpg",
    w: 1200,
    h: 1600,
    home: true,
  },
  {
    nom: "Beltra Physical Therapy",
    univers: "Bien-être",
    type: "Photo",
    image: "/wall/beltra.jpg",
    w: 1179,
    h: 1143,
    video: "/video/work/beltra.mp4",
    href: "https://www.instagram.com/p/DSKXshciI5F/?img_index=1&igsh=NnV2cnc3ejduaGZp",
    home: true,
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
    home: true,
    vues: "3 865",
  },
  {
    nom: "Hôtel & spa · la terrasse",
    univers: "Hébergement",
    type: "Photo",
    image: "/realisations/shooting-hotel-terrasse.jpg",
    w: 1080,
    h: 1616,
    home: true,
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
    home: true,
  },
  {
    nom: "Next Yacht",
    univers: "Tourisme",
    type: "Photo",
    image: "/realisations/next-yacht.jpg",
    w: 584,
    h: 1040,
    href: "https://www.instagram.com/p/DOTjasHiLwc/?igsh=Z2R0NTZqYWY4OHA1",
    pos: "50% 30%",
    home: true,
  },
  {
    nom: "Harmonie Yacht · à bord",
    univers: "Tourisme",
    type: "Photo",
    image: "/realisations/harmonie-yacht-shooting.jpg",
    w: 1179,
    h: 1456,
    href: "https://www.instagram.com/p/DasUCeeiM1E/?igsh=NXppc2lyZ3NmcHB0",
  },
  { nom: "Hôtel & spa · la piscine", univers: "Hébergement", type: "Photo", image: "/realisations/shooting-hotel-piscine.jpg", w: 1200, h: 1464, pos: "50% 60%" },
  { nom: "Hôtel & spa · les jardins", univers: "Hébergement", type: "Photo", image: "/realisations/shooting-hotel-jardins-vue.jpg", w: 1080, h: 1616 },
  { nom: "Hôtel & spa · en terrasse", univers: "Hébergement", type: "Photo", image: "/realisations/shooting-hotel-couple-terrasse.jpg", w: 1080, h: 1616 },
  { nom: "Hôtel & spa · le balcon", univers: "Hébergement", type: "Photo", image: "/realisations/shooting-hotel-balcon-fleuri.jpg", w: 1080, h: 1616 },
  { nom: "Hôtel & spa · un moment à deux", univers: "Hébergement", type: "Photo", image: "/realisations/shooting-hotel-moment-a-deux.jpg", w: 1080, h: 1616 },
  { nom: "Hôtel & spa · le balcon, le matin", univers: "Hébergement", type: "Photo", image: "/realisations/shooting-hotel-balcon.jpg", w: 1080, h: 1616 },
  { nom: "Hôtel & spa · les allées", univers: "Hébergement", type: "Photo", image: "/realisations/shooting-hotel-jardins.jpg", w: 1080, h: 1616 },
];
