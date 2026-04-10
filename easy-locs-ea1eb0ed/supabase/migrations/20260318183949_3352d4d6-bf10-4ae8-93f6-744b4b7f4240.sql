
-- user risk profiles
create table if not exists public.user_risk_profiles (
  user_id uuid primary key,
  risk_score numeric default 0,
  fraud_flags jsonb default '[]'::jsonb,
  last_updated timestamptz default now()
);

-- fraud events
create table if not exists public.fraud_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid,
  ride_request_id uuid,
  event_type text,
  severity numeric default 1,
  metadata jsonb,
  created_at timestamptz default now()
);

-- user subscriptions
create table if not exists public.user_subscriptions (
  user_id uuid primary key,
  plan text default 'free',
  status text default 'active',
  started_at timestamptz default now(),
  expires_at timestamptz
);

-- driver positioning suggestions
create table if not exists public.driver_positioning (
  id uuid primary key default gen_random_uuid(),
  driver_id uuid,
  suggested_lat numeric,
  suggested_lng numeric,
  demand_score numeric,
  reason text,
  created_at timestamptz default now()
);

-- ride ETA snapshots
create table if not exists public.ride_eta_snapshots (
  id uuid primary key default gen_random_uuid(),
  ride_request_id uuid not null,
  driver_id uuid,
  eta_minutes numeric,
  distance_km numeric,
  traffic_factor numeric default 1,
  recorded_at timestamptz default now()
);

create index if not exists idx_ride_eta_snapshots_request
on public.ride_eta_snapshots(ride_request_id);

-- driver clusters
create table if not exists public.driver_clusters (
  id uuid primary key default gen_random_uuid(),
  city text,
  zone_key text not null,
  center_lat numeric,
  center_lng numeric,
  driver_count integer default 0,
  demand_score numeric default 0,
  cluster_score numeric default 0,
  updated_at timestamptz default now()
);

create unique index if not exists uq_driver_clusters_zone_key
on public.driver_clusters(zone_key);

-- ops live metrics
create table if not exists public.ops_live_metrics (
  id uuid primary key default gen_random_uuid(),
  metric_key text not null,
  metric_value numeric default 0,
  context jsonb default '{}'::jsonb,
  recorded_at timestamptz default now()
);

create index if not exists idx_ops_live_metrics_key
on public.ops_live_metrics(metric_key);

-- RLS
alter table public.user_risk_profiles enable row level security;
alter table public.fraud_events enable row level security;
alter table public.user_subscriptions enable row level security;
alter table public.driver_positioning enable row level security;
alter table public.ride_eta_snapshots enable row level security;
alter table public.driver_clusters enable row level security;
alter table public.ops_live_metrics enable row level security;

-- RLS policies
create policy "risk_profiles_select_own" on public.user_risk_profiles for select using (auth.uid() = user_id);
create policy "fraud_events_select_own" on public.fraud_events for select using (auth.uid() = user_id);
create policy "subscriptions_select_own" on public.user_subscriptions for select using (auth.uid() = user_id);
create policy "subscriptions_upsert_own" on public.user_subscriptions for insert with check (auth.uid() = user_id);
create policy "subscriptions_update_own" on public.user_subscriptions for update using (auth.uid() = user_id);
create policy "positioning_select_own" on public.driver_positioning for select using (auth.uid() = driver_id);
create policy "positioning_insert_own" on public.driver_positioning for insert with check (auth.uid() = driver_id);
create policy "eta_snapshots_select_auth" on public.ride_eta_snapshots for select to authenticated using (true);
create policy "eta_snapshots_insert_auth" on public.ride_eta_snapshots for insert to authenticated with check (true);
create policy "clusters_select_auth" on public.driver_clusters for select to authenticated using (true);
create policy "clusters_upsert_auth" on public.driver_clusters for insert to authenticated with check (true);
create policy "clusters_update_auth" on public.driver_clusters for update to authenticated using (true);
create policy "ops_metrics_select_auth" on public.ops_live_metrics for select to authenticated using (true);
create policy "ops_metrics_insert_auth" on public.ops_live_metrics for insert to authenticated with check (true);
