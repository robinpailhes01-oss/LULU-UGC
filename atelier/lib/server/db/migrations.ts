/**
 * Migrations SQL d'Atelier, appliquées automatiquement (dans l'ordre, une seule fois) au premier
 * accès à la base, en local (PGlite) comme sur Supabase. Tout vit dans le schéma `atelier`,
 * qui n'est pas exposé par l'API REST publique de Supabase ; la sécurité ligne à ligne est tout de
 * même activée sans politique, pour que seul le serveur (rôle postgres) y accède.
 *
 * Pour appliquer à la main dans l'éditeur SQL de Supabase : `npm run db:sql` affiche le SQL complet.
 * Ne jamais modifier une migration déjà publiée : en ajouter une nouvelle à la fin.
 */
export const MIGRATIONS: { version: string; sql: string }[] = [
  {
    version: "001_init",
    sql: `
create schema if not exists atelier;

create table if not exists atelier.folders (
  id uuid primary key default gen_random_uuid(),
  parent_id uuid references atelier.folders(id) on delete cascade,
  name text not null,
  color text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by text
);
create index if not exists folders_parent_idx on atelier.folders (parent_id);

create table if not exists atelier.assets (
  id uuid primary key default gen_random_uuid(),
  folder_id uuid references atelier.folders(id) on delete set null,
  kind text not null check (kind in ('photo', 'video', 'audio')),
  name text not null,
  mime text not null,
  size_bytes bigint not null default 0,
  storage_key text not null,
  thumb_key text,
  poster_key text,
  width integer,
  height integer,
  duration_s double precision,
  taken_at timestamptz,
  camera text,
  gps jsonb,
  sha256 text,
  dhash text,
  blur_score double precision,
  luma_mean double precision,
  clip_high double precision,
  clip_low double precision,
  tags text[] not null default '{}',
  ai jsonb,
  starred boolean not null default false,
  status text not null default 'uploading' check (status in ('uploading', 'ready', 'error')),
  source text not null default 'upload' check (source in ('upload', 'retouch', 'montage', 'import')),
  parent_asset_id uuid references atelier.assets(id) on delete set null,
  edit jsonb,
  trashed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by text
);
create index if not exists assets_folder_idx on atelier.assets (folder_id, created_at desc);
create index if not exists assets_created_idx on atelier.assets (created_at desc);
create index if not exists assets_sha_idx on atelier.assets (sha256);
create index if not exists assets_tags_idx on atelier.assets using gin (tags);
create index if not exists assets_trashed_idx on atelier.assets (trashed_at);
create index if not exists assets_parent_idx on atelier.assets (parent_asset_id);

create table if not exists atelier.looks (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  params jsonb not null,
  builtin boolean not null default false,
  sort integer not null default 100,
  created_at timestamptz not null default now(),
  created_by text
);

create table if not exists atelier.montages (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  spec jsonb not null,
  html text,
  custom_html boolean not null default false,
  status text not null default 'draft' check (status in ('draft', 'rendering', 'rendered', 'failed')),
  render jsonb,
  output_asset_id uuid references atelier.assets(id) on delete set null,
  duration_s double precision,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by text
);
create index if not exists montages_updated_idx on atelier.montages (updated_at desc);

create table if not exists atelier.posts (
  id uuid primary key default gen_random_uuid(),
  zernio_post_id text,
  status text not null default 'draft' check (status in ('draft', 'scheduled', 'publishing', 'published', 'failed', 'cancelled')),
  caption text not null default '',
  first_comment text,
  asset_ids uuid[] not null default '{}',
  targets jsonb not null default '[]',
  scheduled_for timestamptz,
  timezone text not null default 'Europe/Paris',
  options jsonb not null default '{}',
  error text,
  result jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by text
);
create index if not exists posts_scheduled_idx on atelier.posts (scheduled_for);
create unique index if not exists posts_zernio_idx on atelier.posts (zernio_post_id) where zernio_post_id is not null;

create table if not exists atelier.threads (
  id uuid primary key default gen_random_uuid(),
  title text not null default 'Nouvelle conversation',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by text
);
create index if not exists threads_updated_idx on atelier.threads (updated_at desc);

create table if not exists atelier.messages (
  id uuid primary key default gen_random_uuid(),
  thread_id uuid not null references atelier.threads(id) on delete cascade,
  seq integer not null,
  role text not null check (role in ('user', 'assistant')),
  content jsonb not null,
  meta jsonb,
  created_at timestamptz not null default now(),
  unique (thread_id, seq)
);

create table if not exists atelier.pending_actions (
  id uuid primary key default gen_random_uuid(),
  thread_id uuid references atelier.threads(id) on delete cascade,
  tool text not null,
  input jsonb not null,
  summary text not null,
  status text not null default 'pending' check (status in ('pending', 'cancelled', 'executed', 'failed')),
  result jsonb,
  created_at timestamptz not null default now(),
  resolved_at timestamptz,
  resolved_by text
);

create table if not exists atelier.activity (
  id bigserial primary key,
  actor text,
  verb text not null,
  object_type text not null,
  object_id text,
  summary text not null,
  meta jsonb,
  created_at timestamptz not null default now()
);
create index if not exists activity_created_idx on atelier.activity (created_at desc);

create table if not exists atelier.settings (
  key text primary key,
  value jsonb not null,
  updated_at timestamptz not null default now()
);

alter table atelier.folders enable row level security;
alter table atelier.assets enable row level security;
alter table atelier.looks enable row level security;
alter table atelier.montages enable row level security;
alter table atelier.posts enable row level security;
alter table atelier.threads enable row level security;
alter table atelier.messages enable row level security;
alter table atelier.pending_actions enable row level security;
alter table atelier.activity enable row level security;
alter table atelier.settings enable row level security;
`,
  },
];
