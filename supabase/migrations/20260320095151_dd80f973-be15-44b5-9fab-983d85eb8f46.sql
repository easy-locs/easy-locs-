
create table if not exists public.favorite_listings (
  id text primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  orbit_id text not null,
  listing_id text not null,
  created_at timestamptz not null default now()
);

create unique index if not exists idx_favorite_unique
  on public.favorite_listings(user_id, listing_id);

create table if not exists public.saved_searches (
  id text primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  orbit_id text not null,
  name text not null,
  filters jsonb not null,
  created_at timestamptz not null default now()
);

create table if not exists public.activity_logs (
  id text primary key,
  user_id uuid references auth.users(id) on delete cascade,
  orbit_id text,
  action text not null,
  entity_type text,
  entity_id text,
  metadata jsonb,
  created_at timestamptz not null default now()
);

create index if not exists idx_activity_logs_user_id on public.activity_logs(user_id);
create index if not exists idx_activity_logs_created_at on public.activity_logs(created_at desc);

alter table public.favorite_listings enable row level security;
alter table public.saved_searches enable row level security;
alter table public.activity_logs enable row level security;

create policy "read_own_favorites"
on public.favorite_listings for select
using (auth.uid() = user_id);

create policy "insert_own_favorites"
on public.favorite_listings for insert
with check (auth.uid() = user_id);

create policy "delete_own_favorites"
on public.favorite_listings for delete
using (auth.uid() = user_id);

create policy "read_own_saved_searches"
on public.saved_searches for select
using (auth.uid() = user_id);

create policy "insert_own_saved_searches"
on public.saved_searches for insert
with check (auth.uid() = user_id);

create policy "delete_own_saved_searches"
on public.saved_searches for delete
using (auth.uid() = user_id);

create policy "read_own_activity_logs"
on public.activity_logs for select
using (auth.uid() = user_id);

create policy "insert_own_activity_logs"
on public.activity_logs for insert
with check (auth.uid() = user_id);
