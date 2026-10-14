/**
 * L'offre signature, les extras à la carte et la couverture d'événement.
 * Une seule offre commerciale est mise en avant : Experience Content Day.
 * Les prix sont dans lib/pricing.ts.
 */
export const OFFRE = {
  slug: "experience-content-day",
  nom: "Experience Content Day",
  accroche: "Une session de création. Des semaines de contenus prêts à publier.",
  h1: "Des contenus qui donnent envie de vivre votre expérience. Sans avoir à les créer vous-même.",
  sousTitre: "Une session de création pour préparer vos prochaines publications, sans abonnement ni gestion quotidienne de vos réseaux.",
  rythme: "Des contenus pensés pour durer plusieurs semaines, voire plusieurs mois, selon votre rythme de publication.",
  livrables: [
    { n: "8", titre: "Reels", texte: "Montés, adaptés aux réseaux sociaux et prêts à publier." },
    { n: "30", titre: "Photos retouchées", texte: "Ambiance, détails, espaces, prestations et expérience." },
    { n: "4", titre: "Carrousels", texte: "Pour présenter le lieu, les prestations ou les informations utiles." },
    { n: "+", titre: "B-rolls", texte: "Une sélection de plans vidéo courts pour alimenter les stories." },
  ],
  board: {
    titre: "June Content Board",
    texte: "Tout ce qu'il faut pour publier sans réfléchir, réuni au même endroit.",
    items: ["Légendes", "Hooks", "Appels à l'action", "Idées de stories", "Calendrier conseillé", "Organisation des fichiers et contenus"],
  },
  processus: ["Brief et compréhension du projet.", "Préparation des angles créatifs.", "Session de captation.", "Montage, retouches et rédaction.", "Livraison organisée."],
  faq: [
    ["Est-ce adapté si je ne publie pas régulièrement ?", "Oui, c'est même le cas le plus fréquent. Vous repartez avec des contenus prêts à publier et un calendrier conseillé : il ne reste qu'à copier, coller et publier à votre rythme."],
    ["Dois-je apparaître dans les vidéos ?", "Non. Je peux filmer votre lieu, vos gestes et l'expérience sans vous mettre en avant. Si vous souhaitez apparaître, nous le préparons ensemble en amont."],
    ["Publiez-vous sur mon compte ?", "Non. Je crée et j'organise les contenus, vous gardez la main sur vos comptes. Si vous souhaitez un calendrier de contenu plus complet, il existe en extra."],
    ["Combien de temps peuvent durer les contenus ?", "Cela dépend de votre rythme : à raison d'une ou deux publications par semaine, une session couvre plusieurs semaines de communication. Les photos et les plans vidéo restent utilisables bien au-delà."],
    ["Puis-je utiliser les photos sur mon site ?", "Oui. Les contenus sont prévus pour vos réseaux, votre site et vos supports autorisés, selon les droits définis au devis."],
    ["Comment se déroule la prestation ?", "Un brief, une préparation des angles créatifs, une session de captation sur place, puis le montage, la rédaction et la livraison dans votre Content Board."],
    ["Puis-je demander des créations supplémentaires ?", "Oui. Reels supplémentaires, shooting, vidéo promotionnelle, calendrier de contenu ou diagnostic visuel : tout est possible à la carte, sur devis."],
  ] as Array<[string, string]>,
  image: "/hero.jpg",
};

export const EXTRAS_TITRE = "Besoin d'un petit plus ?";
export const EXTRAS: Array<{ nom: string; texte: string }> = [
  { nom: "Shooting photo et vidéo", texte: "Pour avoir ou renouveler vos visuels, sans commander une session complète." },
  { nom: "Vidéo UGC, promotionnelle ou campagne", texte: "Pour présenter une prestation, lancer une nouveauté ou annoncer une offre." },
  { nom: "Montage de Reels supplémentaires", texte: "À partir de vidéos déjà captées ou fournies, selon la qualité des fichiers." },
  { nom: "Calendrier de contenu et légendes", texte: "Planification éditoriale et rédaction pour une période définie, avec ou sans production." },
  { nom: "Diagnostic visuel", texte: "Un regard extérieur sur vos contenus actuels et des pistes concrètes pour mieux montrer votre expérience." },
];

export const EVENT = {
  titre: "Les expériences se vivent aussi ensemble.",
  pour: "Reportages de retraites, ateliers, événements bien-être et expériences intimistes.",
  possibilites: ["Photos", "Vidéos", "Reels récapitulatifs", "Contenus pour les prochaines éditions", "Stories pendant l'événement, si prévu au devis"],
  note: "Sur devis, selon la durée et les besoins.",
  image: "/realisations/harmonie-yacht-shooting.jpg",
};

/** Options du champ « Type de projet » du formulaire. */
export const PRESTATIONS = ["Experience Content Day", "Event Coverage", "Création à la carte"] as const;
