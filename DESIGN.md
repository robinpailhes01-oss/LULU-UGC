---
name: June Content Studio
description: Le mur de preuves — limestone qui glisse vers l'heure dorée, Fraunces léger et italique chestnut, plaques 9:16 à coins 18 px, un seul CTA pilule espresso.
colors:
  sand: "#F4F0E8"
  cream: "#FBF7F0"
  ink: "#241D17"
  night: "#17110D"
  night-ink: "#F2E7D6"
  night-muted: "#BFAE98"
  chestnut: "#8B5E34"
  honey: "#D89B4E"
  muted: "#6B5E50"
  line: "rgba(36,29,23,.12)"
  line-strong: "rgba(36,29,23,.28)"
  plate-base: "#d9c7ad"
  etiquette-veil: "rgba(23,17,13,.68)"
typography:
  display:
    fontFamily: "Fraunces, Georgia, 'Times New Roman', serif"
    fontSize: "clamp(2.3rem, 1.2rem + 3.6vw, 4.4rem)"
    fontWeight: 340
    lineHeight: 1.02
    letterSpacing: "-0.02em"
    fontVariation: "'opsz' 144, 'SOFT' 30"
  display-accent:
    fontFamily: "Fraunces, Georgia, 'Times New Roman', serif"
    fontWeight: 380
    fontStyle: italic
  headline:
    fontFamily: "Fraunces, Georgia, 'Times New Roman', serif"
    fontSize: "clamp(2rem, 1.1rem + 2.9vw, 3.6rem)"
    fontWeight: 340
    lineHeight: 1.02
    letterSpacing: "-0.02em"
    fontVariation: "'opsz' 144, 'SOFT' 30"
  title:
    fontFamily: "Fraunces, Georgia, 'Times New Roman', serif"
    fontSize: "clamp(1.45rem, 1.15rem + .9vw, 2rem)"
    fontWeight: 400
    lineHeight: 1.02
    letterSpacing: "-0.02em"
    fontVariation: "'opsz' 144, 'SOFT' 30"
  price:
    fontFamily: "Fraunces, Georgia, 'Times New Roman', serif"
    fontSize: "clamp(2.4rem, 2rem + 1.4vw, 3.4rem)"
    fontWeight: 320
    lineHeight: 1
    letterSpacing: "-0.02em"
    fontVariation: "'opsz' 144, 'SOFT' 30"
    fontFeature: "tabular-nums lining-nums"
  lede:
    fontFamily: "Manrope, system-ui, -apple-system, 'Segoe UI', sans-serif"
    fontSize: "clamp(1.08rem, 1rem + .45vw, 1.3rem)"
    fontWeight: 400
    lineHeight: 1.5
  body:
    fontFamily: "Manrope, system-ui, -apple-system, 'Segoe UI', sans-serif"
    fontSize: "clamp(1rem, .96rem + .2vw, 1.1rem)"
    fontWeight: 400
    lineHeight: 1.6
  label:
    fontFamily: "Manrope, system-ui, -apple-system, 'Segoe UI', sans-serif"
    fontSize: "0.78rem"
    fontWeight: 600
    lineHeight: 1.3
    letterSpacing: "0.005em"
  button:
    fontFamily: "Manrope, system-ui, -apple-system, 'Segoe UI', sans-serif"
    fontSize: "0.98rem"
    fontWeight: 600
  mark:
    fontFamily: "Fraunces, Georgia, 'Times New Roman', serif"
    fontSize: "1.7rem"
    fontWeight: 400
    fontStyle: italic
    lineHeight: 1
    letterSpacing: "-0.01em"
rounded:
  focus: "6px"
  sm: "12px"
  plate: "18px"
  tag: "20px"
  head: "24px"
  pill: "999px"
spacing:
  gutter: "clamp(1.25rem, 4vw, 4.5rem)"
  maxw: "78rem"
  wall-gap: "clamp(.6rem, 1.3vw, 1.3rem)"
  tag-gap: "clamp(1rem, 2.4vw, 2.2rem)"
  grid-gap: "clamp(2rem, 6vw, 6rem)"
  section: "clamp(4rem, 9vw, 8rem)"
  section-lg: "clamp(5rem, 11vw, 9rem)"
  section-night: "clamp(5rem, 12vw, 10rem)"
components:
  button-primary:
    backgroundColor: "{colors.ink}"
    textColor: "{colors.cream}"
    typography: "{typography.button}"
    rounded: "{rounded.pill}"
    padding: ".95rem 1.65rem"
  button-primary-hover:
    backgroundColor: "{colors.ink}"
    textColor: "{colors.cream}"
  button-honey:
    backgroundColor: "{colors.honey}"
    textColor: "{colors.night}"
    typography: "{typography.button}"
    rounded: "{rounded.pill}"
    padding: ".95rem 1.65rem"
  button-ghost:
    backgroundColor: "transparent"
    textColor: "{colors.ink}"
    typography: "{typography.button}"
    rounded: "{rounded.pill}"
    padding: ".95rem 1.65rem"
  nav-cta:
    backgroundColor: "{colors.ink}"
    textColor: "{colors.cream}"
    rounded: "{rounded.pill}"
    padding: ".7rem 1.2rem"
  plate:
    backgroundColor: "{colors.plate-base}"
    rounded: "{rounded.plate}"
  etiquette:
    backgroundColor: "{colors.etiquette-veil}"
    textColor: "{colors.night-ink}"
    typography: "{typography.label}"
    rounded: "{rounded.sm}"
    padding: ".5rem .7rem"
  wall-head:
    backgroundColor: "{colors.cream}"
    textColor: "{colors.ink}"
    rounded: "{rounded.head}"
    padding: "clamp(1.5rem, 2.6vw, 2.6rem) clamp(1.5rem, 2.8vw, 2.8rem)"
  tag:
    backgroundColor: "{colors.cream}"
    textColor: "{colors.ink}"
    rounded: "{rounded.tag}"
    padding: "clamp(1.6rem, 2.4vw, 2.4rem) clamp(1.4rem, 2.2vw, 2.2rem)"
  tag-night:
    backgroundColor: "{colors.night}"
    textColor: "{colors.night-ink}"
    rounded: "{rounded.tag}"
    padding: "clamp(1.6rem, 2.4vw, 2.4rem) clamp(1.4rem, 2.2vw, 2.2rem)"
  ugc-cell:
    backgroundColor: "{colors.sand}"
    rounded: "{rounded.sm}"
    padding: ".7rem .75rem"
  input-night:
    backgroundColor: "rgba(242,231,214,.06)"
    textColor: "{colors.night-ink}"
    rounded: "{rounded.sm}"
    padding: ".85rem 1rem"
---

# Design System: June Content Studio

## Overview

**Creative North Star: "Le mur de preuves"**

Le système est celui d'un mur de plaques verticales, posées sur un sable chaud, que le visiteur longe. Le fond n'est pas une couleur mais une lumière : le limestone (#F4F0E8) glisse vers l'heure dorée au fil du scroll, puis la page bascule sur deux plaques de nuit (Alpe d'Huez, contact) où le même vocabulaire passe en négatif. Rien n'est décoratif : les images sont les Réels et photos réellement publiés, et les seuls chiffres affichés sont les compteurs lus sur les captures.

La densité est éditoriale, pas SaaS : un display Fraunces léger (340) à grande taille optique, une italique chestnut pour l'accent, Manrope pour le corps, les prix et les étiquettes. Les ombres sont chaudes, décalées vers le bas et très floues ; les filets sont des voiles d'encre (rgba(36,29,23,.12)) plutôt que des gris. La motion est retenue et pilotée par le scroll : les plaques « se développent » comme un tirage argentique, les colonnes dérivent chacune à sa vitesse, les lignes de douleur montent en taille jamais en couleur, et `prefers-reduced-motion` livre tout immédiatement.

Refus confirmés par le build : pas de photo hero unique, pas de trois cartes-icônes, pas de tableau de prix, pas de kicker ni d'eyebrow au-dessus des titres, pas de témoignage, logo ou compteur inventé.

**Key Characteristics:**
- Fond vivant : le canvas interpole cinq arrêts rgb du limestone au sable doré selon la progression du scroll.
- Plaques 9:16 (Réels, UGC) et 4:5 (photos) à coins 18 px, chacune portant une étiquette lieu + format ou compteur de vues.
- Un seul CTA primaire pilule espresso/cream ; sur les plaques de nuit, la même pilule devient honey/night.
- Fraunces 300–600 variable (opsz 144, SOFT 30), italique chestnut pour la seconde ligne du titre ; Manrope 400–700 partout ailleurs.
- Profondeur par ombres chaudes très floues et voiles teintés (color-mix, backdrop-filter), jamais par bordure dure.

## Colors

Une palette de pierre chaude et de lumière rasante : deux sables clairs, deux encres brunes, un brun chestnut pour l'accent, un honey pour les surfaces sombres, et un muted pour le texte secondaire.

### Primary
- **Chestnut** (`{colors.chestnut}`) : l'accent du jour. Italiques des titres (« Et surtout, d'être vécue. »), verbes de positionnement, numéros de process, puces des listes d'offres, barre de progression des douleurs, anneau de focus (`outline: 2px solid`), caret et pouce de scrollbar (à 55 %). Jamais utilisé en fond de bouton sur limestone.
- **Honey** (`{colors.honey}`) : l'accent de nuit. Remplace chestnut sur les plaques sombres : italiques des titres `.dark .d em`, CTA `btn--honey`, puces de June Partner, bordure de focus des champs, statut du formulaire, halo radial de l'Alpe (à 28 %), surlignage de sélection (à 38 % le jour, 50 % la nuit). En journée il n'apparaît qu'en mélange : la cellule « 3 UGC » est `color-mix(in srgb, honey 22%, sand)`.

### Neutral
- **Sand / limestone** (`{colors.sand}`) : le canvas au sommet de la page (`--canvas` en repos) ; fond des cellules de prix UGC ; bordure du pouce de scrollbar.
- **Cream** (`{colors.cream}`) : surfaces posées sur le sable : plaque de titre du mur (à 94 % + blur 8 px), étiquettes d'offre, texte des boutons espresso, fond des `<option>`.
- **Ink / espresso** (`{colors.ink}`) : texte courant, fond du CTA primaire, mot-marque, source des filets et ombres (toutes les rgba(36,29,23,…)).
- **Night** (`{colors.night}`) : fond des sections `.dark` (Alpe, contact), de l'étiquette June Partner, du texte sur honey ; le voile d'étiquette des plaques (`{colors.etiquette-veil}`) en dérive.
- **Night ink** (`{colors.night-ink}`) : texte sur night ; ses dérivés rgba(242,231,214,α) donnent les filets de nuit (.14, .18), les champs (.06 / .09), les placeholders (.45) et les soulignés (.4).
- **Night muted** (`{colors.night-muted}`) : texte secondaire sur night (copy Alpe, labels de champs, pied de page, prix « HT / mois » de June Partner).
- **Muted** (`{colors.muted}`) : texte secondaire sur limestone (notes, pitchs d'offre, FAQ, réponses, hint « Longez le mur »).
- **Line / Line strong** (`{colors.line}`, `{colors.line-strong}`) : filets de section, séparateurs de listes, rail des étiquettes, fil de suspension et anneau des étiquettes, bordure du CTA ghost.
- **Plate base** (`{colors.plate-base}`) : fond des plaques avant développement, sous le voile ambre (#ead8b9 → #dcc094 → #c9a066).

### Named Rules
**The Golden Hour Rule.** Le canvas n'est jamais fixe : `--canvas` est interpolé au scroll entre rgb(244,240,232), rgb(242,234,217), rgb(242,227,198), rgb(238,218,188) et rgb(234,210,175) (arrêts 0 / .3 / .6 / .85 / 1 de la hauteur défilable). Tout élément qui doit se fondre dans le fond lit `var(--canvas)` (nav, anneau des étiquettes), jamais `--sand` en dur.

**The Two Accents Rule.** Chestnut est l'accent du jour, honey l'accent de nuit ; ils ne se croisent pas. Sur limestone honey n'existe qu'en mélange sous 25 % ; sur night chestnut n'apparaît pas.

**The Ink Veil Rule.** Filets, ombres, voiles et sélections sont des alphas de l'encre (36,29,23) ou de night-ink (242,231,214), jamais un gris neutre.

## Typography

**Display Font:** Fraunces variable 300–600, romain + italique, auto-hébergée (avec Georgia, « Times New Roman », serif)
**Body Font:** Manrope 400 / 500 / 600 / 700, auto-hébergée (avec system-ui, -apple-system, « Segoe UI », sans-serif)

**Character:** Fraunces est réglée à son extrême optique (`opsz 144`, `SOFT 30`) en graisse légère (320–400) et interlettrage serré (−0.02 em) : des titres qui respirent, adoucis, jamais gras. L'italique (380) porte la seconde ligne du titre et les verbes ; en couleur chestnut le jour, honey la nuit. Manrope tient tout le reste, y compris les chiffres des prix (tabular-nums lining-nums) et le sigle € en petit exposant.

### Hierarchy
- **Display** (340, `clamp(2.3rem, 1.2rem + 3.6vw, 4.4rem)`, 1.02) : le h1 du mur et la quatrième ligne des douleurs. `text-wrap: balance`.
- **Headline** (340, `clamp(2rem, 1.1rem + 2.9vw, 3.6rem)`, 1.02) : tous les h2 de section, titres verbatim V1.
- **Title** (400, `clamp(1.45rem, 1.15rem + .9vw, 2rem)`, 1.02) : h3 des formats, noms d'offres, titres d'étapes. Peut porter un `small` Manrope 600 chestnut inline (« Réels faire ressentir ») ou un sous-titre `small` Manrope 500 muted en bloc sous le nom d'offre.
- **Verbes / question** (340, `clamp(1.5rem, 1rem + 2vw, 2.6–2.8rem)`, 1.12–1.15, −0.015 em) : la liste des verbes de positionnement et la triple question de l'Alpe.
- **Price** (320, `clamp(2.4rem, 2rem + 1.4vw, 3.4rem)`, 1, tabular) : prix d'offre en Fraunces, avec « à partir de » et « HT » en Manrope 500 muted (.95 / .85 rem) et le € en Manrope 400 à .55 em remonté de .2 em. Cellules UGC : 1.5 rem (1.3 rem sous 480 px).
- **Step number** (320, 2.6 rem, 1, −0.03 em, chestnut, tabular) : « 01 » à « 04 » du process.
- **FAQ question** (400, `clamp(1.15rem, 1rem + .6vw, 1.45rem)`, 1.25, −0.01 em) : summary des `<details>`.
- **Mark** (italique 400, 1.7 rem nav / 1.4 rem pied) : le mot-marque « June ».
- **Lede** (400, `clamp(1.08rem, 1rem + .45vw, 1.3rem)`, 1.5, max 40 ch) : phrase sous le h1 et sous le titre des offres.
- **Body** (400, `clamp(1rem, .96rem + .2vw, 1.1rem)`, 1.6) : paragraphes, bornés à 26–56 ch selon le contexte (26 ch étape, 30 ch pitch d'offre, 34 ch note, 44 ch copy, 56 ch réponse FAQ).
- **Label** (600, .78–.86 rem, 1.3, 0.005 em, casse normale) : étiquettes de plaques (nom en 600, compteur en 500 à 80 % d'alpha), labels de champs (600, .82 rem, night-muted), notes de prix (.75–.85 rem).
- **Button** (600, .98 rem ; .9 rem dans la nav) : libellés de CTA, flèche « → » incluse dans le texte verbatim.

### Named Rules
**The Light Fraunces Rule.** Fraunces ne dépasse jamais 400 et se règle toujours en `opsz 144, SOFT 30` ; l'emphase vient de l'italique et de la couleur, jamais de la graisse.

**The Size-Not-Color Rule.** Une progression de lecture monte en taille (douleurs : 2.2 → 3.2 → 4.4 rem max), jamais en couleur ; la couleur n'arrive qu'à la chute, en italique chestnut.

**The No-Kicker Rule.** Aucun eyebrow, kicker ou étiquette en capitales au-dessus d'un titre ; le qualificatif vit après le titre (small inline) ou sous lui.

## Layout

Un conteneur unique `.wrap` (largeur max 78 rem, gouttière `clamp(1.25rem, 4vw, 4.5rem)`) ; le mur, le rail des offres et le carrousel mobile des formats débordent volontairement de la gouttière (`margin-inline: calc(var(--gutter) * -1)`).

**Le mur (premier écran).** `100svh` (min 640 px), six colonnes en grille dès 1201 px, cinq entre 901 et 1200 px (la sixième est masquée), écart `clamp(.6rem, 1.3vw, 1.3rem)`. Chaque colonne porte un décalage vertical propre (`--off` : 14 / 0 / 10 / 2 / 16 / 8 vh) et un facteur de parallaxe (`--sp` : .16 / .32 / .08 / .28 / .20 / .24) appliqué à `-min(scrollY, 1.4·vh)`. Les trois Réels avec compteur occupent les colonnes 4 à 6. La plaque de titre est absolue en bas à gauche (max `min(40rem, 46vw)`), le hint « Longez le mur » en bas à droite (masqué sous 1300 px, comme les localités des étiquettes).

**Sections.** Rythme vertical en `clamp` : `clamp(4rem, 9vw, 8rem)` pour formats, offres, process, FAQ ; `clamp(5rem, 11vw, 9rem)` pour positionnement et contact ; `clamp(5rem, 12vw, 10rem)` pour l'Alpe ; `clamp(3rem, 7vw, 6rem)` pour l'à-propos. Grilles éditoriales asymétriques à deux colonnes : 5/7 (positionnement, à-propos, contact), 7/5 (tête des formats), 4/8 (FAQ), 6/6 (Alpe), écart `clamp(2rem, 6vw, 6rem)`. Formats : trois colonnes alignées en bas, la deuxième remontée de `clamp(1rem, 4vw, 4rem)`. Offres : trois étiquettes suspendues à un rail 1 px pleine largeur, chacune à sa hauteur de suspension (`--hang` 2.2 / 5 / 3.4 rem). Process : quatre colonnes. Douleurs : piste de 330 vh (420 vh mobile) avec scène collante 100svh.

**Points de rupture.** 1300 px (localités et hint disparaissent), 1200 px (six → cinq colonnes), 900 px (mobile : mur en trois colonnes `.col--m` sur 74svh, plaque de titre remontée de −17svh en flux, grilles en une colonne, formats en carrousel `scroll-snap` à 74 vw, étapes en 2 colonnes, formulaire en une colonne, CTA nav court « Mon projet → »), 480 px (étapes en une colonne, prix UGC réduits). Responsive testé jusqu'à 360 px.

## Elevation & Depth

Hybride : les surfaces posées (plaque de titre, étiquettes d'offre, plaques photo) portent une ombre chaude à deux couches, très floue et décalée vers le bas ; tout le reste est plat et distingué par des voiles teintés (color-mix + backdrop-filter) ou des filets alpha. Les ombres sont ambiantes : elles disent « objet posé sur le mur », jamais un état.

### Shadow Vocabulary
- **Plate** (`box-shadow: 0 3px 8px rgba(36,29,23,.08), 0 28px 60px -22px rgba(36,29,23,.32)`) : toutes les plaques d'image, y compris le portrait.
- **Tag** (`box-shadow: 0 4px 10px rgba(36,29,23,.07), 0 34px 60px -30px rgba(36,29,23,.35)`) : plaque de titre du mur et étiquettes d'offre.
- **Button hover** (`0 12px 26px -12px rgba(36,29,23,.55)` ; honey : `0 12px 30px -10px rgba(216,155,78,.6)`) : seule ombre d'état, apparaît au survol avec une levée de 2 px.
- **Voiles** : nav `color-mix(in srgb, var(--canvas) 82%, transparent)` + blur 14 px (night 78 % sur les sections sombres) ; plaque de titre cream 94 % + blur 8 px ; étiquette de plaque rgba(23,17,13,.68) + blur 10 px ; dégradé de lisibilité en bas de plaque `rgba(36,29,23,0) 55% → .55 100%`.

### Named Rules
**The Warm Shadow Rule.** Toute ombre est de l'encre chaude (36,29,23) ou du honey (216,155,78), en deux couches dont la seconde a un spread négatif ; jamais de noir pur ni d'ombre dure décalée.

**The Rest-Is-Flat Rule.** Seuls les objets posés sur le mur ont une ombre au repos ; les boutons n'en gagnent une qu'au survol.

## Shapes

Coins généreux et gradués : 12 px pour les petits objets (étiquette de plaque, champs, cellules de prix), 18 px pour les plaques d'image, 20 px pour les étiquettes d'offre (et la plaque de titre sur mobile), 24 px pour la plaque de titre desktop, pilule 999 px pour tout bouton, 6 px sur l'anneau de focus. Les plaques sont des rectangles 9:16 ou 4:5 à `overflow: hidden`, `object-fit: cover` avec une position focale par image (`--pos`). Les filets sont des lignes de 1 px alpha (pointillés uniquement dans la grille des suppléments). Deux formes signature : le fil de suspension (1 px vertical, `line-strong`) et l'anneau (12 px, bordure 1.5 px, fond canvas ; fond night sur l'étiquette sombre) qui accrochent chaque offre au rail. Les icônes sont des SVG à trait 1.6 (œil, lecture, plus, flèche bas), en `currentColor`, taille 1 em à 1.1 rem.

## Components

### Buttons
- **Shape :** pilule (999 px), `inline-flex`, gap .55 rem, Manrope 600 .98 rem.
- **Primary (espresso) :** fond ink, texte cream, padding .95 rem 1.65 rem. Un seul par bloc ; c'est « Parler de mon projet → » dans le mur et la nav, les trois CTA d'offre sur étiquette cream.
- **Honey :** fond honey, texte night ; réservé aux surfaces de nuit (étiquette June Partner, Alpe, formulaire de contact) et au CTA nav quand la nav survole une section sombre.
- **Ghost :** transparent, texte ink, anneau `inset 0 0 0 1px line-strong` (ink au survol). Défini, non employé sur cette page.
- **Hover / Active :** `translateY(-2px)` + ombre d'état, `transition .32s cubic-bezier(.16,1,.3,1)` ; actif `translateY(1px)`.
- **Focus :** anneau global `2px solid chestnut`, offset 3 px, rayon 6 px.
- **Link :** souligné 1 px, `text-underline-offset .24em`, couleur du trait à 35 % d'alpha (40 % night-ink la nuit), pleine couleur au survol en .25 s. Sert de CTA secondaire (« Voir les offres »).

### Plate (plaque) + Étiquette
- **Plate :** `aspect-ratio 9/16` (`.plate--photo` : 4/5), coins 18 px, fond `#d9c7ad`, ombre Plate, `isolation: isolate`. Variable `--dev` de 0 à 1 pilote le développement : l'image est masquée par un `radial-gradient(130% 100% at 50% 100%)` dont le rayon suit `--dev` (+28 % de bord doux), filtrée `sepia((1−dev)·.75) contrast(.5+dev·.5) brightness(1.32−dev·.32)` ; un voile ambre `#ead8b9 → #dcc094 → #c9a066` en `::before` s'efface à `1−dev` ; un dégradé de lisibilité en `::after` apparaît à `dev`.
- **Étiquette :** absolue en bas à gauche (.6 rem ; .45 rem mobile), coins 12 px, fond rgba(23,17,13,.68) + blur 10 px, texte night-ink .78 rem ; nom en 600 avec localité en `small` 500 à 80 %, seconde ligne en 500 à 86 % avec icône SVG 1 em (œil pour un compteur de vues, lecture pour un Réel/UGC sans compteur, rien pour une photo). Suit `--dev` en opacité et remonte de 8 px.
- **Contenu :** « Lieu · 4 403 vues » uniquement pour les trois Réels avec compteur réel ; « Photo », « Vidéo UGC », « Réel » sinon.

### Wall head (plaque de titre)
Fond cream 94 % + blur 8 px, coins 24 px (20 px mobile), padding `clamp(1.5rem, 2.6vw, 2.6rem) clamp(1.5rem, 2.8vw, 2.8rem)`, ombre Tag ; contient h1 (marge 1 rem), lede (1.5 rem), puis actions en flex-wrap gap 1 rem 1.4 rem : CTA primaire + lien. Entrée `rise` 1.1 s après .55 s.

### Tag (étiquette d'offre suspendue)
- **Shape :** coins 20 px, fond cream, ombre Tag, padding `clamp(1.6rem, 2.4vw, 2.4rem) clamp(1.4rem, 2.2vw, 2.2rem)`, flex column gap 1.1 rem.
- **Suspension :** `margin-top: calc(var(--hang) + 1.6rem)` ; fil `::before` (1 px, line-strong) depuis le rail ; anneau `::after` 12 px à .85 rem du haut.
- **Structure :** nom (Title + small sous-titre), prix (Price, ou grille `ugc__grid` de trois cellules sand 12 px dont la seconde honey 22 %), pitch muted 30 ch, liste à puces chestnut .4 rem sous filet `line`, note .85 rem, CTA aligné à gauche.
- **Night variant :** fond night, texte night-ink, secondaires night-muted, filet rgba(242,231,214,.14), puces honey, anneau night, CTA honey.
- **Hover :** `translateY(-4px)` en .5 s.
- **Supplements :** `<details>` sous filet haut/bas, summary 600 avec « + » qui tourne de 45° en .35 s, grille auto-fit 15 rem avec lignes pointillées.

### Inputs / Fields (plaque de nuit)
- **Style :** fond rgba(242,231,214,.06), bordure 1 px rgba(242,231,214,.18), coins 12 px, padding .85 rem 1 rem, texte night-ink, placeholder à 45 %. Label au-dessus : Manrope 600 .82 rem night-muted.
- **Focus :** bordure honey, fond à 9 %, sans outline (transition .25 s).
- **Select :** chevron SVG honey en data-URI à droite, `appearance: none`. Textarea min 7 rem, redimensionnable verticalement.
- **Statut :** `role="status"` en honey .9 rem à droite du CTA honey. Formulaire en 2 colonnes (1 sous 900 px), champ message pleine largeur.

### Navigation
- **Style :** fixe, `padding .9rem gutter`, mot-marque « June » Fraunces italique 1.7 rem à gauche, CTA pilule réduit (.7 rem 1.2 rem, .9 rem) à droite, rien d'autre.
- **États :** transparente au sommet ; dès 24 px de scroll, voile `color-mix(canvas 82 %)` + blur 14 px ; se cache (`translateY(-110%)`, .5 s) quand on descend au-delà de 420 px, revient dès qu'on remonte. Sur une section `data-dark` (test à 44 px du haut) : voile night 78 %, marque night-ink, CTA honey.
- **Mobile :** libellé court « Mon projet → ».

### Douleurs (paliers de lecture)
Quatre `.pain__l` Fraunces de taille croissante (2.2 → 3.2 → 4.4 rem max ; la quatrième en italique chestnut avec marge haute) dans une scène collante ; chaque ligne reçoit `--p` (ease-out cubique) qui règle opacité, `translateY(26px → 0)`, `scale(.94 → 1)` et `blur(6px → 0)`. Une barre 1 px en bas (`line`) se remplit en chestnut selon la progression. Palier : hold .22, une fenêtre par ligne.

### Process (brick)
Quatre étapes sous filet `line`, numéro Fraunces 320 chestnut 2.6 rem, titre Title, paragraphe muted 26 ch. Au repos opacité .28 et 10 px plus bas ; `is-on` : opacité 1, filet chestnut qui se déploie (`scaleX` .7 s) ; `is-past` : opacité .72, filet line-strong. Une seule étape est « on » à la fois, calculée sur 75 % de la hauteur d'écran.

### Night plates (sections sombres)
`.dark` : fond night, texte night-ink ; italiques honey, muted → night-muted, liens soulignés à 40 %. L'Alpe porte un halo radial honey 28 % (60 vw, max 900 px) en haut à droite et une triple question dont chaque ligne arrive décalée de 140 ms. Le pied de page vit dans la plaque contact sous un filet rgba(242,231,214,.14), .86 rem night-muted.

### FAQ
`<details>` sous filets `line`, summary Fraunces 400 avec « + » SVG qui tourne de 45°, réponse muted 56 ch.

### Motion grammar
- **Easing unique :** `cubic-bezier(.16, 1, .3, 1)` pour tout ; durées .25 s (soulignés, champs), .32 s (boutons), .35 s (chevrons), .5 s (nav, étiquette hover), .6–.7 s (process), .8 s (Alpe), .9 s (reveals), 1.1 s (plaque de titre), 1.4 s (entrée des colonnes).
- **Entrée du mur :** colonnes `colin` (40 px → 0, 1.4 s, délai `i × 90ms`) ; plaques développées une à une par rAF (départ 350 ms + 130 ms × i, 1.1 s, ease-out cubique), Réels avec compteur en premier ; le scroll ne reprend le développement qu'après la séquence.
- **Parallaxe par colonne :** `translate3d(0, off + sy × sp, 0)`, sy = −min(scrollY, 1.4 vh).
- **Développement au scroll :** `--dev = clamp((.92·vh − top) / (.42·vh))`, jamais rembobiné une fois révélé (sauf plaque encore sous l'écran).
- **Reveals calmes :** `.rv` 18 px → 0 en .9 s, délai `--rd` par pas de 110–140 ms, IntersectionObserver (seuil .12, marge −10 %), une seule fois.
- **Reduced motion :** scroll natif, `--dev: 1` partout, aucune animation de colonne ni de plaque de titre, douleurs en flux statique sans barre, reveals et questions visibles, étapes toutes actives ; la nav garde son voile et son masquage.

## Do's and Don'ts

### Do:
- **Do** poser toute image dans une plaque 9:16 ou 4:5 à coins 18 px, ombre Plate, avec une étiquette lieu + format ; un compteur de vues uniquement s'il a été lu sur une capture réelle.
- **Do** lire `var(--canvas)` pour tout voile qui doit se fondre dans le fond doré ; ne jamais figer `#F4F0E8` sur un élément qui traverse la page.
- **Do** régler Fraunces en 320–400, `opsz 144, SOFT 30`, −0.02 em, avec l'italique chestnut (honey la nuit) pour l'accent.
- **Do** n'offrir qu'un CTA primaire par bloc : pilule espresso/cream sur limestone, honey/night sur plaque de nuit, secondaire en lien souligné.
- **Do** dériver filets, ombres et voiles des alphas de (36,29,23) le jour et (242,231,214) la nuit.
- **Do** piloter la motion par le scroll avec `cubic-bezier(.16,1,.3,1)` et livrer l'état final immédiatement sous `prefers-reduced-motion`.

### Don't:
- **Don't** placer un kicker, un eyebrow ou une étiquette en capitales au-dessus d'un titre.
- **Don't** utiliser Fraunces au-delà de 400, ni Manrope pour un titre.
- **Don't** faire monter une progression en couleur ; la taille monte, la couleur n'arrive qu'à la chute.
- **Don't** employer honey en aplat sur limestone ni chestnut sur night.
- **Don't** poser d'ombre noire, dure ou décalée latéralement ; d'ombre au repos sur un bouton.
- **Don't** inventer un compteur, un témoignage, un logo ou une carte-icône ; le mur est fait de pièces publiées.
