# Agent de l'Atelier

L'agent est Claude, branché sur les services de l'Atelier. Il répond dans un panneau présent sur
chaque écran (et en grand sur `/agent`), voit ce qui est à l'écran, lit les skills de June avant
d'agir, et fait le travail lui-même : chercher, regarder, ranger, taguer, analyser, retoucher,
monter, programmer, améliorer les skills. Les actions sensibles passent par une carte de
confirmation.

Le même module fournit l'analyse IA des médias et les propositions de légendes
(`lib/server/services/ai-tagging.ts`).

## Fichiers

| Fichier | Rôle |
|---|---|
| `lib/server/agent/config.ts` | Modèle, effort, en-têtes bêta, limites (un seul endroit à régler) |
| `lib/server/agent/prompt.ts` | Prompt système (bloc stable + index des skills) |
| `lib/server/agent/loop.ts` | Boucle en flux : appels à Claude, outils en parallèle, persistance, erreurs |
| `lib/server/agent/tools/*.ts` | Outils (un fichier par domaine) et registre (`tools/index.ts`) |
| `lib/server/agent/tool-kit.ts` | `defineTool` : schéma zod → JSON Schema + validation |
| `lib/server/agent/store.ts` | Conversations, messages (append-only), actions à confirmer |
| `lib/server/agent/display.ts` | Conversation affichable reconstruite depuis la base |
| `lib/server/agent/screen.ts` | Bloc `<ecran>` (ce que la personne voit, ids résolus en noms) |
| `lib/server/agent/media.ts` | Aperçus base64 des images (vignettes, affiches) |
| `lib/server/agent/title.ts` | Titre court d'une conversation |
| `app/api/agent/route.ts` | `POST /api/agent` → flux NDJSON |
| `app/api/agent/threads/…` | Liste, lecture, suppression des conversations |
| `app/api/agent/actions/[id]/route.ts` | Confirmer / annuler une action |
| `components/agent/*` | Panneau, page `/agent`, rendu Markdown sûr, cartes, magasin partagé |

## Un message, de bout en bout

```
navigateur ── POST /api/agent { threadId?, message, screen, actionId?, retry? } ──▶ route (nodejs, maxDuration 300)
  1. clé absente → 503 « Branchez l'agent » ; conversation déjà occupée → 409 ; sinon flux NDJSON
  2. nouveau fil : création, titre provisoire (60 caractères), événement { type: "thread" }
  3. message enregistré : [ <ecran>…</ecran> (+ <skills_a_jour> / <action_confirmee>), texte tapé ]
  4. boucle (15 requêtes à Claude au plus) :
       client.beta.messages.stream(…) → { text } au fil des jetons, { tool_start } dès qu'un outil commence
       réponse complète → enregistrée telle quelle (réflexion comprise)
       outils du tour exécutés EN PARALLÈLE → tous les tool_result dans UN message, enregistré
       → { tool_end } par outil, { confirm } par carte, { refresh } pour les vues à recharger
  5. titre généré (petit appel en parallèle) → { thread } ; puis { done }
```

Une ligne `: ping` est envoyée toutes les 15 s sans activité (outil long) ; le lecteur l'ignore.
« Arrêter » coupe le flux : le texte déjà reçu est enregistré (sans réflexion ni outil inachevé),
les outils déjà lancés terminent et leurs résultats sont enregistrés.

## Outils

Noms en anglais (stables), descriptions en français qui disent **quand** appeler l'outil. Chaque
résultat est un JSON compact (`resume` + identifiants, noms, nombres) ; l'interface reçoit à côté
la liste des zones à recharger et les médias à montrer en miniatures.

| Domaine | Outil | Ce qu'il fait | Confirmation |
|---|---|---|---|
| Médiathèque | `search_assets` | Recherche (texte, dossier, type, mots-clés, non tagués, favoris, corbeille) | |
| | `get_assets` | Fiches détaillées (analyse IA comprise) | |
| | `view_images` | Montre jusqu'à 8 images au modèle (blocs image base64 dans le tool_result) | |
| | `list_folders`, `create_folder`, `update_folder` | Arborescence, création (idempotente), renommer / déplacer | |
| | `move_assets`, `tag_assets`, `rename_asset`, `star_assets` | Ranger, mots-clés, renommer, favoris | |
| | `analyze_assets` | Analyse IA (voir plus bas) | |
| | `trash_assets` | Mise à la corbeille | **oui** |
| | `restore_assets` | Restauration | |
| Retouche | `list_looks`, `retouch_photo`, `apply_look`, `create_look` | Looks, export d'une nouvelle version (`exportRetouch`), look en lot photo par photo (`applyLookToAssets` : une retouche repart de son original, progression affichée), nouveau look | |
| Ménage | `cleanup_report` | Groupes de doublons, flous, ratés, avec le média à garder | |
| Montage | `list_montages`, `get_montage`, `create_montage`, `update_montage`, `render_montage`, `montage_status` | Montages dans un style (skill « montage », `reel-immersion` par défaut) | |
| Programmation | `list_social_accounts`, `list_posts`, `create_draft_post` | Comptes, calendrier, brouillon (rien n'est envoyé) | |
| | `schedule_post` | Programmer via Zernio (date ISO ou `next-slot`) | **oui** |
| | `cancel_post` | Annuler une publication programmée | **oui** |
| Pilotage | `get_overview` | Médias, mots-clés, prochaines publications, montages, skills | |
| Skills | `list_skills`, `read_skill` | Index filtré, lecture complète (consignes, data, annexes, références) | |
| | `update_skill` | Améliorer un skill (nouvelle version, réversible dans Skills) | non (versionné) |
| | `create_skill` | Nouveau skill | |

Un module pas encore livré (ses services lèvent « non implémenté ») renvoie une erreur d'outil
lisible (`is_error`) : l'agent continue et le dit simplement. Aucune suppression définitive n'est
exposée à l'agent.

Les schémas d'entrée sont stricts côté Atelier (zod : types, bornes, `additionalProperties:
false`, uuid) mais **sans `strict: true`** côté API : la limite est de 20 outils stricts par
requête et l'agent en a 34. Une entrée invalide revient au modèle en `is_error` avec le détail,
et il corrige.

### Ajouter un outil

1. Dans le bon fichier de `lib/server/agent/tools/`, écrire :
   ```ts
   export const monOutil = defineTool({
     name: "mon_outil",                       // snake_case, stable
     label: "Ce qui s'affiche pendant l'exécution",
     description: "Ce qu'il fait. À appeler quand… (dire QUAND l'utiliser).",
     input: z.object({ ids: Ids(50), … }),    // .describe() sur chaque champ utile
     run: async (input, ctx) => ({
       summary: "12 photos taguées",           // puce dans la conversation
       data: { … },                            // JSON compact pour le modèle
       refresh: ["assets"],                    // vues à recharger
       assetIds: [...],                        // miniatures
     }),
   });
   ```
   Pour une action sensible, remplacer `run` par `confirm: { prepare, execute }` : `prepare`
   vérifie tout et renvoie un résumé explicite (« Programmer sur Instagram (@june) le lun. 3 nov.
   à 18:00 ») et l'entrée normalisée à exécuter ; `execute` l'exécute après confirmation.
2. L'ajouter au tableau exporté du fichier (registre trié par nom dans `tools/index.ts`).
3. L'appeler uniquement via les services (`lib/server/repo`, `lib/server/services`), jamais par HTTP.
4. Ajouter une ligne au tableau ci-dessus, et une consigne dans `STABLE_SYSTEM` seulement si
   l'outil change une règle de conduite (le reste est dans la description de l'outil).

Changer la liste des outils ou leurs descriptions invalide le cache des conversations en cours
(une fois) ; les fils existants continuent de fonctionner.

## Confirmation des actions sensibles

- `trash_assets`, `schedule_post`, `cancel_post` ne s'exécutent pas : `prepare` vérifie les
  identifiants, comptes et dates, puis enregistre `atelier.pending_actions` (outil, entrée
  normalisée, résumé, statut `pending`). Le modèle reçoit « en attente de confirmation : ne
  relance pas l'outil » ; le flux envoie `{ type: "confirm", action }`.
- L'interface montre une carte (Confirmer / Annuler). `POST /api/agent/actions/:id
  { decision: "confirm" | "cancel" }` réserve l'action (un seul clic gagne), l'exécute côté serveur
  avec l'entrée enregistrée, stocke résultat et statut (`executed`, `failed`, `cancelled`), écrit
  au journal et renvoie `{ action, refresh }`.
- L'interface envoie ensuite automatiquement « J'ai confirmé : … » (ou « J'ai annulé : … ») avec
  `actionId` : le serveur joint le résultat réel depuis la base (`<action_confirmee>`), l'agent
  enchaîne sans refaire l'action. Si l'agent répond encore, le message part à la fin de sa réponse.
- Une action en attente depuis plus de 24 h expire (410, affichée « Expiré »).

## Skills dans le prompt

Le savoir-faire n'est pas écrit dans le code : le prompt système dit seulement de **lire** les
skills utiles avant d'agir (voix-june avant un texte, style de montage avant un montage,
tri-shooting avant un tri, programmation avant de programmer, retouche-june avant une retouche,
content-board pour une livraison) et de les suivre.

- Le système a deux blocs : le bloc **stable** (rôle, règles, style ; aucune date ni nom) avec le
  point de cache, puis l'**index des skills** (`skillsIndex()`, une ligne par skill actif).
- Les deux sont **figés à la création du fil** (`meta.system` du premier message) et rejoués à
  l'identique. Si l'index change pendant la conversation (Ludivine modifie un skill), le message
  suivant commence par `<skills_a_jour>` avec le nouvel index : le système n'est jamais réécrit
  (ce qui casserait le cache et la réflexion déjà produite).
- Améliorer un skill depuis la conversation : l'agent le lit, annonce le changement, appelle
  `update_skill` avec une note ; la réponse dit « version N, réversible dans Skills ».
- L'analyse IA et les légendes relisent `voix-june`, `marque-june` et `tri-shooting` **à chaque
  appel** : une amélioration faite dans l'Atelier change aussitôt le résultat.

## Modèle, effort, repli

| Réglage | Valeur | Où |
|---|---|---|
| Modèle | `ATELIER_MODEL`, par défaut `claude-opus-5-5` | `lib/server/ai/client.ts` |
| SDK | `@anthropic-ai/sdk` **0.133.0** (types vérifiés sur cette version) | `package.json` |
| Réflexion | toujours active sur Opus 5.5 : `thinking: { type: "adaptive", display: "omitted", block_binding: { prefix_mismatch_behavior: "drop_block" } }` ; jamais `disabled` ni `budget_tokens` (400) | `loop.ts` |
| Effort | agent `medium` (constant : le changer invalide le cache) ; analyse, légendes, titres `low` | `config.ts` |
| `tool_choice` | non envoyé (`auto`) : `any` / `tool` renvoient 400 sur Opus 5.5 | |
| Repli sur refus | `fallbacks: "default"` + en-tête bêta `server-side-fallback-2026-07-01` sur **tous** les appels (agent, analyse, légendes, titres) | `config.ts` |
| En-têtes bêta de l'agent | `server-side-fallback-2026-07-01`, `thinking-binding-controls-2026-08-01`, `context-management-2025-06-27` | `config.ts` |
| Nettoyage de contexte | `clear_tool_uses_20250919` au-delà de 120 000 jetons d'entrée (garde les 6 derniers outils) | `loop.ts` |
| `max_tokens` | 32 000 (la réflexion compte dedans) ; 15 requêtes au plus par message | `config.ts` |
| Reprises | le client partagé réessaie seul 3 fois (connexion, 429, 5xx) | `ai/client.ts` |

Le repli serveur : si Opus 5.5 décline pour une raison de politique, l'API relance la même
requête sur le modèle de repli recommandé, dans le même flux. Après un relais en cours de
réponse, ce qui précède le dernier bloc `fallback` (réflexion, outils) n'est ni exécuté ni
renvoyé (`sanitizeFallbackTurn`). Si toute la chaîne refuse (`stop_reason: "refusal"`), le tour
n'est pas conservé et l'interface affiche « Claude a décliné cette demande… ».

Erreurs (messages français, `lib/server/agent/errors.ts`) : 429 « Trop de demandes… », 5xx et
`overloaded_error` « Claude est surchargé… », 401/403/404 (clé, accès, modèle), 400 avec le
détail, coupure `max_tokens` sur un outil (tour non exécuté, non conservé), entrée d'outil
illisible (tour relancé 2 fois au plus). L'interface propose « Réessayer » (`retry: true` : la
réponse est relancée depuis la base, sans dupliquer le message).

## Cache des prompts

- Ordre de rendu : outils → système → messages. Outils triés par nom, définitions sans rien de
  variable ; point de cache explicite **1 h** sur le bloc stable du système (couvre outils +
  consignes, ≈ 9 000 jetons) ; `cache_control` automatique (5 min) en haut de la requête pour la
  queue de la conversation.
- Rien de variable dans le système : date, personne, page, sélection vont dans le bloc `<ecran>`
  du message.
- Historique **append-only**, rejoué octet pour octet : `atelier.messages.content` contient
  `{ "wire": "<JSON exact des blocs>" }` (un jsonb nu réordonnerait les clés de
  `tool_use.input` et ferait rater le cache à chaque rechargement). `meta` (jsonb) porte
  l'affichage et le suivi (puces, modèle, usage, id de requête), jamais rejoué.
- Les images sont envoyées en base64 dans le `tool_result` de `view_images` (jamais d'URL signée
  qui expirerait dans l'historique), à partir des vignettes ≈ 640 px.

## Persistance

- `atelier.threads` : titre, auteur, dates. Liste : les miennes d'abord, puis par activité.
- `atelier.messages` : `seq` croissant, rôle, `content.wire`, `meta.kind` = `user` |
  `tool_results` | `assistant`. Tours refusés et réponses coupées sur un outil : non conservés.
  Un tour d'outils resté sans résultats (coupure serveur) reçoit des résultats « Interrompu »
  avant la suite.
- `atelier.pending_actions` : actions à confirmer (voir plus haut).
- `GET /api/agent/threads/:id` renvoie des `AgentDisplayMessage` (texte de l'agent, puces
  d'outils appariées tool_use / tool_result, cartes avec leur état à jour, `parts` pour l'ordre
  texte / outils, `note` pour les messages de suivi). La réflexion n'est pas affichée.

## Analyse IA et légendes

- `analyzeAssets(ids, actor, { force })` : ignore l'audio, la corbeille et les médias déjà
  analysés (sauf `force`) ; lit la vignette (ou l'affiche d'une vidéo, ou l'original redimensionné)
  depuis le stockage ; lots de **8 images par requête**, sortie structurée
  (`output_config.format`, schéma généré par `betaZodOutputFormat` du SDK), effort `low` ; le
  premier lot écrit le cache du prompt, les suivants partent 3 par 3. Lecture tolérante (casse,
  univers hors liste, score borné 0–100, mots-clés normalisés) ; écrit `ai` (avec `model` réel et
  `analyzedAt`), fusionne les mots-clés, une ligne de journal par lot. Renvoie `analyzed`,
  `skipped`, `errors`.
- `suggestCaptions({ assetIds, brief, platform })` : regarde 4 images au plus, applique la voix
  June (skills actuels), renvoie 3 légendes différentes.

## Coûts (Claude Opus 5.5 : 4 $ / 20 $ par million de jetons ; lecture de cache 0,20 $)

- Message à l'agent : préfixe outils + consignes ≈ 9 000 jetons, écrit une fois par heure
  (≈ 0,07 $) puis relu (≈ 0,002 $ par requête) ; une réponse avec deux ou trois outils coûte
  généralement 0,02 à 0,08 $ (sortie et réflexion comprises). Une image regardée ≈ 400 jetons
  (≈ 0,002 $ la première fois).
- Analyse IA : ≈ 0,06 à 0,08 $ par lot de 8 photos, soit **environ 1 centime par photo**
  (≈ 8 à 10 $ pour 1 000 photos). Pour un très gros arriéré, l'API Message Batches coûte moitié
  moins (sans repli serveur, résultats sous 24 h) : non branchée pour l'instant.
- Titre de conversation : un très petit appel (effort `low`) seulement si le premier message
  dépasse 48 caractères.
- Contrôle : `meta.usage` de chaque réponse est enregistré (`cache_read_input_tokens` doit
  grandir au fil d'une conversation).

## Tester sans clé

En local, sans `ANTHROPIC_API_KEY`, tous les points d'entrée IA renvoient 503 et l'interface
affiche « Branchez l'agent dans Réglages ». Pour tester le parcours complet sans clé, on peut
pointer le SDK vers un faux serveur compatible : `ANTHROPIC_API_KEY=test
ANTHROPIC_BASE_URL=http://127.0.0.1:<port>` (le SDK lit `ANTHROPIC_BASE_URL`). Le faux serveur
doit répondre à `POST /v1/messages?beta=true` en SSE (`message_start`, `content_block_*`,
`message_delta`, `message_stop`) pour les requêtes en flux, et en JSON pour les autres.

## Limites connues

- Un seul tour à la fois par conversation et par instance serveur (verrou en mémoire) : deux
  personnes qui écrivent dans le même fil au même instant sur deux instances Vercel différentes ne
  sont pas sérialisées.
- `display: "omitted"` : les notes que le modèle écrit entre deux outils ne sont pas montrées ; le
  prompt lui demande une phrase avant le premier outil et un bilan à la fin.
- Vercel coupe une fonction à 300 s (Hobby) : un très long tour s'arrête ; tout ce qui a été fait
  est enregistré et « Réessayer » reprend depuis la base.
