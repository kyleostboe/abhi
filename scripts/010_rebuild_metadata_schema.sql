-- Recreate metadata-only tables for meditations and journaling

-- Meditations store metadata only. Audio is kept in IndexedDB on the client.
create table if not exists public.meditations (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid references public.profiles(id) on delete cascade,
  title text not null,
  description text,
  duration integer not null default 0,
  source text not null check (source in ('adjuster', 'encoder')),
  metadata jsonb default '{}'::jsonb,
  original_filename text,
  created_at timestamptz default now()
);

create index if not exists meditations_profile_id_idx on public.meditations (profile_id);
create index if not exists meditations_created_at_idx on public.meditations (created_at desc);

-- User settings remain metadata only
create table if not exists public.user_settings (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid references public.profiles(id) on delete cascade,
  settings jsonb not null default '{}'::jsonb,
  updated_at timestamptz default now()
);
create unique index if not exists user_settings_profile_id_key on public.user_settings(profile_id);

-- Journal entries capture metadata and notes only
create table if not exists public.journal_entries (
  id uuid primary key,
  profile_id uuid references public.profiles(id) on delete cascade,
  meditation_id uuid references public.meditations(id) on delete cascade,
  entry_date date not null default current_date,
  play_time timestamptz not null default now(),
  content text,
  created_at timestamptz default now()
);
create index if not exists journal_entries_profile_id_idx on public.journal_entries(profile_id);
create index if not exists journal_entries_meditation_id_idx on public.journal_entries(meditation_id);

alter table public.meditations enable row level security;
alter table public.user_settings enable row level security;
alter table public.journal_entries enable row level security;

-- Policies: keep permissive for the test profile while allowing per-user access when auth is available
create policy if not exists "meditations_owner_access" on public.meditations
  using (auth.uid() = profile_id or profile_id = '00000000-0000-0000-0000-000000000001')
  with check (auth.uid() = profile_id or profile_id = '00000000-0000-0000-0000-000000000001');

create policy if not exists "user_settings_owner_access" on public.user_settings
  using (auth.uid() = profile_id or profile_id = '00000000-0000-0000-0000-000000000001')
  with check (auth.uid() = profile_id or profile_id = '00000000-0000-0000-0000-000000000001');

create policy if not exists "journal_entries_owner_access" on public.journal_entries
  using (auth.uid() = profile_id or profile_id = '00000000-0000-0000-0000-000000000001')
  with check (auth.uid() = profile_id or profile_id = '00000000-0000-0000-0000-000000000001');
