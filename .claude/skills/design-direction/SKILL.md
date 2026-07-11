---
name: design-direction
description: >
  Direction artistique de la marque et de la landing page. À consulter pour toute
  décision visuelle : couleurs, typographie, espacements, composants, animations,
  responsive, accessibilité. Encode un registre éditorial chaleureux où le contenu
  (les reels/photos) est le héros de la page. S'appuie sur brand-offer pour le fond.
---

# Direction artistique — Studio [NOM]

Registre **éditorial chaleureux**. On vend du goût : la page doit elle-même être une
preuve de goût. Le contenu (cartes verticales façon reels) est le héros, pas un visuel
décoratif générique. Lumière de fin de journée, sérénité, matière. Jamais le look
« plateforme SaaS / AI » bleu-tech.

## Tokens couleur
Définir en variables CSS / config Tailwind. Ne pas introduire d'autres couleurs.

```
--limestone : #F2EBE0   /* fond principal, base chaude sable */
--cream     : #FBF7F0   /* surfaces surélevées, cartes claires */
--espresso  : #241D17   /* texte principal + boutons sombres (near-black chaud) */
--chestnut  : #8B5E34   /* accent : mots en italique, points, détails (marron — pas de bordeaux) */
--honey     : #C98A3C   /* lumière golden-hour, halos, micro-détails */
--muted     : #6B5E50   /* texte secondaire */
--line      : rgba(36,29,23,.12)  /* filets, séparateurs */
```

Règles :
- Fond limestone par défaut ; sections alternées possibles en cream pour rythmer.
- Boutons primaires : fond espresso, texte cream. Un seul style de CTA primaire.
- L'accent chestnut est **rare** : un mot d'un titre, un point, une puce. Pas de gros aplats.
- Le honey ne sert qu'à la lumière (halos radiaux, lueur derrière le contenu).

## Typographie
- **Display — Fraunces** (variable). Titres, gros chiffres, accents éditoriaux.
  Poids 300–500, optical size haute pour les grands titres. Italique pour l'accent chestnut.
  *N.B. : volontairement différent du Cormorant utilisé sur les autres marques de Robin —
  cette marque a sa propre voix.*
- **Texte / UI — Manrope** (300–600). Sous-titres, paragraphes, boutons, labels.
- Chargement via `next/font/google` (pas de FOUT).
- Échelle indicative (clamp pour le responsive) :
  - H1 : `clamp(38px, 6vw, 76px)`, line-height ~1.04, letter-spacing -.01em
  - H2 : `clamp(28px, 4vw, 44px)`
  - Corps : 16–18px, line-height 1.6
  - Eyebrow/labels : 11px, uppercase, letter-spacing .26em, Manrope 600, couleur muted

## Signature de la page
Le **contenu vertical « prêt à publier »** : des cartes au format 9:16 (façon reel),
avec badge « Prêt à publier », bouton play, et un libellé de cas d'usage
(« Reel restaurant », « Logement insolite »…). C'est l'incarnation directe de la promesse.
Elles flottent doucement dans une lumière golden-hour. C'est l'élément qu'on retient.

## Composants
- **Cartes contenu** : ratio 9:16, border-radius ~20px, ombre douce et chaude
  (`0 22px 50px rgba(36,29,23,.18)`), overlay dégradé bas pour lisibilité du libellé.
  Tant qu'il n'y a pas de vrais visuels : dégradés chauds (golden hour) en placeholder,
  jamais de stock photo générique. Remplacer par les vrais reels/photos dès dispo.
- **Boutons** : pill (`border-radius:100px`). Primaire espresso/cream. Secondaire « fantôme »
  (texte espresso + soulignement fin). Hover : translateY(-2px) + ombre douce.
- **Eyebrow** : petit point chestnut + label uppercase tracké.
- **Preuve sociale** : pastilles d'avatars empilées + une phrase courte. Pas de faux chiffres.
- **Halo lumineux** : dégradé radial honey très diffus, fixe ou en lente dérive.

## Motion (sobre, jamais clinquant)
La retenue est ce qui fait « premium ». Trop d'animation = effet IA générique.
- **À l'arrivée** : révélation en cascade (eyebrow → titre ligne 1 → ligne 2 → sous-titre →
  CTA → preuve), translateY(18px)+opacity, ~0.8–0.9s, délais échelonnés de ~120ms.
- **Cartes** : entrée décalée puis flottement lent et continu (amplitude 12–18px, 7–9s),
  désynchronisé d'une carte à l'autre.
- **Halo** : dérive lente (~18s) en boucle alternée.
- **Hover cartes** : lift + léger scale, play qui grossit un peu.
- **Au scroll** : révélations discrètes des sections (Framer Motion `whileInView`, once).
- **`prefers-reduced-motion`** : tout désactivé, contenu visible immédiatement. Obligatoire.

## Layout
- Conteneur max ~1180px, gouttières 28px (desktop), 20px (mobile).
- Beaucoup d'air. Le vide fait partie du luxe.
- Hero centré. Reste de la page en rythme alterné limestone/cream.
- Mobile-first : cartes réduites, on en masque 1–2 sous 760px / 440px plutôt que de tasser.

## Plancher qualité (non négociable)
- Responsive jusqu'au mobile étroit (~360px).
- Focus clavier visible sur tous les éléments interactifs.
- Contraste texte AA (espresso/muted sur limestone : OK ; vérifier les libellés sur cartes).
- `prefers-reduced-motion` respecté.
- Pas de layout shift au chargement des fonts.

## Pièges à éviter
- Spécificité CSS qui s'annule entre `.section` et `.cta` (paddings/margins). Nommer les
  classes par section.
- Multiplier les accents colorés : un seul accent (chestnut), une seule lumière (honey).
- « Décorer » avec des numéros 01/02/03 si le contenu n'est pas une vraie séquence.
