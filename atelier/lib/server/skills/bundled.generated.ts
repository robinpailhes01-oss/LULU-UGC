// Généré par scripts/bundle-skills.mjs depuis atelier/skills/ — ne pas modifier à la main.
// Pour changer un skill : éditer atelier/skills/<slug>/ puis lancer `npm run skills:bundle`.
import type { BundledSkill } from "@/lib/server/skills/types";

export const BUNDLED_SKILLS: BundledSkill[] = [
  {
    "slug": "carrousels",
    "kind": "workflow",
    "name": "Carrousels photo",
    "description": "Comment composer les carrousels Instagram (ordre des photos, première image, texte éventuel). À utiliser pour préparer les 4 carrousels d'une livraison ou une publication carrousel de June.",
    "body": "# Carrousels\n\n- Format 4:5 (1080×1350) ; toutes les images d'un carrousel ont le même ratio.\n- 5 à 10 images ; la première arrête le pouce (la plus forte, la plus lumineuse), la deuxième\n  donne envie de continuer (un détail ou un mouvement).\n- Raconter dans l'ordre du vécu : arriver, découvrir, profiter, prolonger.\n- Varier les plans : large, moyen, détail, puis large à nouveau.\n- Texte sur image seulement pour un carrousel d'informations (accès, prestations, horaires) :\n  Fraunces pour le titre, Manrope pour le reste, fond crème ou photo floutée.\n- Toujours la même retouche sur tout le carrousel.\n\nTypes utiles : « Le lieu en 7 images », « Une journée ici », « Les détails », « Infos pratiques ».",
    "data": null,
    "files": {},
    "hash": "6dae8d8bede53408"
  },
  {
    "slug": "content-board",
    "kind": "workflow",
    "name": "Content Board et livraison client",
    "description": "Ce que contient une livraison Experience Content Day (8 Reels, 30 photos, 4 carrousels, B-rolls, June Content Board) et comment la préparer dans l'Atelier. À utiliser pour planifier un projet, vérifier ce qui manque ou rédiger le Content Board.",
    "body": "# Livraison Experience Content Day\n\n## Livrables\n- **8 Reels** montés, prêts à publier (styles : voir les skills de montage).\n- **30 photos retouchées** : ambiance, détails, espaces, prestations, expérience.\n- **4 carrousels** : présenter le lieu, une prestation, des informations utiles, un moment.\n- **B-rolls** : une sélection de plans vidéo courts pour les stories.\n- **June Content Board** : légendes, hooks, appels à l'action, idées de stories, calendrier\n  conseillé, organisation des fichiers.\n\n## Répartition conseillée des 8 Reels (à adapter au lieu)\n1. Immersion signature (le séjour en 15–20 s).\n2. Arrivée / première découverte.\n3. Le moment fort de l'expérience.\n4. Détails et matières.\n5. Une vidéo vécue (Ludivine vit l'expérience).\n6. Un Reel d'accroche court pour la découverte.\n7. Une ambiance du soir ou du matin.\n8. Un teaser en boucle (pour la bio ou les stories).\n\n## Le Content Board\nPour chaque contenu : titre interne, format, fichier, légende (voix du client), hook, appel à\nl'action, idée de story associée, et date conseillée (une à deux publications par semaine).\nLe calendrier alterne Reels, carrousels et photos ; il commence par l'immersion signature.\n\n## Vérifier une livraison\nCompter ce qui est prêt dans le dossier du projet (Sélection, Retouches, Montages, Carrousels),\nlister ce qui manque, et proposer les prochaines actions dans l'Atelier.",
    "data": null,
    "files": {},
    "hash": "edc2226f9140da6a"
  },
  {
    "slug": "direction-artistique",
    "kind": "brand",
    "name": "Direction artistique des contenus",
    "description": "L'image June : lumière, cadrage, couleurs, typographies des textes à l'écran. À appliquer à la sélection des photos, à la retouche et à tous les montages.",
    "body": "# Direction artistique\n\n## Lumière et couleur\n- Lumière naturelle, de préférence **heure dorée** ; chaleur douce, jamais orange criard.\n- Blancs crème plutôt que blancs bleutés ; noirs légèrement relevés (rendu film discret).\n- Couleurs fidèles au lieu : on sublime, on ne transforme pas.\n\n## Cadrage et contenu\n- **Vécu, pas posé** : des gestes, des mains, des pas, une tasse que l'on prend, une porte que\n  l'on pousse. Des personnes de dos ou de profil plutôt que face caméra posée.\n- Alterner plans larges (le lieu, la vue) et gros plans (matières, détails).\n- Verticalité soignée (horizon droit, lignes verticales droites à l'intérieur).\n- Éviter : pièces vides sans vie, flash, grand-angle déformant, objets personnels qui traînent.\n\n## Palette pour les textes et habillages\n- Crème `#FBF7F0` (texte sur image), espresso `#241D17` (plaques, fonds forts), miel `#C98A3C`\n  (un accent, avec parcimonie), châtaigne `#8B5E34` (un mot en italique), ivoire `#F4F0E8`.\n\n## Typographies\n- **Fraunces** : hooks et titres, poids léger (300–400), un mot en *italique* pour l'accent.\n- **Manrope** : sous-titres, légendes à l'écran, informations pratiques.\n- Textes peu nombreux, toujours lisibles sur mobile (zones de sécurité des Reels respectées :\n  rien d'important dans les 220 px du haut et les 380 px du bas en 1080×1920).",
    "data": null,
    "files": {},
    "hash": "67facfb94bda1e1b"
  },
  {
    "slug": "marque-june",
    "kind": "brand",
    "name": "Marque June",
    "description": "Qui est June, ce que le studio vend et ce qu'il ne promet jamais. À lire avant tout texte, toute légende, tout montage ou toute proposition destinée à un client ou au public.",
    "body": "# June Content Studio — socle de marque\n\n**June** est le studio de création de **Ludivine** : une personne, pas une agence, pas une\néquipe. Studio indépendant de contenus pour l'hospitalité et le bien-être.\n\n## Positionnement\n- Promesse : « Des contenus qui donnent envie de vivre votre expérience. Sans avoir à les créer\n  vous-même. »\n- Signature : « Vous faites vivre l'expérience. Je m'occupe de la raconter. »\n- Hiérarchie, toujours : **expérience client → storytelling → création de contenu**. Les Reels,\n  photos et vidéos sont des outils, pas le cœur du métier.\n- Ludivine vit le lieu comme une cliente : un contenu **vécu, pas posé**.\n\n## Pour qui\nHébergements indépendants (gîtes, maisons d'hôtes, chalets, villas, boutique-hôtels, logements\ninsolites) et expériences bien-être (spas, retraites, soins). Saison 26/27 : Alpe d'Huez.\nAncrage : Montpellier, Occitanie.\n\n## L'offre : Experience Content Day\nUne session de création ; des semaines de contenus prêts à publier. Livrables : 8 Reels montés,\n30 photos retouchées, 4 carrousels, une sélection de B-rolls pour les stories et le\n**June Content Board** (légendes, hooks, appels à l'action, idées de stories, calendrier\nconseillé, organisation des fichiers). Prix affiché : « À partir de 490 € — devis personnalisé ».\nExtras à la carte et couverture d'événement sur devis.\n\n## Garde-fous (ne jamais enfreindre)\n- June **ne publie pas** sur les comptes des clients et ne fait pas de community management :\n  le client garde la main. (Les publications programmées depuis l'Atelier concernent les comptes\n  de June, sauf demande explicite.)\n- Aucun résultat chiffré promis (ni vues, ni réservations), aucun faux avis, aucun faux compteur.\n- Jamais « agence », jamais « équipe ».\n- Droits publicitaires toujours en supplément.\n- Ne jamais inventer un client, un lieu ou une réalisation : ne parler que de ce qui est dans la\n  médiathèque ou dans les références.",
    "data": null,
    "files": {},
    "hash": "b6ddd33ed24ea625"
  },
  {
    "slug": "programmation",
    "kind": "workflow",
    "name": "Programmer les publications",
    "description": "Règles pour programmer les publications sur les comptes de June via Zernio : rythme, horaires, formats, légendes et premier commentaire. À suivre avant toute programmation.",
    "body": "# Programmer\n\n## Comptes\nOn programme uniquement sur les comptes connectés à l'Atelier (comptes de June). Jamais sur le\ncompte d'un client sans demande explicite et écrite.\n\n## Rythme et horaires (point de départ, à ajuster avec les statistiques)\n- 2 à 3 publications par semaine, plus des stories au fil de l'eau.\n- Horaires conseillés : en semaine 12 h 15 ou 18 h 30 ; le week-end 10 h 00 (heure de Paris).\n- Ne pas programmer deux Reels le même jour.\n\n## Formats\n- Une vidéo seule → Reel (9:16, 3 s à 90 s ; idéal 8 à 25 s), avec une couverture choisie.\n- Plusieurs photos → carrousel (4:5).\n- Story : un seul média, pas de légende.\n\n## Avant de programmer\n1. Relire la légende avec le skill « Voix et légendes June ».\n2. Vérifier le format et la qualité des médias (retouchés, bon ratio).\n3. Hashtags : 3 à 6, dans la légende (ou en premier commentaire si demandé).\n4. Toujours demander confirmation avant de programmer (action visible du public).",
    "data": null,
    "files": {},
    "hash": "c04c57c2c72f9502"
  },
  {
    "slug": "reel-accroche",
    "kind": "montage",
    "name": "Reel accroche",
    "description": "Reel court et rythmé (7 à 12 s) pour la découverte : un hook fort dans la première seconde, des coupes sur le rythme, une chute. À utiliser pour attirer de nouveaux spectateurs.",
    "body": "# Reel accroche\n\n**Intention** : arrêter le pouce en une seconde, puis tenir jusqu'à la fin grâce au rythme.\n\n## Déroulé\n1. **Hook (≤ 1 s)** : le plan le plus fort + 3 à 6 mots en grand, en haut de la zone sûre.\n2. **Enchaînement (5 à 8 s)** : 5 à 8 plans de 0,6 à 1,2 s, coupés sur les temps de la musique.\n3. **Chute (≈ 1,5 s)** : le plan qui répond au hook, éventuellement une phrase courte.\n\n## Règles\n- Coupes franches (pas de fondus), mouvements dans le même sens d'un plan à l'autre.\n- Texte mot à mot pour le hook ; sous-titres courts si une phrase est dite.\n- Musique avec un vrai rythme (percussions légères), toujours dans l'univers chaleureux de June :\n  pas de son « tendance » agressif.\n\n## Références\nÀ compléter : ajouter des exemples de Reels d'accroche réussis et noter leur rythme (plans/s).",
    "data": {
      "format": "9:16",
      "fps": 30,
      "targetDurationS": {
        "min": 7,
        "max": 12
      },
      "photoDurationS": 0.9,
      "videoClipS": {
        "min": 0.6,
        "max": 1.2
      },
      "transition": {
        "type": "cut",
        "durationS": 0
      },
      "pacing": "rapide",
      "look": "June doré",
      "fonts": {
        "display": "Fraunces",
        "text": "Manrope"
      },
      "colors": {
        "text": "#FBF7F0",
        "accent": "#C98A3C",
        "plate": "#241D17",
        "background": "#F4F0E8"
      },
      "textAnimation": "words",
      "textPlacement": "top",
      "captions": true,
      "music": {
        "mood": "rythmé, chaleureux, percussions légères",
        "volume": 0.75,
        "fadeOutS": 0.6
      },
      "endCard": null,
      "structure": [
        {
          "role": "hook",
          "durationS": 1,
          "shot": "le plan le plus fort du projet",
          "text": "3 à 6 mots"
        },
        {
          "role": "enchaînement",
          "durationS": 7,
          "shot": "5 à 8 plans courts sur le rythme"
        },
        {
          "role": "chute",
          "durationS": 1.5,
          "shot": "le plan qui répond au hook"
        }
      ]
    },
    "files": {},
    "hash": "c6ac6348d90e8bd1"
  },
  {
    "slug": "reel-immersion",
    "kind": "montage",
    "name": "Reel immersion",
    "description": "Le Reel signature de June : raconter un séjour ou une expérience en 15 à 20 secondes, lentement, comme si on y était. À utiliser par défaut pour présenter un lieu ou une expérience.",
    "body": "# Reel immersion\n\n**Intention** : faire ressentir l'expérience avant même de l'avoir vécue. On suit le fil du vécu,\nsans précipitation. Le spectateur doit avoir envie d'y être.\n\n## Déroulé (voir `structure` dans les paramètres)\n1. **Accroche (≈ 2 s)** : un plan qui pose le lieu et la lumière + un hook court en Fraunces.\n2. **Arrivée (≈ 3 s)** : un mouvement d'entrée (porte, chemin, escalier).\n3. **Détails (≈ 4 s)** : 3 à 4 gros plans de matières et de gestes, 1 s chacun environ.\n4. **Moment fort (≈ 4 s)** : le moment signature (bain, coucher de soleil, table dressée, soin).\n5. **Respiration (≈ 3 s)** : un plan large et lent, la vue, quelqu'un qui profite.\n6. **Fin (≈ 2 s)** : un plan qui donne envie de rester ; texte final facultatif.\n\n## Choisir les plans\n- Chercher dans la sélection du projet ; préférer les favoris et les mots-clés `selection`.\n- Plans stables et lents ; éviter les plans tremblés, les flous non voulus, les visages face caméra.\n- Un seul plan par idée ; ne jamais répéter un plan.\n\n## Texte et son\n- 1 hook au début, éventuellement 1 phrase finale. Rien d'autre à l'écran.\n- Musique douce (acoustique, piano, guitare), sans paroles de préférence ; volume bas, fondu\n  final. Les sons d'ambiance des clips peuvent rester très bas.\n\n## Look\n« June doré » par défaut ; « Nuit chaude » pour un lieu du soir, « Matin frais » pour la montagne.\n\n## Références\nÀ compléter (voir le skill « Références et inspirations ») : ajouter 2 ou 3 Reels qui incarnent\nce rythme et noter ce que l'on en retient.",
    "data": {
      "format": "9:16",
      "fps": 30,
      "targetDurationS": {
        "min": 15,
        "max": 20
      },
      "photoDurationS": 2.2,
      "videoClipS": {
        "min": 1.2,
        "max": 3.5
      },
      "transition": {
        "type": "fade",
        "durationS": 0.35
      },
      "pacing": "lent",
      "look": "June doré",
      "fonts": {
        "display": "Fraunces",
        "text": "Manrope"
      },
      "colors": {
        "text": "#FBF7F0",
        "accent": "#C98A3C",
        "plate": "#241D17",
        "background": "#F4F0E8"
      },
      "textAnimation": "rise",
      "textPlacement": "center",
      "captions": false,
      "music": {
        "mood": "acoustique, chaleureux, lent, sans paroles",
        "volume": 0.6,
        "fadeOutS": 1.5
      },
      "endCard": null,
      "structure": [
        {
          "role": "accroche",
          "durationS": 2,
          "shot": "plan d'ouverture qui pose le lieu et la lumière",
          "text": "hook court qui fait ressentir"
        },
        {
          "role": "arrivée",
          "durationS": 3,
          "shot": "mouvement d'entrée : porte, chemin, escalier"
        },
        {
          "role": "détails",
          "durationS": 4,
          "shot": "3 à 4 gros plans de matières et de gestes"
        },
        {
          "role": "moment fort",
          "durationS": 4,
          "shot": "le moment signature de l'expérience"
        },
        {
          "role": "respiration",
          "durationS": 3,
          "shot": "plan large et lent, la vue, quelqu'un qui profite"
        },
        {
          "role": "fin",
          "durationS": 2,
          "shot": "plan qui donne envie de rester",
          "text": "phrase finale facultative"
        }
      ]
    },
    "files": {},
    "hash": "d8d488851669b193"
  },
  {
    "slug": "references",
    "kind": "references",
    "name": "Références et inspirations",
    "description": "Bibliothèque de références (comptes, Reels, photographes, studios) avec ce qu'il faut en retenir. À consulter pour choisir un style, briefer un montage ou justifier une direction.",
    "body": "# Références\n\nChaque référence : **ce que c'est**, **lien ou média**, **ce que l'on retient**, **ce que l'on ne\ncopie pas**. Les vidéos de référence peuvent être importées dans la médiathèque (dossier\n« Références ») et rattachées au skill concerné.\n\n## Studios et comptes\n- **The Other Angle** (studio hospitality) — à retenir : déclarations courtes, une image forte par\n  idée, ton sensoriel « ce que l'on ressent, pas seulement ce que l'on voit ». À ne pas copier :\n  leur mise en page et leurs textes.\n\n## À compléter\nAjouter ici les comptes, Reels et photographes de référence, style par style (immersion,\naccroche, vidéo vécue, teaser), en indiquant le rythme, les transitions, la typographie et la\nmusique observés.",
    "data": null,
    "files": {},
    "hash": "ff0851c2a9bcb20b"
  },
  {
    "slug": "retouche-june",
    "kind": "retouch",
    "name": "Retouche à l'image de June",
    "description": "Comment retoucher les photos dans le style June et quel look choisir selon la scène. À utiliser avant toute retouche, application de look ou export de photos pour un client.",
    "body": "# Retouche June\n\n## Principe\nSublimer la lumière réelle du lieu, garder des peaux naturelles et des couleurs crédibles. La\nretouche se voit à peine ; on ressent seulement que la photo est « belle et vraie ».\n\n## Ordre de travail\n1. Redresser (horizon, verticales) et recadrer au format de destination : 4:5 pour le fil\n   Instagram, 9:16 pour les stories, 3:2 ou original pour le site et l'annonce.\n2. Exposition et contraste : ouvrir les ombres plutôt que tout éclaircir ; protéger les hautes\n   lumières (fenêtres, ciel).\n3. Balance : légèrement chaude, jamais orange ; corriger les dominantes vertes des intérieurs.\n4. Look : appliquer le look adapté, puis ajuster l'intensité (souvent 60 à 85 %).\n5. Vérifier en série : une même série doit avoir la même température et la même densité.\n\n## Quel look pour quelle scène\n- **June doré** : signature, extérieurs et intérieurs baignés de lumière, fin de journée.\n- **Lumière naturelle** : intérieurs lumineux, chambres, salles de bain (rendu net et fidèle).\n- **Crème** : petit-déjeuner, matières claires, linge, ambiance douce du matin.\n- **Heure dorée** : couchers de soleil, terrasses, piscines en fin de journée.\n- **Nuit chaude** : intérieurs du soir, bougies, restaurants, spas tamisés.\n- **Matin frais** : montagne, neige, matins bleutés (Alpe d'Huez).\n- **Noir & blanc chaud** : portraits, gestes, détails graphiques — avec parcimonie.\n\n## Interdits\nLissage de peau, ciels remplacés, objets effacés qui changent la réalité du lieu, saturation\npoussée, vignettage marqué.",
    "data": null,
    "files": {},
    "hash": "50a97a012d596838"
  },
  {
    "slug": "teaser-boucle",
    "kind": "montage",
    "name": "Teaser en boucle",
    "description": "Vidéo très courte (6 à 8 s) construite autour d'un seul moment, qui boucle sans coupure visible. À utiliser pour les stories, la bio ou un aperçu discret.",
    "body": "# Teaser en boucle\n\n- Un seul moment, un ou deux plans maximum (eau qui bouge, rideau, vapeur, flamme, lumière).\n- La dernière image doit rejoindre la première : choisir un plan à mouvement continu et couper\n  là où le mouvement revient au même point, ou fondre la fin dans le début.\n- Pas de texte, ou un seul mot en Fraunces italique.\n- Musique ou ambiance en boucle, sans début ni fin marqués.",
    "data": {
      "format": "9:16",
      "fps": 30,
      "targetDurationS": {
        "min": 6,
        "max": 8
      },
      "photoDurationS": 3.5,
      "videoClipS": {
        "min": 3,
        "max": 8
      },
      "transition": {
        "type": "fade",
        "durationS": 0.6
      },
      "pacing": "lent",
      "look": "June doré",
      "fonts": {
        "display": "Fraunces",
        "text": "Manrope"
      },
      "colors": {
        "text": "#FBF7F0",
        "accent": "#C98A3C",
        "plate": "#241D17",
        "background": "#F4F0E8"
      },
      "textAnimation": "fade",
      "textPlacement": "center",
      "captions": false,
      "music": {
        "mood": "ambiance en boucle, très douce",
        "volume": 0.5,
        "fadeOutS": 0
      },
      "endCard": null,
      "structure": [
        {
          "role": "moment",
          "durationS": 7,
          "shot": "un plan à mouvement continu qui peut boucler",
          "text": "un mot, facultatif"
        }
      ]
    },
    "files": {},
    "hash": "1d387126fdbb7567"
  },
  {
    "slug": "tri-shooting",
    "kind": "workflow",
    "name": "Trier un shooting",
    "description": "Méthode pour ranger, taguer et sélectionner les photos et vidéos d'un shooting client dans la médiathèque. À suivre dès qu'un import arrive, quand on demande de « trier », « ranger » ou « faire une sélection ».",
    "body": "# Trier un shooting\n\n## Arborescence d'un projet client\n```\n<Nom du lieu> — <mois année>          ex. « Gîte de l'Abric — octobre 2026 »\n├── Rushs                             tout ce qui arrive de la carte mémoire / du téléphone\n├── Sélection                         les meilleurs plans, prêts à retoucher ou à monter\n├── Retouches                         photos retouchées (versions créées par la retouche)\n├── Montages                          Reels et vidéos rendues\n├── Carrousels                        visuels préparés pour les 4 carrousels\n└── Livraison                         ce qui part chez le client, dans l'ordre\n```\nLes médias de June elle-même (coulisses, portraits, contenus du compte) vont dans\n« June — compte » avec la même logique.\n\n## Étapes\n1. Ranger les nouveaux imports dans **Rushs** du bon projet (créer le projet s'il n'existe pas ;\n   demander le nom du lieu si l'image ne permet pas de le deviner).\n2. Lancer l'analyse IA sur les médias non analysés, puis vérifier les mots-clés.\n3. Mots-clés : les univers (chambre, salle de bain, piscine, spa, restaurant, petit-déjeuner,\n   extérieur, vue, détail, portrait, activité…), le moment (matin, journée, heure dorée, soir,\n   nuit), les personnes (aucune, une, plusieurs) et `selection` pour les retenus.\n4. Sélection : par scène, garder le meilleur plan (netteté, lumière, geste, horizon). Mettre en\n   favori les plans « signature » (ceux qui résument l'expérience).\n5. Ménage : doublons, plans flous et ratés à la corbeille — toujours proposer avant de jeter.\n6. Déplacer la sélection dans **Sélection** et indiquer ce qui manque pour couvrir les livrables\n   (voir le skill « Content Board »).",
    "data": null,
    "files": {},
    "hash": "cc6c740dda086084"
  },
  {
    "slug": "video-vecue",
    "kind": "montage",
    "name": "Vidéo vécue",
    "description": "Vidéo où Ludivine vit l'expérience (format UGC) : point de vue subjectif, voix off ou face caméra, sous-titres lisibles, 20 à 40 s. À utiliser quand on veut montrer l'expérience de l'intérieur, comme une cliente.",
    "body": "# Vidéo vécue\n\n**Intention** : « Je vous emmène. » Le spectateur vit le moment à travers Ludivine.\n\n## Déroulé\n1. **Accroche (≈ 2 s)** : une phrase dite ou écrite qui pose la situation (« Je teste la nuit dans\n   une cabane perchée »).\n2. **Arrivée en point de vue (≈ 5 s)** : ses pas, ses mains, la découverte.\n3. **Trois moments vécus (≈ 15 à 25 s)** : chaque moment = 2 ou 3 plans, un ressenti dit en voix\n   off ou en sous-titre.\n4. **Ressenti final (≈ 4 s)** : ce qu'elle retient, en une phrase.\n5. **Invitation (≈ 2 s)** : douce, sans forcing (« Lien en bio »), facultative.\n\n## Règles\n- Sous-titres sur toute la durée de la voix (Manrope, crème sur plaque espresso translucide,\n  en bas de la zone sûre), découpés en phrases courtes.\n- Garder le son des clips quand Ludivine parle ; musique très basse dessous.\n- Coupes franches, quelques fondus pour les changements de moment.\n\n## Références\nÀ compléter : exemples de vidéos vécues appréciées (ton, longueur, place des sous-titres).",
    "data": {
      "format": "9:16",
      "fps": 30,
      "targetDurationS": {
        "min": 20,
        "max": 40
      },
      "photoDurationS": 2,
      "videoClipS": {
        "min": 1.5,
        "max": 5
      },
      "transition": {
        "type": "cut",
        "durationS": 0
      },
      "pacing": "moyen",
      "look": "Lumière naturelle",
      "fonts": {
        "display": "Fraunces",
        "text": "Manrope"
      },
      "colors": {
        "text": "#FBF7F0",
        "accent": "#C98A3C",
        "plate": "#241D17",
        "background": "#F4F0E8"
      },
      "textAnimation": "fade",
      "textPlacement": "bottom",
      "captions": true,
      "music": {
        "mood": "doux, discret, sous la voix",
        "volume": 0.25,
        "fadeOutS": 1.2
      },
      "endCard": null,
      "structure": [
        {
          "role": "accroche",
          "durationS": 2,
          "shot": "Ludivine ou son point de vue qui pose la situation",
          "text": "phrase qui pose la situation"
        },
        {
          "role": "arrivée",
          "durationS": 5,
          "shot": "pas, mains, découverte en point de vue"
        },
        {
          "role": "moments vécus",
          "durationS": 20,
          "shot": "trois moments, deux ou trois plans chacun"
        },
        {
          "role": "ressenti",
          "durationS": 4,
          "shot": "plan calme, ce qu'elle retient",
          "text": "une phrase"
        },
        {
          "role": "invitation",
          "durationS": 2,
          "shot": "plan large final",
          "text": "invitation douce, facultative"
        }
      ]
    },
    "files": {},
    "hash": "ba6316d39cb8d281"
  },
  {
    "slug": "voix-june",
    "kind": "voice",
    "name": "Voix et légendes June",
    "description": "Comment écrire les légendes, hooks, textes à l'écran et appels à l'action, pour le compte de June comme pour les clients. À utiliser pour toute légende, tout texte de montage et le Content Board.",
    "body": "# Voix June\n\n## Le registre\nChaleureux, sensoriel, simple. Phrases courtes, souvent une idée par ligne. On parle de ce que\nl'on **ressent**, pas seulement de ce que l'on voit : la lumière, la matière, le silence, l'odeur\ndu café, l'eau tiède. Sûr de son goût, jamais de forcing.\n\n## Deux cas\n1. **Compte de June** : Ludivine parle à la première personne (« je »), avec simplicité. Elle\n   raconte ce qu'elle a vécu sur place et ce qu'elle a voulu transmettre. Elle ne vend pas, elle\n   donne envie.\n2. **Légendes livrées à un client** (Content Board) : le lieu parle de lui-même, dans le ton du\n   client (« nous » ou impersonnel selon le brief), au plus près de l'expérience de ses hôtes.\n   Toujours demander ou retrouver le ton du client avant d'écrire.\n\n## Structure d'une légende Instagram\n1. **Accroche** (1 ligne, visible avant « plus ») : une sensation ou un moment précis.\n2. **Corps** (2 à 5 lignes courtes) : ce qu'on vit, dans l'ordre où on le vit.\n3. **Invitation** douce (facultative) : « Et vous, vous commencez par quoi ? », « Lien en bio pour\n   réserver », adaptée au client.\n4. Hashtags : 3 à 6 maximum, précis (lieu, région, type d'expérience), jamais de liste générique.\n   Les placer en fin de légende ou en premier commentaire selon la consigne de programmation.\n\n## Hooks (texte à l'écran, 1re seconde)\n- Courts : 3 à 8 mots. Une image mentale ou une question qui se ressent.\n- Exemples de ton (à varier, ne pas copier tels quels) : « Le matin commence ici. »,\n  « Il y a des lieux qui ralentissent tout. », « Ce que l'on vit avant même d'arriver. »\n\n## Mots et tournures à éviter\n« booster », « n'hésitez pas », « solution », « ROI », « digital », « contenu premium »,\n« stratégie », « visibilité 360 », « incroyable », superlatifs vides, promesse de résultats,\nemoji dans les hooks et les titres (1 ou 2 emoji discrets tolérés dans une légende client si son\nton le permet).\n\n## Formulations de June à garder telles quelles quand elles servent\n- « Vous faites vivre l'expérience. Je m'occupe de la raconter. »\n- « Faire ressentir l'expérience avant même de l'avoir vécue. »\n- « Le format vient toujours après l'histoire que l'on souhaite raconter. »",
    "data": null,
    "files": {},
    "hash": "26b3ff3e646889d3"
  }
];
