
create table if not exists public.mobility_dispatch_runs (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  job_id uuid not null references public.mobility_jobs(id) on delete cascade,
  status text not null default 'running',
  dispatch_strategy text not null default 'wave_ai',
  current_wave integer not null default 1,
  max_waves integer not null default 3,
  zone_key text null,
  score_summary_json jsonb not null default '{}'::jsonb,
  metadata_json jsonb not null default '{}'::jsonb
);

create table if not exists public.mobility_driver_scores (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  job_id uuid not null references public.mobility_jobs(id) on delete cascade,
  rider_user_id uuid not null,
  score_total numeric not null default 0,
  score_distance numeric not null default 0,
  score_acceptance numeric not null default 0,
  score_response numeric not null default 0,
  score_reliability numeric not null default 0,
  score_zone numeric not null default 0,
  score_activity numeric not null default 0,
  score_vehicle_fit numeric not null default 0,
  score_gps_quality numeric not null default 0,
  rank_index integer null,
  explanation_json jsonb not null default '{}'::jsonb
);

create table if not exists public.mobility_driver_stats (
  rider_user_id uuid primary key,
  updated_at timestamptz not null default now(),
  acceptance_rate numeric not null default 0,
  cancellation_rate numeric not null default 0,
  avg_response_seconds numeric not null default 0,
  avg_pickup_arrival_minutes numeric not null default 0,
  avg_trip_completion_rate numeric not null default 0,
  gps_reliability_score numeric not null default 0,
  zone_success_json jsonb not null default '{}'::jsonb,
  metadata_json jsonb not null default '{}'::jsonb
);

create table if not exists public.mobility_pricing_snapshots (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  job_id uuid null references public.mobility_jobs(id) on delete set null,
  zone_key text null,
  distance_km numeric not null default 0,
  duration_min numeric not null default 0,
  base_fare numeric not null default 0,
  distance_fare numeric not null default 0,
  time_fare numeric not null default 0,
  surge_multiplier numeric not null default 1,
  traffic_multiplier numeric not null default 1,
  demand_multiplier numeric not null default 1,
  weather_multiplier numeric not null default 1,
  final_price numeric not null default 0,
  explanation_json jsonb not null default '{}'::jsonb
);

alter table public.mobility_dispatch_runs enable row level security;
alter table public.mobility_driver_scores enable row level security;
alter table public.mobility_driver_stats enable row level security;
alter table public.mobility_pricing_snapshots enable row level security;

create policy "Authenticated users can read dispatch runs" on public.mobility_dispatch_runs for select to authenticated using (true);
create policy "Authenticated users can insert dispatch runs" on public.mobility_dispatch_runs for insert to authenticated with check (true);
create policy "Authenticated users can update dispatch runs" on public.mobility_dispatch_runs for update to authenticated using (true);

create policy "Authenticated users can read driver scores" on public.mobility_driver_scores for select to authenticated using (true);
create policy "Authenticated users can insert driver scores" on public.mobility_driver_scores for insert to authenticated with check (true);

create policy "Authenticated users can read driver stats" on public.mobility_driver_stats for select to authenticated using (true);
create policy "Authenticated users can insert driver stats" on public.mobility_driver_stats for insert to authenticated with check (true);
create policy "Authenticated users can update driver stats" on public.mobility_driver_stats for update to authenticated using (true);

create policy "Authenticated users can read pricing snapshots" on public.mobility_pricing_snapshots for select to authenticated using (true);
create policy "Authenticated users can insert pricing snapshots" on public.mobility_pricing_snapshots for insert to authenticated with check (true);
