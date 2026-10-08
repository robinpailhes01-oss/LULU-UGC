/** Les trois prestations. Cadre clair, livrables adaptables, jamais des packs rigides. */
export type Offre = {
  slug: string;
  nom: string;
  categorie: string;
  sousTitre: string;
  accroche: string;
  exemples?: string;
  pour: string;
  format: string[];
  image: string;
  pos?: string;
  alt: string;
};

export const OFFRES: Offre[] = [
  {
    slug: "experience-content-day",
    nom: "Experience Content Day",
    categorie: "Creative content session",
    sousTitre: "Création ciblée",
    accroche: "Une session créative ciblée pour mettre en lumière votre établissement, un service ou une expérience particulière.",
    exemples: "Spa, restaurant, nouvelle offre, activité ou ambiance d'un lieu.",
    pour: "Pour les établissements qui souhaitent renouveler leurs contenus ou mettre en lumière un service, un lieu ou une expérience précise.",
    format: ["Échange préparatoire", "Direction créative ciblée", "Jusqu'à 3 heures de captation", "Reels et photographies", "Montage et retouches", "Livraison organisée"],
    image: "/realisations/shooting-hotel-piscine-ext.jpg",
    pos: "50% 55%",
    alt: "Piscine extérieure d'un hôtel & spa, création de contenu ciblée",
  },
  {
    slug: "the-experience-stay",
    nom: "The Experience Stay",
    categorie: "Immersive hospitality content",
    sousTitre: "Immersion dans un hébergement",
    accroche: "Une immersion dans votre établissement pour raconter l'expérience d'un séjour, de l'arrivée jusqu'au départ.",
    exemples: "Pour les hôtels, chalets et hébergements.",
    pour: "Pour les établissements souhaitant raconter l'expérience d'un séjour complet.",
    format: ["Brief et analyse", "Direction créative", "Immersion comprenant une nuit", "Captation des moments du séjour", "Storytelling immersif", "Reels et photographies", "Livraison organisée"],
    image: "/wall/ugc-hotel.jpg",
    pos: "50% 50%",
    alt: "Séjour vécu dans une chambre d'hôtel, contenu immersif",
  },
  {
    slug: "experience-coverage",
    nom: "Experience Coverage",
    categorie: "Events & retreats",
    sousTitre: "Couverture d'événement",
    accroche: "Une présence sur place pour capturer l'atmosphère, les moments forts et les émotions de vos événements et retraites.",
    pour: "Pour les retraites, événements et expériences ponctuelles.",
    format: ["Brief événementiel", "Préparation des moments clés", "Présence sur place", "Captation des moments spontanés", "Reels et photographies", "Livraison organisée"],
    image: "/realisations/harmonie-yacht-shooting.jpg",
    pos: "50% 35%",
    alt: "Groupe d'amis à bord d'un yacht au coucher du soleil, couverture d'événement",
  },
];

/** Options du champ « Prestation souhaitée » du formulaire. */
export const PRESTATIONS = [...OFFRES.map((o) => o.nom), "Je souhaite être conseillée"] as const;
