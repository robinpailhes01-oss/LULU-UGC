---
name: atelier-skills
description: >
  Comment configurer l'Atelier de June depuis ce dépôt : écrire ou modifier les skills de l'agent
  (styles de montage, références, voix des légendes, méthodes de tri, règles de programmation,
  retouche). À utiliser dès que Robin donne des références, un style de montage, une consigne de
  marque ou une méthode de travail à transmettre à l'Atelier, ou demande de récupérer les
  améliorations faites par Ludivine dans son Atelier.
---

# Configurer l'Atelier depuis ici

L'Atelier (`atelier/`) embarque des **skills** : le savoir-faire écrit que son agent Claude lit
avant d'agir. Ils sont écrits ici, dans `atelier/skills/<slug>/`, importés automatiquement dans
l'Atelier au déploiement, puis Ludivine peut les modifier et les améliorer dans l'écran
« Skills » (historique des versions, retour arrière).

## Format
```
atelier/skills/<slug>/        slug : minuscules, chiffres, tirets (ex. reel-immersion)
  SKILL.md                    en-tête + consignes en Markdown (français)
  data.json                   paramètres structurés (obligatoire pour un style de montage)
  *.md / *.html / *.css       annexes facultatives (références détaillées, gabarit HyperFrames…)
```
En-tête de `SKILL.md` (YAML simple, rien d'autre) :
```
---
name: Nom lisible
description: >
  Quand utiliser ce skill — c'est ce que l'agent lit pour choisir. Une à trois phrases.
kind: montage | voice | brand | workflow | references | retouch | other
---
```
Paramètres d'un style de montage (`data.json`) : voir `MontageStyleData` dans
`atelier/lib/shared/types.ts` (format, durées, transition, rythme, look, polices, couleurs,
animation du texte, placement, sous-titres, musique, carton final, `structure` plan par plan).
Les montages créés avec ce style en prennent les valeurs par défaut.

## Quand Robin donne des références ou un style
1. Identifier le skill concerné (ou en créer un nouveau dossier).
2. Écrire ce qu'il faut **retenir** de chaque référence (rythme en plans/seconde, transitions,
   typographie, place du texte, musique, couleur) et ce qu'il ne faut **pas copier**. Ajouter les
   liens dans `references/SKILL.md` ou un `references.md` dans le dossier du style.
3. Traduire en paramètres concrets dans `data.json` quand c'est un style de montage.
4. `cd atelier && npm run skills:bundle` (vérifie le format et régénère
   `lib/server/skills/bundled.generated.ts`), puis committer les deux.

## Récupérer les améliorations faites dans l'Atelier
`cd atelier && ATELIER_URL=https://… ATELIER_PASSWORD=… npm run skills:pull` écrit les versions en
ligne dans `atelier/skills/`. Relire `git diff`, garder ce qui est bon, committer. Au déploiement
suivant, l'Atelier reconnaît le contenu identique et ne signale plus de différence.

## Règles
- Écrire en français, dans la voix June (voir `atelier/skills/voix-june/`).
- Ne jamais inventer de client, de chiffre ou de réalisation.
- Un skill = un sujet. Description précise : c'est elle qui déclenche son utilisation.
