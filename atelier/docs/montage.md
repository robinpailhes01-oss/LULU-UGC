# Montage (HyperFrames)

Le module Montage enchaîne photos et vidéos de la médiathèque en Reels, dans un **style** de
June, avec [HyperFrames](https://github.com/heygen-com/hyperframes) : une composition HTML
(GSAP) prévisualisée dans le navigateur par `<hyperframes-player>` et rendue en MP4 par la CLI
HyperFrames (Chrome headless + FFmpeg). La vidéo rendue devient un média de la médiathèque
(source « montage »), prête à être programmée.

| Écran | Rôle |
|---|---|
| `/montage` | liste, « Nouveau montage » (titre, style, format, médias) ; lien profond `?nouveau=1&assets=id1,id2&style=<slug>` |
| `/montage/[id]` | éditeur : médias et textes, aperçu, timeline, inspecteur, onglet Code, rendu |

## Données

Un montage (`atelier.montages`) = un titre + une `MontageSpec` (`lib/shared/types.ts`) : format,
cadence, plans (`clips` : média, entrée/sortie, mouvement, son), textes (`texts` : début/fin sur la
timeline, style hook/title/caption/label, position), transition, look, musique, carte de fin et
**`style`** (slug d'un skill « montage »). Le HTML enregistré (`html`) est regénéré à chaque
modification, sauf si le code a été personnalisé (`customHtml = true`). L'état du rendu en cours
vit dans `render` (fournisseur, travail, progression, message, erreur, horodatage).

Dans le HTML enregistré, les médias sont désignés par des références stables
`atelier-media://<assetId>/<original|thumb|poster>` ; elles sont résolues à la demande :

| Usage | Résolution |
|---|---|
| Aperçu (`GET /api/montages/[id]/composition`) | liens signés absolus (6 h) sur l'origine de la requête — le lecteur est un iframe opaque, sans cookies |
| Vérification (lint) | chemins relatifs `media/<id>-<variante>.<ext>`, comme dans le dossier de rendu |
| Rendu local | fichiers copiés dans `ATELIER_DATA_DIR/renders/<montage>/<travail>/media/` |
| Rendu Sandbox / HeyGen | liens HTTPS signés 48 h (stockage S3/R2 obligatoire) |

## Styles de montage

Un style est un skill de type `montage` (`skills/<slug>/SKILL.md` + `data.json`), modifiable dans
l'écran Skills. Le constructeur de composition (`lib/server/montage/compose.ts`) est un moteur
générique : **rien d'un style n'est écrit dans le code**, seules des valeurs de repli neutres
(`FALLBACK_STYLE` dans `lib/client/montage/style.ts`) servent quand aucun style n'est choisi ou
qu'un champ manque. Les champs explicites de la spécification priment toujours sur le style.

Champs de `data.json` (`MontageStyleData`, tous facultatifs) :

| Champ | Effet |
|---|---|
| `format`, `fps` | format et cadence d'un nouveau montage |
| `targetDurationS` `{min,max}` | durée visée (affichée dans l'éditeur) |
| `photoDurationS` | durée d'une photo |
| `videoClipS` `{min,max}` | longueur d'un plan vidéo (un nouveau plan prend `max`, borné par la vidéo) |
| `pacing` | `lent` / `moyen` / `rapide` : durées et amplitude de mouvement si non précisées |
| `transition` `{type,durationS}` | `cut`, `fade`, `slide`, `zoom` |
| `look` | nom d'un look de retouche (services/looks `findLookByName`), appliqué à tous les plans |
| `fonts` `{display,text}` | familles Google Fonts (accroches/titres, puis textes) |
| `colors` `{text,accent,plate,background}` | texte, accent (`*mot*` en italique), plaque/ombre, fond de la carte de fin |
| `textAnimation` | `rise`, `fade`, `words` (mot à mot), `typewriter`, `none` |
| `textPlacement` | position par défaut des nouveaux textes |
| `captions` | `true` : sous-titres sur plaque ; `false` : texte ombré |
| `music` `{mood,volume,fadeOutS}` | ambiance cherchée, volume et fondu de fin |
| `endCard` `{title,subtitle,durationS}` ou `null` | carte de fin par défaut |
| `structure` `[{role,durationS,shot,text}]` | déroulé type : guide affiché dans l'éditeur, plans associés à chaque rôle selon leur position |

Champs supplémentaires reconnus (facultatifs, hors `MontageStyleData`) : `clipVolume` (0–2 : son
des plans vidéo par défaut, 0 = muets), `photoMotion` (`auto` ou un mouvement), `motionAmount`
(0–0,3 : amplitude du Ken Burns), `textScale` (0,5–2), `signature` (petite signature de la carte
de fin, `null` pour aucune). Un champ invalide est ignoré et signalé dans la vérification.

Changer de style dans l'éditeur réapplique ses valeurs (format, cadence, transition, durées des
plans, look, volume de la musique, carte de fin) en gardant plans, textes et musique.

### Mode avancé : modèle `template.html`

Un style peut fournir un fichier annexe `template.html` : une composition HyperFrames complète
dans laquelle Atelier injecte les éléments générés (`lib/server/montage/template.ts`).

Emplacements (commentaires HTML) :

| Emplacement | Contenu injecté |
|---|---|
| `<!-- ATELIER:HEAD -->` | polices + feuille de style de base (sinon avant `</head>`) ; GSAP si le modèle ne le charge pas |
| `<!-- ATELIER:CLIPS -->` | **obligatoire**, dans la racine : filtre du look + plans `.shot > .move > .media` |
| `<!-- ATELIER:OVERLAYS -->` | vignettage du look |
| `<!-- ATELIER:TEXTS -->` | textes à l'écran |
| `<!-- ATELIER:ENDCARD -->` | carte de fin |
| `<!-- ATELIER:AUDIO -->` | musique |
| `<!-- ATELIER:SCRIPT -->` | la timeline GSAP (sinon avant `</body>`) |

Les emplacements facultatifs absents sont regroupés juste après les plans. Jetons remplacés
partout : `{{ATELIER_ID}}`, `{{ATELIER_WIDTH}}`, `{{ATELIER_HEIGHT}}`, `{{ATELIER_DURATION}}`,
`{{ATELIER_FPS}}`, `{{ATELIER_FORMAT}}`, `{{ATELIER_TITLE}}`. La feuille de style expose les
variables `--atelier-text`, `--atelier-accent`, `--atelier-plate`, `--atelier-background`,
`--atelier-end-ink`, `--atelier-font-display`, `--atelier-font-text`, `--atelier-width`,
`--atelier-height`, `--atelier-safe-top|bottom|x` et `--atelier-look`.

Pour ajouter ses propres animations à la timeline unique, le modèle définit, dans un script placé
avant `ATELIER:SCRIPT` :

```html
<script>
  window.atelierTemplate = function (tl, montage) {
    // montage = { width, height, durationS, fps, format, clips: [{ id, shot, move, startS, durationS, kind }],
    //             texts: [{ id, style, position, startS, durationS }], endCard, colors, fonts }
    tl.fromTo("#cadre", { opacity: 0 }, { opacity: 1, duration: 0.6 }, 0);
  };
</script>
```

Squelette minimal :

```html
<!doctype html>
<html lang="fr">
<head><meta charset="UTF-8"><!-- ATELIER:HEAD --><style>#cadre{position:absolute;inset:40px;border:2px solid var(--atelier-accent);z-index:50}</style></head>
<body>
<div id="root" data-composition-id="{{ATELIER_ID}}" data-start="0" data-duration="{{ATELIER_DURATION}}"
     data-fps="{{ATELIER_FPS}}" data-width="{{ATELIER_WIDTH}}" data-height="{{ATELIER_HEIGHT}}">
  <!-- ATELIER:CLIPS -->
  <div id="cadre"></div>
  <!-- ATELIER:TEXTS -->
</div>
<!-- ATELIER:SCRIPT -->
</body>
</html>
```

Un modèle invalide (emplacement CLIPS ou racine absents) est ignoré : la composition générique
est utilisée et une remarque apparaît dans la vérification.

## Composition générée

- Racine `#root[data-composition-id="atelier-montage"]`, taille selon le format (9:16 → 1080×1920,
  4:5 → 1080×1350, 1:1 → 1080×1080, 16:9 → 1920×1080), durée = somme des plans − chevauchements
  des transitions + carte de fin. Une seule timeline GSAP en pause, `window.__timelines`.
- Plans : `<video>` `muted` par défaut, ou `data-has-audio="true"` + `data-volume` quand le plan
  garde son son ; photos en `<img>`. Transitions et Ken Burns animent les enveloppes
  `.shot` / `.move`, jamais l'élément minuté.
- Look : filtre SVG `lookToSvgFilter` (`color-interpolation-filters="sRGB"`) sur chaque `.shot`,
  vignettage en calque radial. Le grain n'est pas reproduit en vidéo.
- Textes dans les zones sûres des Reels (9:16 : ni dans les 220 px du haut ni dans les 380 px du
  bas), `*mot*` = accent italique. Musique : `<audio>` avec `data-volume`, fondus d'entrée/sortie.
- Déterministe (ni `Math.random` ni `Date`) ; vérifiée par `@hyperframes/lint` à chaque
  enregistrement, plus les remarques d'Atelier (média introuvable, style invalide…). Le rendu est
  bloqué tant qu'il reste une erreur.

## Rendu

`HYPERFRAMES_RENDER` choisit le moteur :

| Valeur | Fonctionnement |
|---|---|
| `local` | `npx --yes hyperframes@0.8.150 render` lancé en arrière-plan par le serveur Node (développement, poste dédié). Progression lue sur la sortie (`@hf-progress`). Variables utiles : `HYPERFRAMES_FFMPEG_PATH`, `HYPERFRAMES_FFPROBE_PATH`, `PRODUCER_HEADLESS_SHELL_PATH` (Chrome headless déjà installé), `ATELIER_RENDER_WORKERS`. Impossible dans une fonction Vercel. |
| `sandbox` | Vercel Sandbox (recommandé en ligne). Une fois : `POST /api/montages/render-setup` crée un instantané (Chrome, FFmpeg, CLI HyperFrames), gardé dans `atelier.settings` (`hyperframes_sandbox_snapshot`). Chaque rendu démarre une sandbox depuis l'instantané, lance le rendu détaché, puis `GET /api/montages/[id]/render` interroge la sandbox et récupère la vidéo. Hors Vercel : `VERCEL_TOKEN`, `VERCEL_TEAM_ID`, `VERCEL_PROJECT_ID`. Stockage S3/R2 requis. |
| `heygen` | HeyGen HyperFrames Cloud Render (API REST v3) : projet zippé envoyé, rendu, interrogation, téléchargement. `HEYGEN_API_KEY` ; pas de format 4:5. Stockage S3/R2 requis. |
| `none` | pas de rendu : message expliquant les options. |

En fin de rendu, le MP4 est ajouté à la médiathèque (dossier du premier plan), avec affiche et
vignette extraites par FFmpeg, et le montage passe à « Vidéo prête ».

## API

| Route | |
|---|---|
| `GET/POST /api/montages` | liste (avec affiche et nom du style) / création `{ title, spec?, assetIds? }` |
| `GET/PATCH/DELETE /api/montages/[id]` | détail (spec, HTML à jour, médias, déroulé, guide du style) / `{ title?, spec?, html? }` (`html: null` = revenir à la version générée) / suppression |
| `POST /api/montages/[id]/style` | appliquer un style `{ style }` |
| `POST /api/montages/[id]/duplicate` | copie sans le rendu |
| `GET/POST /api/montages/[id]/composition` | HTML d'aperçu (POST : aperçu d'une modification non enregistrée) |
| `GET/POST /api/montages/[id]/lint` | vérification de la composition enregistrée ou proposée |
| `POST/GET/DELETE /api/montages/[id]/render` | lancer / état à jour / annuler |
| `GET/POST /api/montages/render-setup` | état / préparation de l'instantané Sandbox |
