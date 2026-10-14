/**
 * L'offre signature, les extras à la carte et la couverture d'événement.
 * Une seule offre commerciale est mise en avant : Experience Content Day.
 * Les prix sont dans lib/pricing.ts.
 */
export const OFFRE = {
  slug: "experience-content-day",
  nom: "Experience Content Day",
  accroche: "Une session de création. Des semaines de contenus prêts à publier.",
  h1: "Votre prochain contenu est déjà pensé. Il ne reste plus qu'à le créer.",
  sousTitre: "Une prestation photo et vidéo pensée pour les hébergements indépendants et les professionnels du bien-être qui veulent communiquer plus facilement, sans y consacrer tout leur temps.",
  rythme: "La durée de communication couverte dépend de votre rythme de publication.",
  livrables: [
    { n: "8", titre: "Reels prêts à publier", texte: "Des vidéos courtes et professionnelles qui présentent l'expérience, les prestations, les détails et l'ambiance." },
    { n: "30", titre: "Photos retouchées", texte: "Pour alimenter Instagram, le site internet et les autres supports autorisés." },
    { n: "4", titre: "Carrousels Instagram", texte: "Des publications structurées pour présenter l'expérience, les prestations ou répondre aux questions des futurs clients." },
    { n: "+", titre: "B-rolls pour les stories", texte: "Une sélection de plans vidéo complémentaires, livrés dans des formats adaptés." },
  ],
  board: {
    titre: "June Content Board",
    texte: "Un espace simple et organisé qui réunit tout ce dont vous avez besoin pour publier.",
    items: ["Les contenus livrés", "Les légendes prêtes à copier-coller", "Les hooks", "Les appels à l'action", "Les idées de stories", "Le calendrier de publication conseillé", "Des recommandations adaptées à la saison et à l'activité"],
  },
  processus: [
    "Nous échangeons sur votre activité et vos besoins.",
    "Je prépare les angles de contenu et la session de création.",
    "Je viens sur place photographier et filmer votre expérience.",
    "Je réalise les montages, retouches et publications.",
    "Vous recevez votre bibliothèque de contenus organisée.",
  ],
  faq: [
    ["Est-ce adapté si je ne publie presque jamais ?", "Oui, c'est même le cas le plus fréquent. Vous repartez avec des contenus prêts à publier et un calendrier conseillé : il ne reste qu'à copier, coller et publier à votre rythme."],
    ["Dois-je apparaître dans les vidéos ?", "Non. Je peux filmer votre lieu, vos gestes et l'expérience sans vous mettre en avant. Si vous souhaitez apparaître, nous le préparons ensemble en amont."],
    ["Est-ce que June publie à ma place ?", "Non. Je crée et j'organise les contenus, vous gardez la main sur vos comptes. Si vous souhaitez un calendrier de contenu plus complet, il existe en extra."],
    ["Combien de temps les contenus peuvent-ils me servir ?", "Cela dépend de votre rythme : à raison d'une ou deux publications par semaine, une session couvre plusieurs semaines de communication. Les photos et les plans vidéo restent utilisables bien au-delà."],
    ["Puis-je utiliser les photos sur mon site ?", "Oui. Les contenus sont prévus pour vos réseaux, votre site et vos supports autorisés, selon les droits définis au devis."],
    ["Comment se déroule la création ?", "Un premier échange, une préparation des angles, une journée sur place, puis le montage et la livraison dans votre Content Board. Le détail est décrit dans le processus ci-dessus."],
    ["Puis-je commander des contenus supplémentaires ?", "Oui. Reels supplémentaires, shooting, vidéo promotionnelle ou calendrier de contenu : tout est possible à la carte, sur devis."],
  ] as Array<[string, string]>,
  image: "/hero.jpg",
};

export const EXTRAS: Array<{ nom: string; texte: string }> = [
  { nom: "Shooting photo & vidéo", texte: "Pour avoir ou renouveler vos visuels sur vos supports de communication, sans nécessairement commander une prestation complète de contenu éditorial." },
  { nom: "Vidéo UGC & promotionnelle", texte: "Pour présenter une prestation, lancer une nouveauté, annoncer une offre ou créer une campagne spécifique." },
  { nom: "Montage de Reels supplémentaires", texte: "À partir de vidéos déjà captées ou fournies, selon la qualité des fichiers." },
  { nom: "Calendrier de contenu", texte: "Planification éditoriale et rédaction de légendes pour une période définie, en complément ou indépendamment d'une production." },
];

export const EVENT = {
  titre: "Vos événements méritent aussi d'être racontés. Sans que vous ayez à vous en occuper.",
  pour: "Pour les retraites bien-être, ateliers, événements intimistes et expériences collectives.",
  possibilites: ["Reportage photo", "Captation vidéo", "Reels récapitulatifs", "Couverture de l'événement pour les stories, si prévue au devis", "Contenus pour communiquer sur les prochaines éditions"],
  note: "Sur devis, selon la durée et les besoins.",
  image: "/realisations/harmonie-yacht-shooting.jpg",
};

/** Options du champ « Type de projet » du formulaire. */
export const PRESTATIONS = ["Experience Content Day", "Event Coverage", "Création à la carte"] as const;
