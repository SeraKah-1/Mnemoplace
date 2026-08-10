-- ═══════════════════════════════════════════════════════════════════
--  Mnemoplace — Supabase Schema
--  Run in: Supabase Dashboard → SQL Editor → New Query → Run
-- ═══════════════════════════════════════════════════════════════════

create extension if not exists "uuid-ossp";

-- ─── World Folders ──────────────────────────────────────────────────
create table if not exists public.world_folders (
  id            text        primary key,
  user_id       uuid        not null references auth.users(id) on delete cascade,
  name          text        not null,
  floor_number  int,
  theme_color   text        not null default '#4ade80',
  spawn_x       int         not null default 0,
  spawn_y       int         not null default 0,
  last_tile_x   int,
  last_tile_y   int,
  description   text,
  created_at    bigint      not null,
  updated_at    bigint      not null,
  synced_at     timestamptz not null default now()
);
alter table public.world_folders enable row level security;
create policy "Users own their worlds" on public.world_folders for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- ─── Memory Blocks ──────────────────────────────────────────────────
create table if not exists public.memory_blocks (
  id                  text    primary key,
  user_id             uuid    not null references auth.users(id) on delete cascade,
  world_id            text    not null references public.world_folders(id) on delete cascade,
  x                   int     not null,
  y                   int     not null,
  title               text    not null,
  text                text    not null default '',
  doodle_id           text,
  tags                text[]  not null default '{}',
  srs_due             bigint  not null default 0,
  srs_stability       float   not null default 0,
  srs_difficulty      float   not null default 0,
  srs_elapsed_days    float   not null default 0,
  srs_scheduled_days  float   not null default 0,
  srs_reps            int     not null default 0,
  srs_lapses          int     not null default 0,
  srs_state           int     not null default 0,
  srs_last_review     bigint,
  created_at          bigint  not null,
  updated_at          bigint  not null,
  synced_at           timestamptz not null default now()
);
alter table public.memory_blocks enable row level security;
create policy "Users own their blocks" on public.memory_blocks for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);
create index if not exists memory_blocks_world_idx on public.memory_blocks(user_id, world_id);
create index if not exists memory_blocks_srs_due_idx on public.memory_blocks(user_id, srs_due);

-- ─── Pixel Doodles ──────────────────────────────────────────────────
create table if not exists public.pixel_doodles (
  id          text    primary key,
  user_id     uuid    not null references auth.users(id) on delete cascade,
  width       int     not null default 16,
  height      int     not null default 16,
  palette     text[]  not null default '{}',
  pixels      bytea   not null,
  created_at  bigint  not null,
  updated_at  bigint  not null,
  synced_at   timestamptz not null default now()
);
alter table public.pixel_doodles enable row level security;
create policy "Users own their doodles" on public.pixel_doodles for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- ─── Chunk Tile Overrides ───────────────────────────────────────────
create table if not exists public.chunk_overrides (
  key         text    primary key,
  user_id     uuid    not null references auth.users(id) on delete cascade,
  world_id    text    not null,
  cx          int     not null,
  cy          int     not null,
  tiles       bytea   not null,
  block_ids   text[]  not null default '{}',
  updated_at  bigint  not null,
  synced_at   timestamptz not null default now()
);
alter table public.chunk_overrides enable row level security;
create policy "Users own their chunks" on public.chunk_overrides for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);
