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
