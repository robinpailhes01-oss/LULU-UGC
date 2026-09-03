# June — preview de refonte — Design Spec

## Intake
- Projet : landing page / site de vente (brand mode). Job unique : « Réserver un shooting ».
- 3Ps : Pain = besoin de contenu, ni temps ni compétences, les généralistes ne connaissent pas les codes.
  Person = gérant·e d'un hébergement de charme qui gère tout seul·e, pas de budget agence.
  Promise = un shooting pensé pour l'hospitalité, livré vite, pas un généraliste.
- Preuve réelle (rien d'inventé) : lieux déjà shootés avec liens Instagram (hôtel & spa Provence,
  Gîte de l'Abric, Una Mas, Harmonie Yacht), prix réel 390 €, livraison sous 7 jours (skill copywriting),
  le séjour réel (arrivée / nuit / petit-déjeuner) décrit dans brand-offer.
- Assets : Tier A. Photos réelles du shooting hôtel & spa + portrait + couvertures de reels publiés.
- Copy : rédigée ici en français natif, registre copywriting (pas de « n'hésitez pas », pas de jargon).

## Brief stratégique
- UVP : June aide les gérants d'hébergements de charme à donner envie de réserver, avec des photos, reels
  et une vidéo UGC prêts à publier, en vivant leur lieu comme une cliente le temps d'un séjour.
- Piliers : vécu, pas posé · prêt à publier · une fois, pas d'abonnement · les codes de l'hospitalité · Occitanie.
- Archétypes : Explorateur (elle découvre, elle vit le lieu) + Protecteur (elle vous enlève ça des mains).
- Contre : le photographe généraliste (grille de portfolio + liste de tarifs), l'agence à abonnement (jargon, reporting).

| Entrée stratégique | Décision de design |
|---|---|
| Pilier « vécu, pas posé » | La page est structurée comme un séjour : arrivée 15 h → nuit → petit-déjeuner → départ 11 h |
| Pilier « prêt à publier » | La livraison est montrée avec de vraies couvertures de reels publiés, pas des icônes |
| Contre « photographe généraliste » | Pas de grille de portfolio ; la preuve est racontée lieu par lieu |
| Contre « agence abonnement » | Un seul prix, une seule action, la mention « une fois » dans le hero |
| Explorateur + Protecteur | Serif chaleureux à axe optique (Fraunces SOFT), lumière qui suit le séjour, motion lente sans à-coups |

## Direction esthétique
« La fiche d'accueil d'une chambre d'hôtes (horaires d'arrivée, carte de bienvenue, livre d'or) +
la pagination d'un magazine de voyage » : la page est un séjour raconté par ses horaires. Les heures sont
un vrai dispositif structurel (15 h, 19 h 30, 22 h 30, 8 h, 11 h), pas une décoration.
Bloqué : hero centré sur dégradé, grille de trois cartes-icônes, carrousel d'avis, eyebrows capitales partout.

## Tokens
- Couleur : surface #F1E8DA (après-midi) · surface-alt #FAF6EE · text #221A14 · text-muted #6E6052 ·
  accent #8A5A2E (châtaigne) · honey #D89B4E (accent sur fond nuit) · night #17110D / night-text #F2E7D6.
- Type : Fraunces (display, opsz 144, SOFT 40, graisse 380) · Manrope (corps, 400–700). Chiffres tabulaires pour les heures.
- Espace : base 8 px (8 / 16 / 24 / 32 / 48 / 64 / 96 / 128). Conteneur 76 rem.
- Rayon : 14 px pour les cartes photo, pilule pour l'action principale.
- Ombre : ambiante chaude uniquement sur les cartes de moments (élevées par concept).
- Motion : 160 / 240 / 600 ms, cubic-bezier(.16,1,.3,1). Réduit : pas de pin, pas de parallaxe.

## Élément signature
« Le séjour » : une section épinglée où cinq moments s'empilent en cartes pendant que le fond passe de
l'après-midi à la nuit puis au matin. Une seule section épinglée, tout le reste est calme.
