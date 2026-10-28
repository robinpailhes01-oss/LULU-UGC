# Atelier — architecture

Atelier est l'outil interne de June Content Studio : une médiathèque façon Google Drive, la
retouche « à l'image de June », le ménage, le montage vidéo avec HyperFrames, la programmation
des publications avec Zernio, et un agent Claude qui fait tout cela à la demande, depuis un
panneau de discussion présent sur chaque écran.

C'est une application Next.js autonome dans le dossier `atelier/` du dépôt du site. Elle se
déploie comme un second projet Vercel (dossier racine : `atelier`), sans jamais toucher au site.

## Deux modes, choisis automatiquement

| | Local (aucune clé) | Cloud |
|---|---|---|
| Métadonnées | PGlite (Postgres embarqué) dans `.atelier-data/pglite` | Supabase Postgres (`DATABASE_URL`) |
| Fichiers | disque, `.atelier-data/blobs`, servis par `/api/blob` (liens signés) | S3 compatible : Cloudflare R2 recommandé |
| Accès | libre (pas de mot de passe) | `ATELIER_PASSWORD` obligatoire en production |
| Agent / analyse IA | si `ANTHROPIC_API_KEY` | idem |
| Programmation | brouillons locaux | Zernio (`ZERNIO_API_KEY`) |
| Rendu vidéo | `npx hyperframes render` sur la machine | fournisseur distant (voir montage) |

Le même SQL tourne sur PGlite et sur Supabase. Toutes les tables vivent dans le schéma
`atelier` (non exposé par l'API REST publique de Supabase), créées par les migrations de
`lib/server/db/migrations.ts`, appliquées automatiquement au premier accès.

## Arborescence

```
app/(app)/…            pages (coque : barre latérale, recherche, panneau agent)
app/api/…              API REST JSON (tout passe par là : interface, agent, intégrations)
app/login              connexion (mot de passe d'équipe + prénom)
components/ui          primitives (Button, Dialog, Menu, Toast, Slider, Field, Badge…)
components/shell       coque (Sidebar, Topbar, ShellContext)
components/<module>    écrans des modules
lib/shared             types, formats, libellés, mathématiques de couleur (client + serveur)
lib/client             appels API, bus de rafraîchissement, hooks
lib/server             env, db, stockage, auth, http, repos, services, intégrations
```

## Conventions

- **API** : succès = le JSON de la ressource ; erreur = `{ error: { code, message } }` avec un
  message français affichable. Les routes utilisent `route()` et `body(req, zodSchema)` de
  `lib/server/http.ts`, `export const runtime = "nodejs"`.
- **Services** : la logique métier vit dans `lib/server/repo/*` et `lib/server/services/*`. Les
  routes ET l'agent appellent ces fonctions (jamais l'agent ne passe par HTTP).
- **SQL** : paramètres `$1…`, jsonb via `JSON.stringify` + `::jsonb`, tableaux via `::text[]` /
  `::uuid[]`. Dans une transaction (`db.tx(t => …)`), n'utiliser que `t` (PGlite sérialise les
  requêtes : appeler `getDb()` à l'intérieur bloquerait).
- **Journal** : chaque action notable appelle `logActivity()` (prénom de la personne, verbe au
  passé composé, résumé court).
- **Rafraîchissement** : après une mutation, le navigateur appelle `emitRefresh("assets", …)` ;
  les vues abonnées via `useResource(path, scopes)` se rechargent. L'agent renvoie un événement
  `refresh` pour la même chose.
- **Fichiers** : le navigateur envoie directement au stockage via des URLs signées
  (`/api/uploads` → PUT → `/api/uploads/complete`). Les vignettes, affiches vidéo, empreintes
  (SHA-256, dHash), netteté et exposition sont calculées dans le navigateur à l'envoi.
  Affichage : `asset.urls.thumb|poster|original` (redirection vers le stockage).
- **Interface** : français, libellés courts à l'impératif (« Importer », « Mettre à la corbeille »).
  Palette et jetons dans `tailwind.config.ts` ; une seule action primaire (espresso) par écran.

## Modules

| Module | Écrans | Services / routes |
|---|---|---|
| Clients | `/clients`, `/clients/[id]` (fiche), sélecteur de la barre latérale | services/clients, `lib/server/client-scope.ts`, /api/clients/** |
| Médiathèque | `/mediatheque`, dossiers, récents, favoris, recherche, corbeille | repo assets/folders, uploads |
| Retouche | `/retouche/[id]` | `lib/shared/look.ts`, services/retouch, services/looks |
| Ménage | `/menage` | services/cleanup |
| Montage | `/montage`, `/montage/[id]` | services/montages (+ rendu HyperFrames) |
| Programmation | `/programmation` | services/posts (+ client Zernio, webhook) |
| Agent | panneau + `/agent` | lib/server/agent/*, services/ai-tagging |
| Pilotage | `/` (tableau de bord), `/reglages` | /api/stats, /api/health |
| Skills | `/skills`, `/skills/[slug]` | services/skills (fondation), /api/skills |

## Skills : configurer ici, améliorer dans l'Atelier

Les skills (`atelier/skills/<slug>/SKILL.md` + `data.json`) portent le savoir-faire : styles de
montage, voix, direction artistique, méthodes, références. Ils sont regroupés au build
(`scripts/bundle-skills.mjs` → `lib/server/skills/bundled.generated.ts`) et importés en base au
démarrage (`lib/server/services/skills.ts`, tables `atelier.skills` / `atelier.skill_versions`).

- Une modification dans l'Atelier crée une version (retour arrière possible) et marque le skill
  « modifié dans l'Atelier » ; une nouvelle version du dépôt ne l'écrase pas, elle est signalée.
- Un skill non modifié dans l'Atelier suit automatiquement le dépôt.
- L'agent reçoit l'index des skills dans son prompt et lit/modifie leur contenu avec des outils.
- Les montages référencent un style (`MontageSpec.style` = slug d'un skill « montage ») dont les
  paramètres (`MontageStyleData`) servent de valeurs par défaut.
- `npm run skills:pull` rapatrie dans le dépôt les versions d'un Atelier en ligne.

## Clients : une agence, plusieurs clients

L'Atelier se vend à une agence de community management (une installation par agence, nom affiché
réglé par `ATELIER_NAME`). Chaque client de l'agence a sa fiche, et **tout le contenu porte un
client** : `client_id` (nullable) sur `folders`, `assets`, `montages`, `posts`, `threads`,
`activity`, `skills` (migration `004_clients`, table `atelier.clients`). `client_id` null = contenu
de l'agence.

### Client courant

- Cookie `atelier_client` (identifiant du client ; absent = « Tous les clients »), posé par
  `POST /api/clients/current {clientId|null}` depuis le sélecteur de la barre latérale.
- `getCurrentClientId()` (`lib/server/client-scope.ts`) : portée explicite de l'agent
  (`runWithClient`, AsyncLocalStorage) si présente, sinon le cookie (un client disparu est ignoré).
- **Lectures** : chaque fonction de liste prend `client?: ClientFilter` — `undefined` = client
  courant, `null` = tous les clients, un id = ce client. Les routes de liste acceptent
  `?client=all|<id>` (`requestClientFilter(req)`). Lister un dossier précis ou des ids précis ne
  filtre pas (leur contenu appartient déjà à un client). Skills : ceux de l'agence + ceux du client.
- **Écritures** : tout ce qui est créé est rattaché au client courant ; un média produit côté
  serveur hérite de son média d'origine (retouche) ou de son montage (rendu) ; un dossier hérite de
  son parent ; un média rangé dans le dossier d'un client passe à ce client (un dossier déplacé
  emmène ses sous-dossiers et médias). Le journal (`logActivity`) prend le client de l'objet
  (`clientId`) ou, à défaut, le client courant.
- **Dossier racine** : créer un client crée son dossier (à son nom, `clients.root_folder_id`).
  Avec un client courant, la « racine » de la médiathèque est ce dossier : `/mediatheque` y
  redirige, et un envoi, un dossier créé ou un déplacement « à la racine » y atterrit
  (`resolveRootFolder`). Dans la vue « Tous les clients », la racine montre un dossier par client.
- Changer de client dans l'interface : `switchClient()` (ShellContext) pose le cookie, émet
  `emitRefresh(...ALL_REFRESH_SCOPES)`, `router.refresh()` et ouvre une nouvelle conversation.
  Chaque écran montre sa portée par une pastille (`ClientScopeChip`).

### Fiche client et Zernio

- `lib/server/services/clients.ts` : liste (avec médias, publications programmées, dernière
  activité), lecture, création, modification, archivage (le contenu reste, le client sort du
  sélecteur). Réseaux (`socials`) normalisés par `lib/shared/clients.ts` (adresse ou @identifiant →
  `{platform, url, handle}`), site normalisé, slug unique et stable (préfixe des skills du client).
- Zernio branché : un **profil Zernio par client** (`POST /v1/profiles`, `externalId` = id du
  client, Idempotency-Key ; nom déjà pris → « Nom · slug »), créé avec le client ou à la première
  connexion. « Connecter » sur la fiche : `POST /api/clients/:id/connect {platform}` →
  `GET /v1/connect/{platform}?profileId&redirect_url=<ATELIER_APP_URL>/clients/:id?tab=apercu` →
  `authUrl` ; Zernio renvoie sur la fiche avec `connected=…&accountId&username` ou `error=…`.
- Programmation : `listSocialAccounts` filtre par le profil du client courant (aucun compte s'il
  n'a pas de profil) ; une publication d'un client refuse un compte d'un autre profil.
- Sans Zernio : tout fonctionne (réseaux enregistrés sur la fiche), avec des indications
  « Connectez Zernio ».

### Agent

- Une conversation appartient à un client (`threads.client_id`, celui de l'interface à sa
  création). Tout le tour s'exécute dans `runWithClient({ clientId })` : les outils ne voient et
  ne créent que ce client. Une action à confirmer garde le client de sa proposition.
- Le système reçoit un bloc `<client>` (nom, secteur, site, réseaux, description, résumé de
  marque) **après** le point de cache, figé à la création du fil ; s'il change (autre client,
  fiche modifiée), un `<client_a_jour>` est ajouté au message suivant. `<ecran>` dit quel client
  l'interface affiche.
- Outils : `list_clients`, `get_client`, `create_client` (sans confirmation, rattache la
  conversation au nouveau client par défaut), `update_client`, `set_conversation_client`.

### Points d'accroche pour les étapes suivantes

- **Analyse de la marque** : écrire `clients.brand` (`ClientBrand` : `summary`, `voice`, … libre)
  via `updateClient(id, { brand })` ou `PATCH /api/clients/:id {brand}` ; le résumé et la voix
  entrent dans le bloc `<client>` de l'agent ; l'onglet « Marque » de la fiche l'affiche.
  Les skills propres au client (`<slug-client>-voix`, `-marque`…) priment sur ceux de l'agence.
- **Concurrents / Reels gagnants** : onglet « Concurrents » de la fiche (emplacement prêt), à
  rattacher par `client_id`.
- **Rushes et tri automatique** : le dossier racine du client (`rootFolderId`) est la destination
  naturelle ; tout envoi est déjà rattaché au client.
- **Calendrier éditorial / analytics** : `posts.client_id` et le profil Zernio du client
  (`zernioProfileId`) servent de filtre (`profileId` des endpoints analytics de Zernio).
