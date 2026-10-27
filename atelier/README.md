# Atelier — l'outil interne de June Content Studio

Atelier réunit au même endroit tout le travail sur les photos et vidéos de June :

- **Médiathèque** façon Google Drive : dossiers, recherche, favoris, mots-clés, corbeille, import par glisser-déposer ;
- **Retouche** « à l'image de June » : looks maison, recadrage, export, application par lot ;
- **Ménage** : doublons, quasi-doublons, photos floues, trop sombres ou trop claires, petites résolutions, vidéos ratées ;
- **Montage** vidéo avec HyperFrames (Reels, teasers, carrousels animés) ;
- **Programmation** des publications Instagram, TikTok… avec Zernio ;
- **Skills** : le savoir-faire de June (styles de montage, voix des légendes, méthodes) ;
- un **agent Claude**, présent sur chaque écran, qui sait tout faire à la demande.

C'est une application Next.js autonome dans le dossier `atelier/` du dépôt du site. Elle se déploie comme
un second projet Vercel et ne touche jamais au site. Architecture et conventions : [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md).

## Démarrer en local (aucune clé)

```bash
cd atelier
npm install
npm run dev        # → http://localhost:3100
```

Sans aucune variable, l'Atelier tourne entièrement sur l'ordinateur : base de données PGlite (Postgres
embarqué) et fichiers dans `atelier/.atelier-data/`, accès sans mot de passe. Tout fonctionne, sauf ce
qui demande un service extérieur (agent et analyse IA, publication réelle sur les réseaux, rendu vidéo
dans le cloud). Pour en ajouter : copiez `.env.example` en `.env.local` et remplissez ce qu'il faut.

La page **Réglages** (`/reglages`) montre ce qui est branché, ce qui reste à configurer, les variables
exactes à renseigner et des boutons « Tester ».

## Les comptes de June

**Supabase, Zernio et Cloudflare R2 sont des comptes dédiés à June.** L'Atelier ne s'y branche que par
les variables d'environnement de ce projet (`DATABASE_URL`, `ZERNIO_API_KEY`, `R2_ACCOUNT_ID` / `S3_*`) :
jamais par une session ou une connexion enregistrée ailleurs sur la machine, et jamais sur d'autres
comptes. Pour changer de compte, on change les variables, rien d'autre.

## Mise en ligne, pas à pas

### 1. Stockage des fichiers : Cloudflare R2

1. Cloudflare → R2 → **Create bucket** (par exemple `june-atelier`), région automatique.
2. R2 → **Manage API tokens** → *Create API token* avec la permission **Object Read & Write**, limitée à
   ce bucket. Notez l'*Access Key ID*, le *Secret Access Key* et l'identifiant du compte (*Account ID*).
3. Bucket → **Settings → CORS policy** : le navigateur envoie les fichiers directement dans R2, il faut
   l'autoriser depuis l'adresse de l'Atelier (remplacez l'origine) :

   ```json
   [
     {
       "AllowedOrigins": ["https://atelier.example.com", "http://localhost:3100"],
       "AllowedMethods": ["PUT", "GET", "HEAD"],
       "AllowedHeaders": ["*"],
       "ExposeHeaders": ["ETag"],
       "MaxAgeSeconds": 3600
     }
   ]
   ```

   `ExposeHeaders: ["ETag"]` est indispensable pour les gros fichiers (envoi en plusieurs morceaux).
4. Facultatif : **Public access** (domaine `r2.dev` ou domaine personnalisé) → `S3_PUBLIC_BASE_URL`.
   Sans domaine public, l'Atelier signe des liens temporaires (tout fonctionne aussi).
5. Variables : `R2_ACCOUNT_ID`, `S3_BUCKET`, `S3_ACCESS_KEY_ID`, `S3_SECRET_ACCESS_KEY` (+ `S3_PUBLIC_BASE_URL`).

### 2. Base de données : Supabase

1. Dans le projet Supabase de June : **Project Settings → Database → Connection string**.
2. Choisissez le **Transaction pooler** (port **6543**) et copiez l'URI, mot de passe compris :
   `postgresql://postgres.<ref>:<mot-de-passe>@aws-0-<région>.pooler.supabase.com:6543/postgres`.
3. Variable : `DATABASE_URL`. Les tables sont créées toutes seules, au premier lancement, dans un schéma
   `atelier` séparé (non exposé par l'API publique de Supabase, sécurité au niveau des lignes activée).
   Pour lire le SQL à l'avance : `npm run db:sql`.

### 3. Vercel : un second projet

1. Vercel → **Add New → Project** → importez le **même dépôt** que le site.
2. **Root Directory : `atelier`** (indispensable : c'est ce qui sépare l'Atelier du site). Framework : Next.js.
3. **Environment Variables** : toutes celles de `.env.example` dont vous avez besoin, au minimum
   `ATELIER_PASSWORD`, `ATELIER_SECRET`, `ATELIER_APP_URL` (l'adresse finale), `DATABASE_URL` et les
   variables R2. Ajoutez `ANTHROPIC_API_KEY` pour l'agent, `ZERNIO_API_KEY` pour la programmation.
4. Rendu vidéo : Vercel ne peut pas lancer Chrome. `HYPERFRAMES_RENDER=sandbox` (avec `VERCEL_TOKEN`,
   `VERCEL_TEAM_ID`, `VERCEL_PROJECT_ID`) ou `heygen` (avec `HEYGEN_API_KEY`) ; sinon rendez les vidéos
   depuis un ordinateur avec `HYPERFRAMES_RENDER=local`.
5. Déployez, puis ouvrez `/reglages` : chaque connexion doit afficher « Branché ».

### 4. Zernio (programmation)

1. Zernio → **Settings → API keys** → créez une clé → `ZERNIO_API_KEY`.
2. Zernio → **Webhooks** : adresse `https://<votre-atelier>/api/webhooks/zernio`, avec un secret de votre
   choix (le même dans `ZERNIO_WEBHOOK_SECRET`). Les statuts (publié, échec) remontent alors tout seuls.
3. Connectez les comptes Instagram / TikTok de June dans Zernio ; ils apparaissent dans la programmation.
4. `ATELIER_TIMEZONE` (défaut `Europe/Paris`) fixe le fuseau des horaires.

## Skills : configurés dans le dépôt, améliorés dans l'Atelier

Les skills vivent dans `atelier/skills/<slug>/` (`SKILL.md` + `data.json`). Ils sont importés dans la base
au démarrage, puis s'améliorent dans l'Atelier (`/skills`), à la main ou avec l'agent, avec un historique
des versions. Pour rapatrier dans le dépôt les améliorations faites en ligne :

```bash
ATELIER_URL=https://atelier.example.com ATELIER_PASSWORD=… npm run skills:pull
```

Relisez le diff, puis committez.

## Sécurité

- **Mot de passe obligatoire en ligne** : sans `ATELIER_PASSWORD`, l'Atelier refuse de s'ouvrir en production.
  Choisissez un `ATELIER_SECRET` long et aléatoire (`openssl rand -base64 32`) : le changer déconnecte tout le monde.
- **Aucun secret dans le navigateur ni dans le dépôt** : les clés restent côté serveur, la page Réglages
  n'affiche que « présente / absente ». `.env.local` est ignoré par git.
- **Fichiers privés** : le bucket peut rester privé, l'Atelier signe des liens temporaires. Un domaine public
  rend les fichiers accessibles à quiconque connaît leur adresse (adresses non devinables).
- **Base isolée** : schéma `atelier` séparé, sécurité au niveau des lignes activée, aucune règle d'accès
  publique : seul le serveur de l'Atelier (par `DATABASE_URL`) y accède.
- **Webhook Zernio** signé avec `ZERNIO_WEBHOOK_SECRET` ; les requêtes non signées sont refusées.
- **Rien n'est effacé sans passer par la corbeille** (Ménage compris) ; l'agent demande confirmation avant
  toute action irréversible ou toute publication.

## Commandes

| Commande | Effet |
|---|---|
| `npm run dev` | Atelier en local sur http://localhost:3100 |
| `npm run build` / `npm start` | build de production / serveur de production |
| `npm run typecheck` | vérification TypeScript |
| `npm run skills:pull` | rapatrie les skills d'un Atelier en ligne dans le dépôt |
| `npm run db:sql` | affiche le SQL des migrations |
