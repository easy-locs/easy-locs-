create table if not exists public.client_ratings (
  id uuid primary key default gen_random_uuid(),
  job_id uuid not null references public.mobility_jobs(id) on delete cascade,
  rider_user_id uuid not null references auth.users(id),
  client_user_id uuid not null references auth.users(id),
  rating smallint not null check (rating >= 1 and rating <= 5),
  comment text,
  created_at timestamptz not null default now(),
  constraint uq_client_ratings_job unique (job_id)
);

create index if not exists idx_client_ratings_client on public.client_ratings (client_user_id);
create index if not exists idx_client_ratings_rider on public.client_ratings (rider_user_id);

alter table public.client_ratings enable row level security;

create policy "Riders can insert client ratings for their own jobs"
  on public.client_ratings for insert
  with check (auth.uid() = rider_user_id);

create policy "Users can read ratings where they are rider or client"
  on public.client_ratings for select
  using (auth.uid() = rider_user_id or auth.uid() = client_user_id);
