
create table if not exists public.admin_alerts (
  id uuid primary key default gen_random_uuid(),
  alert_type text not null,
  severity text not null default 'medium',
  title text not null,
  body text,
  context_type text,
  context_id uuid,
  status text not null default 'open',
  metadata_json jsonb default '{}'::jsonb,
  created_at timestamptz default now(),
  resolved_at timestamptz
);

create index if not exists idx_admin_alerts_status on public.admin_alerts(status);

create table if not exists public.user_wallet_credits (
  user_id uuid primary key,
  credits_amount numeric default 0,
  currency text default 'AED',
  updated_at timestamptz default now()
);

create table if not exists public.wallet_credit_transactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  amount numeric not null,
  direction text not null,
  reason text,
  context_type text,
  context_id uuid,
  created_at timestamptz default now()
);

create index if not exists idx_wallet_credit_transactions_user on public.wallet_credit_transactions(user_id);

create table if not exists public.city_supply_balancer_logs (
  id uuid primary key default gen_random_uuid(),
  city text,
  zone_key text,
  action_type text,
  target_driver_count integer default 0,
  current_driver_count integer default 0,
  suggested_driver_ids uuid[] default '{}',
  metadata_json jsonb default '{}'::jsonb,
  created_at timestamptz default now()
);

-- RLS
alter table public.admin_alerts enable row level security;
alter table public.user_wallet_credits enable row level security;
alter table public.wallet_credit_transactions enable row level security;
alter table public.city_supply_balancer_logs enable row level security;

create policy "alerts_select_auth" on public.admin_alerts for select to authenticated using (true);
create policy "alerts_insert_auth" on public.admin_alerts for insert to authenticated with check (true);
create policy "alerts_update_auth" on public.admin_alerts for update to authenticated using (true);
create policy "credits_select_own" on public.user_wallet_credits for select using (auth.uid() = user_id);
create policy "credits_upsert_own" on public.user_wallet_credits for insert with check (auth.uid() = user_id);
create policy "credits_update_own" on public.user_wallet_credits for update using (auth.uid() = user_id);
create policy "credit_tx_select_own" on public.wallet_credit_transactions for select using (auth.uid() = user_id);
create policy "credit_tx_insert_own" on public.wallet_credit_transactions for insert with check (auth.uid() = user_id);
create policy "balancer_select_auth" on public.city_supply_balancer_logs for select to authenticated using (true);
create policy "balancer_insert_auth" on public.city_supply_balancer_logs for insert to authenticated with check (true);

-- Enable realtime for admin_alerts
ALTER PUBLICATION supabase_realtime ADD TABLE public.admin_alerts;
