# BRIEF — June, landing scrollcraft

Interviewé le 2026-08-25 (Robin, via AskUserQuestion — réponses verbatim).

## Les huit réponses

1. **Vibe** : « Golden hour, calme, sûr de son goût » (option recommandée retenue,
   registre du skill design-direction confirmé : lumière de fin de journée,
   matière, sérénité).
2. **Parcours de scroll** : « Le travail d'abord — ouvrir directement sur les
   photos/reels de Ludivine, l'offre et le prix ensuite, contact à la fin. »
3. **Courbe d'énergie** : « Calme partout, un seul pic — page épurée et sereine,
   avec UN moment fort au milieu ou aux deux tiers. »
4. **Le moment à retenir** : « C'est le site où les photos prennent vie sous ton
   scroll » — le portfolio devient le moment fort.
5. **Une chose qu'aucun site ne fait** : « La lumière golden hour suit ton
   scroll — le soleil se couche pendant que tu descends la page : la lumière,
   les ombres et la teinte du fond évoluent du matin au soir, comme une journée
   de shooting. »
6. **Distance au premium-minimal** : « Premium-minimal strict — très épuré,
   beaucoup d'air, les photos font tout le travail. Zéro décoration. »
7. **Structure** : « Scènes distinctes, comme un magazine — chaque section est un
   chapitre avec son propre comportement. »
8. **Assets** : « Uniquement les vraies photos » — les 18 photos de
   `/public/realisations` + `portrait.jpg`. Pas de génération KIE (clé absente,
   et le but est précisément de montrer le vrai travail de Ludivine).

## La courbe de sentiment

1. **Immersion** — une photo pleine page déjà là (piscine intérieure, lumière
   chaude), étiquetée comme une œuvre. On est dans un lieu, pas sur un site.
2. **Curiosité** — la collection défile latéralement, six lieux, étiquettes
   factuelles de musée. On marche dans une salle.
3. **Émerveillement (LE PIC)** — une seule prestation se déroule : les photos du
   séjour à l'hôtel arrivent une à une sous la molette, du matin au soir,
   pendant que la lumière de la page atteint son heure la plus dorée.
4. **Intimité** — Ludivine, portrait golden hour, « je ». La page ralentit,
   quelqu'un parle.
5. **Confiance** — l'offre en clair : un prix, ce qui est compris, comment ça se
   passe. Une plaque d'exposition, pas un pitch.
6. **Résolution** — le soir. La page arrive au crépuscule (plaque espresso), une
   seule demande, le formulaire, et ça tient.

Pas deux actes adjacents avec le même sentiment.

## Le pic

Phrase visiteur : « J'ai scrollé et la journée entière à l'hôtel s'est déroulée
devant moi, photo après photo, jusqu'au soir. »
Il vit dans l'acte 3 (« La journée »), qui reçoit le plus grand span de la page
(4.2vh, marge visible sur tous les autres), le meilleur de la série photo, et le
silence avant lui.

**Silence autorisé** : l'entrée de l'acte 3 est volontairement presque vide
(fond chaud + une seule ligne « Une seule prestation. Un séjour, du matin au
soir. ») pendant ~8 % de sa progression avant que les tirages n'arrivent. Ce
n'est pas du dead scroll, c'est la respiration avant le pic.

## La phrase à raconter

« C'est le site où le soleil se couche pendant que tu descends la page — et où
un séjour entier se déroule sous ta main, jusqu'au soir. »

## Signature move

**Le soleil de la page** : le scroll est l'heure du jour. Une variable globale
`--day` (0 → 1, progression absolue de la page) pilote en même temps : la teinte
du fond (limestone frais du matin → sable doré → abricot chaud), un halo solaire
fixe qui descend vers l'horizon en se réchauffant, et un voile chaud
(mix-blend multiply) qui monte doucement. Tout est regradé d'un coup, rien n'est
un widget. JS bespoke dans la page, engine intact. Le pic (acte 3) tombe à
l'heure la plus dorée ; la clôture est le crépuscule (plaque espresso).
Signature et pic pointent le même moment : la journée qui passe.

## Grammaire : galerie / catalogue

La vraie question du visiteur est « qu'est-ce qu'elle fait, et est-ce que c'est
beau ? » — une collection, pas un argument. Nav = index qui saute, héros = objet
un déjà en vue déjà étiqueté, étiquettes = fait, pas pitch, clôture = plaque de
demande composée comme une étiquette. Pourquoi les sept autres ont perdu : voir
le rapport.

## Ce qui reste hors page

Pas de compteurs inventés (garde-fou brand-offer), pas de faux logos. Les
captures Instagram avec UI incrustée (next-yacht, una-mas, gîte, harmonie-yacht
reel, ugc-*) ne passent jamais en grand format : recadrées en cartes « reel
publié » ou absentes. Em dash bannie du texte visible. Un seul CTA :
« Réserver un shooting ».

## Feel check (après vérification, scroll à froid)

Ressenti acte par acte : immersion / curiosité / montée-émerveillement /
intimité / confiance / résolution. Diff avec la courbe voulue : aucun écart de
structure ; seule nuance, l'acte 3 lit « accumulation plaisante » plus
qu'« émerveillement » sur planche statique, le déroulé sous la molette et la
lumière au plus doré portent le reste en direct. Le pic est bien le plus grand
changement visuel de la planche et occupe le plus de scroll (3.8vh sur ~12.7).
Le dernier écran tient, plein, au crépuscule.
