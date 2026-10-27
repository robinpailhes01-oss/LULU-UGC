---
name: Programmer les publications
description: >
  Règles pour programmer les publications sur les comptes de June via Zernio : rythme, horaires,
  formats, légendes et premier commentaire. À suivre avant toute programmation.
kind: workflow
---

# Programmer

## Comptes
On programme uniquement sur les comptes connectés à l'Atelier (comptes de June). Jamais sur le
compte d'un client sans demande explicite et écrite.

## Rythme et horaires (point de départ, à ajuster avec les statistiques)
- 2 à 3 publications par semaine, plus des stories au fil de l'eau.
- Horaires conseillés : en semaine 12 h 15 ou 18 h 30 ; le week-end 10 h 00 (heure de Paris).
- Ne pas programmer deux Reels le même jour.

## Formats
- Une vidéo seule → Reel (9:16, 3 s à 90 s ; idéal 8 à 25 s), avec une couverture choisie.
- Plusieurs photos → carrousel (4:5).
- Story : un seul média, pas de légende.

## Avant de programmer
1. Relire la légende avec le skill « Voix et légendes June ».
2. Vérifier le format et la qualité des médias (retouchés, bon ratio).
3. Hashtags : 3 à 6, dans la légende (ou en premier commentaire si demandé).
4. Toujours demander confirmation avant de programmer (action visible du public).

## Réglages lus par l'écran Programmation (data.json)
- `slots` : horaires proposés dans le compositeur (semaine / week-end) ; `defaultTime` : heure
  pré-remplie quand on clique sur un jour du calendrier.
- `minLeadMinutes` : délai minimal avant publication (une date plus proche est repoussée).
- `maxReelsPerDay`, `hashtags`, `captionWarnAt` : alertes affichées avant de programmer (elles
  n'empêchent pas de programmer).
- `postsPerWeek` : rythme visé, rappelé dans le calendrier.
