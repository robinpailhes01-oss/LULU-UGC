# Programmation — intégration Zernio (note de développement)

Ce que fait le module Programmation, et comment il parle à Zernio (ex-« Late »). Source : schéma
OpenAPI Zernio 1.373.0 et documentation `docs.zernio.com` (octobre 2026). Le compte Zernio est celui
de June ; tant qu'il n'est pas branché, tout fonctionne en brouillons.

## Configuration

| Variable | Rôle |
|---|---|
| `ZERNIO_API_KEY` | Clé `sk_…` (zernio.com/dashboard/api-keys). Sans elle : brouillons seulement, aucune requête vers Zernio. |
| `ZERNIO_API_URL` | Par défaut `https://zernio.com/api` (les chemins sont `/v1/…`). Sert aussi à pointer vers un faux serveur de test. |
| `ZERNIO_WEBHOOK_SECRET` | Secret choisi par nous et donné à Zernio à la création du webhook (Zernio n'en génère pas). Obligatoire en production. |
| `ATELIER_TIMEZONE` | `Europe/Paris` par défaut ; envoyé avec chaque publication. |

Webhook à créer côté Zernio (une fois) : `POST /v1/webhooks/settings` avec
`url = <ATELIER_APP_URL>/api/webhooks/zernio`, `secret = ZERNIO_WEBHOOK_SECRET`, événements
`post.scheduled, post.published, post.partial, post.failed, post.cancelled, post.platform.published,
post.platform.failed, post.tiktok.url_resolved`.

## Fichiers

| Fichier | Rôle |
|---|---|
| `lib/server/zernio/client.ts` | Client fetch typé : comptes, profils, créateur TikTok, presign + PUT des médias, publications (create/get/list/update/delete/retry), file (`next-slot`), validation. Vérification HMAC des webhooks. |
| `lib/server/zernio/types.ts` | Types des requêtes et réponses Zernio utilisées. |
| `lib/server/zernio/media.ts` | Recopie des médias chez Zernio, cache des URLs. |
| `lib/server/zernio/rules.ts` | Règles des plateformes (module pur, partagé avec le compositeur) + lecture du skill. |
| `lib/server/zernio/webhooks.ts` | Dédoublonnage des événements (table `atelier.zernio_events`, migration `003_posts_events`). |
| `lib/server/services/posts.ts` | Contrat du service (miroir local `atelier.posts`, envoi, synchro, webhooks). |
| `app/api/social/*`, `app/api/posts/*`, `app/api/webhooks/zernio` | Routes. |
| `components/schedule/*` | Écran `/programmation` (mois, semaine, liste, brouillons, compositeur). |
| `skills/programmation/data.json` | Horaires conseillés, heure par défaut, délai minimal, hashtags, Reels par jour, rythme. |

## Client HTTP

- `Authorization: Bearer <clé>` ; la clé n'est jamais journalisée ni renvoyée au navigateur.
- 429 et 503 : attente de `Retry-After` (20 s au plus) puis nouvel essai, 2 fois au maximum.
  `POST /v1/posts` porte toujours un `Idempotency-Key` (UUID gardé dans `posts.result.idempotencyKey`
  avant l'appel) : un réessai renvoie la même publication (200), jamais un doublon.
- Erreurs → `ZernioError` (une `HttpError`) au message français suivi du message de Zernio :
  401 → « clé refusée » (502), 403 `ACCOUNT_DISCONNECTED` → compte à reconnecter, 409 → doublon de
  contenu sur 24 h / créneau pris / requête en cours, 429 → « réessayez dans N s », 5xx → 502.
- **207** est un succès HTTP qui signale une publication immédiate incomplète : renvoyé à part
  (`kind: "incomplete"`). Avec `post.status === "scheduled"` ce n'est pas un échec (Zernio réessaie
  seul) ; `partial` / `failed` sont enregistrés comme tels.

## Médias

Zernio va chercher les médias au moment de publier ; nos URLs signées expirent. On recopie donc
chaque média chez Zernio à la programmation :

1. `POST /v1/media/presign {filename, contentType, size}` → `{uploadUrl, publicUrl}` ;
2. `PUT uploadUrl` (sans Authorization) avec `Content-Type` et `Content-Length` : flux depuis une URL
   signée de notre stockage en S3/R2, tampon `getBuffer` en local ;
3. `publicUrl` dans `mediaItems`. Zernio la rend permanente dès qu'une publication la référence.

Types acceptés : JPEG, PNG, WebP, GIF, MP4, MPEG, MOV, AVI, WebM, M4V. HEIC est refusé avec un
message qui propose d'exporter une copie JPEG depuis Retouche. Pour un Reel Instagram, l'affiche de
la vidéo est aussi recopiée (convertie en JPEG si besoin) et passée en `instagramThumbnail`, sauf si
une seconde de couverture (`coverTimeS` → `thumbOffset`) est choisie.

Cache : `posts.result.media[assetId] = {url, posterUrl, assetUpdatedAt}` ; réutilisé à chaque
mise à jour, oublié si le média est modifié ou si la publication est retirée de Zernio (Zernio
efface alors les fichiers qu'aucune autre publication n'utilise).

## Publications

`atelier.posts` est le miroir local. Statuts : `draft` (local), `scheduled`, `publishing`,
`published`, `failed`, `cancelled`. Zernio `pending_approval` → `scheduled` ; `partial` →
`published` avec `error` « Publié en partie… » (l'interface affiche « Publié en partie »).

| Action | Zernio |
|---|---|
| Brouillon (`scheduledFor: null`) | Rien : local uniquement. |
| Programmer (date ISO) | Recopie des médias, `POST /v1/posts` avec `content` (hashtags compris : le champ `hashtags` de Zernio n'est pas ajouté à la légende), `mediaItems`, `platforms[]`, `scheduledFor` (instant UTC, repoussé à maintenant + `minLeadMinutes` : une date passée publierait immédiatement dans la requête), `timezone`, `metadata.atelierPostId`. |
| Prochain créneau (`"next-slot"`) | `GET /v1/queue/next-slot?profileId` (aperçu, et erreur claire s'il n'y a pas de file), puis `POST /v1/posts` avec `queuedFromProfile` : Zernio réserve le créneau (ne jamais recopier `nextSlot` dans `scheduledFor`). |
| Modifier une publication programmée | `PUT /v1/posts/{id}` avec le corps complet + `isDraft: false` (404 → recréée). Les champs locaux ne changent qu'après la réponse de Zernio. |
| Repasser en brouillon / Annuler la programmation | `DELETE /v1/posts/{id}` (il n'existe pas d'endpoint « déprogrammer » documenté) ; la ligne reste en brouillon, avec sa date. |
| Supprimer | `DELETE` chez Zernio (sauf publiée : elle reste en ligne), puis suppression locale. |
| Réessayer (échec) | `POST /v1/posts/{id}/retry`. |
| Publiée | Non modifiable : Instagram et TikTok n'ont ni édition ni retrait par l'API. |

`platformSpecificData` envoyé :
- Instagram : `contentType: "story"` pour une story ; Reel : `shareToFeed`, `thumbOffset` ;
  `firstComment` (pas sur les stories). Le type est déduit des médias (une vidéo seule = Reel).
- Facebook : `contentType: "reel" | "story"` si choisi, `firstComment` (pas sur les stories).
- TikTok : `privacyLevel`, `allowComment`, `allowDuet` / `allowStitch` (vidéo), `commercialContentType`,
  `contentPreviewConfirmed` et `expressConsentGiven` (posés seulement quand on clique « Programmer »,
  déclaration TikTok affichée), `mediaType`, `videoCoverTimestampMs`, `description` pour les photos.
  Les choix TikTok n'ont pas de valeur par défaut (règle TikTok) ; options lues dans
  `GET /v1/accounts/{id}/tiktok/creator-info`.

Vérifications avant envoi (`POST /api/posts/validate` puis à nouveau à l'enregistrement) : règles
des plateformes (`rules.ts` : légende ≤ 2 200 pour Instagram/TikTok, au moins un média pour
Instagram/TikTok, story = 1 média, carrousel ≤ 10, pas de mélange photo/vidéo sur TikTok et Facebook,
durées), comptes Zernio (à reconnecter, en pause), date future, déclaration TikTok, conseils du skill
(hashtags, un Reel par jour, longueur de légende), puis `POST /v1/tools/validate/post` si Zernio est
configuré.

## Statuts : webhooks et synchronisation

- `POST /api/webhooks/zernio` (route publique) : corps brut, `X-Zernio-Signature` = HMAC-SHA256
  hexadécimal du corps avec `ZERNIO_WEBHOOK_SECRET`, comparé à temps constant. Sans secret : 503 en
  production, accepté en développement. Dédoublonnage sur `payload.id` (insertion
  `on conflict do nothing` ; en cas d'erreur de traitement l'événement est oublié pour que la
  relivraison de Zernio soit traitée). La publication est retrouvée par `post.metadata.atelierPostId`,
  sinon `zernio_post_id`. Rollups `post.published / partial / failed / scheduled / cancelled`,
  événements par plateforme (`post.platform.*`, `post.tiktok.url_resolved`) fusionnés dans
  `result.platforms` et `result.urls`. Attention : dans les webhooks l'identifiant est `post.id` et
  le lien `publishedUrl`.
- `POST /api/posts/sync` : `GET /v1/posts/{id}` pour les publications échues (≤ 10 min) ou en cours.
  L'écran l'appelle à l'ouverture puis toutes les 60 s quand l'onglet est visible.
- Journal : « a programmé », « a modifié la publication », « a annulé la programmation de »,
  « a supprimé la publication » (prénom), « a publié », « a publié en partie », « n'a pas pu
  publier » (acteur vide : Zernio).

## Routes

| Route | Réponse |
|---|---|
| `GET /api/social/accounts[?refresh=1]` | `{configured, accounts, rules, error}` (comptes en cache 60 s) |
| `GET /api/social/next-slot?accountId=` | `{slot: {nextSlot, timezone, queueName} \| null}` |
| `GET /api/social/tiktok/:accountId?mediaType=video\|photo` | infos créateur TikTok |
| `GET /api/posts?from&to&drafts=1&status=a,b` | `{posts, assets}` |
| `POST /api/posts` | publication créée (201) |
| `GET / PATCH / DELETE /api/posts/:id` | `{post, assets}` / publication / `{ok}` |
| `POST /api/posts/:id/cancel`, `/retry` | publication |
| `POST /api/posts/validate` | `{valid, errors[{field, platform?, message}], warnings}` |
| `POST /api/posts/sync` | `{configured, updated}` |
| `POST /api/webhooks/zernio` | `{ok, code: applied \| ignored \| duplicate \| test}` |

## Interface

Liens profonds : `/programmation?nouveau=1&assets=id1,id2&date=AAAA-MM-JJ`, `/programmation?post=<id>`.
Glisser une publication programmée sur un autre jour la déplace (heure conservée, « Annuler » dans le
toast) ; glisser un brouillon ouvre le compositeur à cette date (la programmation se confirme
toujours). Vue mémorisée dans le navigateur (`atelier:programmation-vue`).

## Tester sans Zernio

Ne jamais appeler l'API réelle en écriture pour tester. Un faux serveur local suffit : pointer
`ZERNIO_API_URL` vers lui avec une fausse clé, et simuler presign, PUT, `POST /v1/posts` (201, 207),
`GET /v1/posts/{id}`, `next-slot` (avec un 429 + `Retry-After`), puis envoyer des webhooks signés
(`HMAC-SHA256(corps, ZERNIO_WEBHOOK_SECRET)` en hexadécimal dans `X-Zernio-Signature`).

## Points non vérifiés chez Zernio (à confirmer avec le vrai compte)

- `PUT {isDraft: true}` pour déprogrammer n'est pas documenté : on supprime puis on garde le brouillon.
- Filtre de dates de `GET /v1/posts` (non utilisé : on interroge chaque publication).
- Instagram : carrousel limité à 10 médias (la doc et le schéma divergent : 10 ou 20).
- Durée réelle d'une requête `publishNow` : non utilisée (on programme à maintenant + 2 min).
