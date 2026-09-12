---
version: 1
slug: "previews-june-impeccable-html"
primary_target: "previews/june-impeccable.html"
related_targets: ["app/page.tsx"]
---

# Surface brief — previews/june-impeccable.html (preview de la landing June)

Scope : preview HTML autonome (un seul fichier, images et polices inlinées) de la page d'accueil. Mode : Persuade.
Audience : gérant·e d'un lieu / d'une expérience (hôtel, chalet, bar, gîte, yacht, activité) ou marque, arrivant d'Instagram sur téléphone. Job : comprendre en quelques secondes ce que June produit, voir que c'est réel, choisir une offre, envoyer une demande.
Action : « Parler de mon projet → » (formulaire en plaque de nuit) ; actions d'offre « Imaginer mon shooting → », « Créer mon contenu UGC → », « Devenir June Partner → ».
Preuve : réalisations réelles (public/realisations) et compteurs de vues Instagram lus sur les captures réelles (Gîte de l'Abric 4 403, Una Mas 3 865, Harmonie Yacht 20,3 K), à confirmer par Ludivine avant mise en ligne. Aucun témoignage, aucun logo, aucun chiffre inventé.
Contraintes : DA pinnée (limestone / Fraunces / Manrope / golden hour), titres et prix V1 verbatim, paragraphes resserrables dans la voix June, garde-fous brand-offer, mobile prioritaire, prefers-reduced-motion.
Décisions ouvertes : compteurs à confirmer ; lien Instagram réel (placeholder `href="#"` marqué data-todo dans le pied de page) ; domaine junecontentstudio.fr ; adresse mail de réception (harmonieyacht@gmail.com dans la preview).

## Direction contract

THESIS : La page ouvre sur la preuve, pas sur la promesse : les vrais Réels publiés, avec leurs vraies vues, forment un mur que le visiteur longe. Elle refuse le scaffold de la catégorie (photo hero + trois cartes-icônes + tableau de prix) et le kicker au-dessus des titres.

OWN-WORLD : monde hérité. Limestone qui glisse vers l'heure dorée puis la nuit au fil du scroll ; Fraunces léger à grande taille optique avec une italique chestnut pour l'accent ; Manrope pour le corps et les étiquettes ; plaques 9:16 à coins 18 px portant une étiquette lieu + compteur (œil dessiné en SVG) ; un seul CTA primaire pilule espresso/cream, un CTA honey sur les plaques de nuit ; filets rgba(36,29,23,.12) ; ombres chaudes décalées et floues. Reconnaissable sans contenu : un mur de plaques verticales décalées sur sable chaud, une ligne de titre posée dessus.

STORY : Le visiteur reconnaît son propre lieu dans le mur (un gîte, un bar, un yacht, un hôtel), voit que ce sont des pièces publiées avec un public réel, comprend que June vit le lieu et en fait du contenu prêt à publier, lit trois offres accrochées au mur comme des étiquettes de prix, et écrit à Ludivine.

FIRST VIEWPORT : Mur bord à bord sur toute la hauteur : plaques 9:16 (Réels, UGC) et 4:5 (photos) en colonnes décalées verticalement. Desktop : six colonnes au-dessus de 1200 px (à 1440 px, cinq colonnes laissaient des plaques de 270 px et un mur clairsemé ; six gardent le mur dense), cinq en dessous, la 2e et la 4e remontées ; les trois Réels avec compteur occupent les colonnes 4 à 6, hors de la plaque de titre, pour que la preuve reste lisible. Mobile : les mêmes trois colonnes 4 à 6, serrées, avec les trois compteurs en rangée du haut. Chaque Réel publié porte en bas son étiquette « Lieu · 4 403 vues » ; les photos et UGC portent « Photo » / « Vidéo UGC » (seuls trois compteurs réels existent, aucun autre chiffre n'est inventé). En bas à gauche, sur une plaque limestone qui chevauche le mur, le titre en deux lignes Fraunces : « Votre expérience mérite d'être vue. » puis en italique chestnut « Et surtout, d'être vécue. », une phrase en Manrope (« UGC, Réels et Photos pour les lieux, expériences et marques. Alpe d'Huez, saison 26/27. »), puis le CTA primaire « Parler de mon projet → » et le lien « Voir les offres ». Nav : mot-marque « June » à gauche, CTA pilule à droite, rien d'autre.

FORM : « Le mur de preuves », index 7 de ma liste ordonnée (dernier par résonance, tiré en tête), seed edc8e105, code-led (aucune génération d'image disponible dans cet environnement). Interaction signature : le mur se longe, chaque colonne dérive à sa propre vitesse au scroll (parallaxe par colonne) et chaque plaque « se développe » à l'entrée (émergence continue depuis un voile ambre, mask + filtre, pilotée par le scroll, jamais un fondu identique). Emprunts nommés : darkroom → l'émergence continue des images ; Massin → les lignes de douleur montent en taille, jamais en couleur ; brick instructions → dans le process, l'étape passée s'estompe, la nouvelle arrive vive.

FINISH : unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance.
