# Divine — landing page

Page de vente du studio de contenu **Divine** : reels, photos et vidéos « prêt à publier »
pour les restaurants, hôtels, logements insolites et lieux d'activité en Occitanie.

## Stack

- Next.js 14 (App Router) + TypeScript
- Tailwind CSS (tokens couleur mappés depuis `design-direction`)
- Framer Motion (cascade au load, flottement des cartes, reveals au scroll,
  `prefers-reduced-motion` respecté)
- `next/font/google` — Fraunces (display) + Manrope (texte/UI)
- lucide-react pour les icônes

## Lancer en local

```bash
npm install
npm run dev
```

Puis ouvrir http://localhost:3000.

## Formulaire de contact

`app/api/contact/route.ts` insère les demandes dans une table Supabase
`contact_requests` si les variables d'environnement existent :

```
NEXT_PUBLIC_SUPABASE_URL=...
SUPABASE_SERVICE_ROLE_KEY=...
```

Sans ces variables, le formulaire bascule automatiquement sur un `mailto:` prérempli.

Schéma de la table :

```sql
create table contact_requests (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz default now(),
  nom text,
  lieu text,
  email text not null,
  message text
);
```

## Déploiement Vercel

1. Importer le repo dans Vercel (framework détecté : Next.js).
2. Ajouter les deux variables d'environnement Supabase (optionnel — le fallback
   `mailto:` fonctionne sans).
3. Déployer. Aucune autre configuration nécessaire.

## Contenu

- L'offre, les prix et le positionnement viennent de `.claude/skills/brand-offer/SKILL.md`
  (source de vérité). Pour faire évoluer un prix : modifier ce skill puis répercuter
  dans `components/sections/Tarifs.tsx`.
- Les cartes portfolio utilisent des dégradés chauds en placeholder — remplacer par
  les vrais médias dans `lib/realisations.ts` dès qu'ils sont prêts (premier cas :
  logement insolite, Port de Carnon).
