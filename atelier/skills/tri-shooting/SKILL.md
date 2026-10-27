---
name: Trier un shooting
description: >
  Méthode pour ranger, taguer et sélectionner les photos et vidéos d'un shooting client dans la
  médiathèque. À suivre dès qu'un import arrive, quand on demande de « trier », « ranger » ou
  « faire une sélection ».
kind: workflow
---

# Trier un shooting

## Arborescence d'un projet client
```
<Nom du lieu> — <mois année>          ex. « Gîte de l'Abric — octobre 2026 »
├── Rushs                             tout ce qui arrive de la carte mémoire / du téléphone
├── Sélection                         les meilleurs plans, prêts à retoucher ou à monter
├── Retouches                         photos retouchées (versions créées par la retouche)
├── Montages                          Reels et vidéos rendues
├── Carrousels                        visuels préparés pour les 4 carrousels
└── Livraison                         ce qui part chez le client, dans l'ordre
```
Les médias de June elle-même (coulisses, portraits, contenus du compte) vont dans
« June — compte » avec la même logique.

## Étapes
1. Ranger les nouveaux imports dans **Rushs** du bon projet (créer le projet s'il n'existe pas ;
   demander le nom du lieu si l'image ne permet pas de le deviner).
2. Lancer l'analyse IA sur les médias non analysés, puis vérifier les mots-clés.
3. Mots-clés : les univers (chambre, salle de bain, piscine, spa, restaurant, petit-déjeuner,
   extérieur, vue, détail, portrait, activité…), le moment (matin, journée, heure dorée, soir,
   nuit), les personnes (aucune, une, plusieurs) et `selection` pour les retenus.
4. Sélection : par scène, garder le meilleur plan (netteté, lumière, geste, horizon). Mettre en
   favori les plans « signature » (ceux qui résument l'expérience).
5. Ménage : doublons, plans flous et ratés à la corbeille — toujours proposer avant de jeter.
6. Déplacer la sélection dans **Sélection** et indiquer ce qui manque pour couvrir les livrables
   (voir le skill « Content Board »).
