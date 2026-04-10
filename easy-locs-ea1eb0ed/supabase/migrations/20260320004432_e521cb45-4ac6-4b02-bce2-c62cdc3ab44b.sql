
create table if not exists public.user_favorites (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  entity_type text not null default 'merchant',
  entity_id text not null,
  created_at timestamptz not null default now(),
  unique (user_id, entity_type, entity_id)
);

create index if not exists idx_user_favorites_user_id on public.user_favorites(user_id);

alter table public.user_favorites enable row level security;

create policy "Users can manage own favorites"
on public.user_favorites
for all
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);
