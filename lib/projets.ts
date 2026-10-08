/**
 * Réalisations regroupées par projet. Uniquement des contenus réels de June.
 * `lieu` n'est renseigné que lorsqu'il est connu. `vues` : vues Instagram
 * lues sur les captures, à confirmer. Les vidéos locales (video/work/*.mp4)
 * sont facultatives : l'image reste affichée tant qu'elles manquent.
 */
export type Categorie = "Hospitality" | "Wellness" | "Experiences";
export type Media = { image: string; w: number; h: number; alt: string; video?: string; href?: string; pos?: string; vues?: string; type: "Vidéo" | "Photo" };
export type Projet = {
  slug: string;
  titre: string;
  categorie: Categorie;
  sousCategorie: string;
  lieu?: string;
  description: string;
  cover: Media;
  medias: Media[];
  home?: boolean;
};

export const CATEGORIES: Categorie[] = ["Hospitality", "Wellness", "Experiences"];

export const PROJETS: Projet[] = [
  {
    slug: "hotel-spa",
    titre: "Hôtel & spa",
    categorie: "Hospitality",
    sousCategorie: "Hôtel · Spa",
    description: "Une journée dans un hôtel & spa : la piscine, les jardins, la chambre, la terrasse, et les moments que l'on y vit à deux.",
    home: true,
    cover: { image: "/realisations/shooting-hotel-piscine-ext.jpg", w: 1080, h: 1616, alt: "Piscine extérieure d'un hôtel & spa entourée de pins", video: "/video/work/hotel-spa.mp4", pos: "50% 55%", type: "Vidéo" },
    medias: [
      { image: "/realisations/shooting-hotel-terrasse.jpg", w: 1080, h: 1616, alt: "Terrasse d'un hôtel & spa au soleil couchant", pos: "50% 40%", type: "Photo" },
      { image: "/realisations/shooting-hotel-chambre.jpg", w: 1200, h: 1600, alt: "Chambre d'hôtel baignée de lumière", type: "Photo" },
      { image: "/realisations/shooting-hotel-moment-a-deux.jpg", w: 1080, h: 1616, alt: "Un moment à deux sur le balcon", pos: "50% 40%", type: "Photo" },
      { image: "/realisations/shooting-hotel-piscine.jpg", w: 1200, h: 1464, alt: "Piscine intérieure sous les arcades", pos: "50% 60%", type: "Photo" },
      { image: "/realisations/shooting-hotel-jardins-vue.jpg", w: 1080, h: 1616, alt: "Jardins de l'hôtel avec vue", type: "Photo" },
      { image: "/realisations/shooting-hotel-couple-terrasse.jpg", w: 1080, h: 1616, alt: "Un couple en terrasse", type: "Photo" },
      { image: "/realisations/shooting-hotel-balcon-fleuri.jpg", w: 1080, h: 1616, alt: "Balcon fleuri de l'hôtel", type: "Photo" },
      { image: "/realisations/shooting-hotel-balcon.jpg", w: 1080, h: 1616, alt: "Le balcon au petit matin", type: "Photo" },
      { image: "/realisations/shooting-hotel-jardins.jpg", w: 1080, h: 1616, alt: "Les allées des jardins", type: "Photo" },
    ],
  },
  {
    slug: "harmonie-yacht",
    titre: "Harmonie Yacht",
    categorie: "Experiences",
    sousCategorie: "Sortie en mer · Tourisme",
    description: "Une journée en mer racontée comme la vivent les invités : l'embarquement, la table dressée à bord, le large.",
    home: true,
    cover: { image: "/wall/yacht-reel.jpg", w: 389, h: 614, alt: "Petit-déjeuner servi à bord d'un yacht face à la mer", video: "/video/work/harmonie-yacht.mp4", href: "https://www.instagram.com/reel/DZ5ER2RsFEt/?igsh=MWNwMWtybWVrNTJ5eQ==", vues: "20,3 K", type: "Vidéo" },
    medias: [
      { image: "/realisations/harmonie-yacht-shooting.jpg", w: 1179, h: 1456, alt: "Groupe d'amis à bord au coucher du soleil", href: "https://www.instagram.com/p/DasUCeeiM1E/?igsh=NXppc2lyZ3NmcHB0", pos: "50% 35%", type: "Photo" },
      { image: "/wall/ugc-bateau.jpg", w: 386, h: 615, alt: "Sortie en mer, chapeau de paille et bateau au large", video: "/video/work/sortie-en-mer.mp4", href: "https://www.instagram.com/reel/DasaBUgIF_3/?igsh=eHQ0cGM1MTN3bzR5", type: "Vidéo" },
      { image: "/realisations/next-yacht.jpg", w: 584, h: 1040, alt: "Yacht au mouillage, invités à l'arrière", href: "https://www.instagram.com/p/DOTjasHiLwc/?igsh=Z2R0NTZqYWY4OHA1", pos: "50% 30%", type: "Photo" },
    ],
  },
  {
    slug: "gite-de-l-abric",
    titre: "Gîte de l'Abric",
    categorie: "Hospitality",
    sousCategorie: "Gîte · Hébergement",
    lieu: "Cévennes",
    description: "Le petit-déjeuner sous la treille, la vue sur les Cévennes : un gîte raconté par ce que l'on y ressent au réveil.",
    home: true,
    cover: { image: "/wall/gite.jpg", w: 393, h: 633, alt: "Petit-déjeuner sous la treille au Gîte de l'Abric, face aux Cévennes", video: "/video/work/gite-abric.mp4", href: "https://www.instagram.com/reel/DMVPrINId35/?igsh=ZDNnb20zYzJwY3Ax", vues: "4 403", pos: "50% 30%", type: "Vidéo" },
    medias: [],
  },
  {
    slug: "sejour-vecu-hotel",
    titre: "Un séjour vécu à l'hôtel",
    categorie: "Hospitality",
    sousCategorie: "Hôtel · Vidéo vécue",
    description: "June prend la place du client : l'arrivée dans la chambre, le peignoir, le temps qui ralentit.",
    cover: { image: "/wall/ugc-hotel.jpg", w: 393, h: 622, alt: "Moment de détente en peignoir dans une chambre d'hôtel", video: "/video/work/experience-hotel.mp4", href: "https://www.instagram.com/reel/DZIU42MMlFD/?igsh=MXd1N3V0bHJ6eDJ3Zw==", type: "Vidéo" },
    medias: [],
  },
  {
    slug: "beltra-physical-therapy",
    titre: "Beltra Physical Therapy",
    categorie: "Wellness",
    sousCategorie: "Thérapie · Bien-être",
    description: "Le geste, l'attention, le soin : un cabinet de thérapie raconté à hauteur de patient.",
    cover: { image: "/wall/beltra.jpg", w: 1179, h: 1143, alt: "Séance de thérapie physique chez Beltra", video: "/video/work/beltra.mp4", href: "https://www.instagram.com/p/DSKXshciI5F/?img_index=1&igsh=NnV2cnc3ejduaGZp", type: "Vidéo" },
    medias: [],
  },
  {
    slug: "una-mas",
    titre: "Una Mas",
    categorie: "Experiences",
    sousCategorie: "Restaurant · Bar",
    lieu: "Carnon",
    description: "Un dîner entre amis, les verres qui se lèvent, la lumière du soir : l'ambiance d'un lieu de vie.",
    cover: { image: "/wall/unamas.jpg", w: 392, h: 629, alt: "Amis qui trinquent en terrasse chez Una Mas", video: "/video/work/una-mas.mp4", href: "https://www.instagram.com/reel/DYwjsCSM7wb/?igsh=MTUzbXluNXBxMDdmYQ==", vues: "3 865", pos: "50% 40%", type: "Vidéo" },
    medias: [],
  },
];
