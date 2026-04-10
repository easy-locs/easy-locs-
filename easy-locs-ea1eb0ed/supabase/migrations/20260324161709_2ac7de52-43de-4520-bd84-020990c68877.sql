
create table if not exists public.user_ai_profiles (
  user_id uuid primary key,
  preferred_categories jsonb default '[]'::jsonb,
  preferred_price_range text,
  preferred_locations jsonb default '[]'::jsonb,
  activity_score numeric default 0,
  engagement_score numeric default 0,
  last_active_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table public.user_ai_profiles enable row level security;

create policy "Users can read own AI profile"
  on public.user_ai_profiles for select
  to authenticated
  using (user_id = auth.uid());

create policy "Users can upsert own AI profile"
  on public.user_ai_profiles for insert
  to authenticated
  with check (user_id = auth.uid());

create policy "Users can update own AI profile"
  on public.user_ai_profiles for update
  to authenticated
  using (user_id = auth.uid());

create policy "Anon can insert AI profiles"
  on public.user_ai_profiles for insert
  to anon
  with check (true);

create policy "Anon can update AI profiles"
  on public.user_ai_profiles for update
  to anon
  using (true);

create policy "Anon can select AI profiles"
  on public.user_ai_profiles for select
  to anon
  using (true);
