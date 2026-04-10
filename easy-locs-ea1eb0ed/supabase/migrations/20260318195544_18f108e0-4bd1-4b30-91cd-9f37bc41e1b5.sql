
-- Orbit Identity
create table if not exists public.orbit_identity_profiles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid unique,
  workspace_id uuid,
  public_handle text unique,
  display_name text,
  avatar_url text,
  anonymity_mode boolean default false,
  discoverable boolean default true,
  verification_level text default 'basic',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists public.orbit_device_keys (
  id uuid primary key default gen_random_uuid(),
  identity_id uuid not null references public.orbit_identity_profiles(id) on delete cascade,
  device_label text,
  public_key text not null,
  key_algo text default 'x25519',
  is_active boolean default true,
  created_at timestamptz default now(),
  revoked_at timestamptz
);
create index if not exists idx_orbit_device_keys_identity on public.orbit_device_keys(identity_id);

create table if not exists public.orbit_session_tokens (
  id uuid primary key default gen_random_uuid(),
  identity_id uuid not null references public.orbit_identity_profiles(id) on delete cascade,
  token_hash text not null,
  expires_at timestamptz not null,
  created_at timestamptz default now(),
  revoked_at timestamptz
);
create index if not exists idx_orbit_session_tokens_identity on public.orbit_session_tokens(identity_id);

-- Wallet Accounts
create table if not exists public.wallet_accounts (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid,
  owner_user_id uuid,
  owner_type text default 'user',
  currency text not null,
  account_type text default 'fiat',
  balance numeric default 0,
  available_balance numeric default 0,
  pending_balance numeric default 0,
  external_ref text,
  status text default 'active',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);
create index if not exists idx_wallet_accounts_owner on public.wallet_accounts(owner_user_id, owner_type);

create table if not exists public.wallet_ledger_entries (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid,
  wallet_account_id uuid not null references public.wallet_accounts(id) on delete cascade,
  direction text not null,
  amount numeric not null,
  currency text not null,
  entry_type text not null,
  reference_type text,
  reference_id uuid,
  external_txn_id text,
  status text default 'posted',
  metadata jsonb default '{}'::jsonb,
  created_at timestamptz default now()
);
create index if not exists idx_wallet_ledger_account on public.wallet_ledger_entries(wallet_account_id, created_at desc);

create table if not exists public.wallet_transfers (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid,
  from_wallet_id uuid references public.wallet_accounts(id) on delete set null,
  to_wallet_id uuid references public.wallet_accounts(id) on delete set null,
  amount numeric not null,
  currency text not null,
  transfer_type text default 'internal',
  status text default 'pending',
  reference_type text,
  reference_id uuid,
  metadata jsonb default '{}'::jsonb,
  created_at timestamptz default now(),
  completed_at timestamptz
);
create index if not exists idx_wallet_transfers_status on public.wallet_transfers(status, created_at desc);

-- Dispatch Prediction
create table if not exists public.dispatch_prediction_jobs (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid,
  context_type text not null,
  context_id uuid not null,
  buyer_id uuid,
  seller_id uuid,
  predicted_driver_count integer default 0,
  predicted_eta_minutes integer,
  predicted_fee numeric,
  confidence numeric,
  status text default 'predicted',
  metadata jsonb default '{}'::jsonb,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);
create index if not exists idx_dispatch_prediction_context on public.dispatch_prediction_jobs(context_type, context_id);

create table if not exists public.dispatch_candidate_drivers (
  id uuid primary key default gen_random_uuid(),
  prediction_job_id uuid not null references public.dispatch_prediction_jobs(id) on delete cascade,
  driver_id uuid not null,
  distance_km numeric,
  eta_minutes integer,
  score numeric,
  status text default 'candidate',
  created_at timestamptz default now()
);
create index if not exists idx_dispatch_candidate_job on public.dispatch_candidate_drivers(prediction_job_id);

-- Merchant Onboarding
create table if not exists public.merchant_onboarding_sources (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid,
  source_type text not null,
  source_name text,
  source_external_id text,
  payload jsonb default '{}'::jsonb,
  status text default 'received',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists public.merchant_onboarding_profiles (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid,
  source_id uuid references public.merchant_onboarding_sources(id) on delete set null,
  merchant_name text not null,
  legal_name text,
  contact_name text,
  phone text,
  email text,
  cuisine_type text,
  city text,
  area text,
  delivery_radius_km numeric,
  onboarding_status text default 'draft',
  activation_mode text default 'manual',
  metadata jsonb default '{}'::jsonb,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);
create index if not exists idx_merchant_onboarding_profiles_status on public.merchant_onboarding_profiles(onboarding_status, created_at desc);

create table if not exists public.merchant_menu_import_items (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.merchant_onboarding_profiles(id) on delete cascade,
  category_name text,
  item_name text not null,
  item_description text,
  price numeric,
  currency text default 'AED',
  image_url text,
  normalized boolean default false,
  published boolean default false,
  created_at timestamptz default now()
);
create index if not exists idx_merchant_menu_import_profile on public.merchant_menu_import_items(profile_id);

create table if not exists public.merchant_activation_events (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.merchant_onboarding_profiles(id) on delete cascade,
  event_type text not null,
  payload jsonb default '{}'::jsonb,
  created_at timestamptz default now()
);

-- RLS
alter table public.orbit_identity_profiles enable row level security;
alter table public.orbit_device_keys enable row level security;
alter table public.orbit_session_tokens enable row level security;
alter table public.wallet_accounts enable row level security;
alter table public.wallet_ledger_entries enable row level security;
alter table public.wallet_transfers enable row level security;
alter table public.dispatch_prediction_jobs enable row level security;
alter table public.dispatch_candidate_drivers enable row level security;
alter table public.merchant_onboarding_sources enable row level security;
alter table public.merchant_onboarding_profiles enable row level security;
alter table public.merchant_menu_import_items enable row level security;
alter table public.merchant_activation_events enable row level security;

-- RLS Policies
create policy "orbit_identity_profiles_select_auth" on public.orbit_identity_profiles for select to authenticated using (true);
create policy "orbit_identity_profiles_insert_auth" on public.orbit_identity_profiles for insert to authenticated with check (true);
create policy "orbit_identity_profiles_update_auth" on public.orbit_identity_profiles for update to authenticated using (true) with check (true);
create policy "orbit_device_keys_select_auth" on public.orbit_device_keys for select to authenticated using (true);
create policy "orbit_device_keys_insert_auth" on public.orbit_device_keys for insert to authenticated with check (true);
create policy "wallet_accounts_select_auth" on public.wallet_accounts for select to authenticated using (true);
create policy "wallet_accounts_insert_auth" on public.wallet_accounts for insert to authenticated with check (true);
create policy "wallet_accounts_update_auth" on public.wallet_accounts for update to authenticated using (true) with check (true);
create policy "wallet_ledger_entries_select_auth" on public.wallet_ledger_entries for select to authenticated using (true);
create policy "wallet_ledger_entries_insert_auth" on public.wallet_ledger_entries for insert to authenticated with check (true);
create policy "wallet_transfers_select_auth" on public.wallet_transfers for select to authenticated using (true);
create policy "wallet_transfers_insert_auth" on public.wallet_transfers for insert to authenticated with check (true);
create policy "wallet_transfers_update_auth" on public.wallet_transfers for update to authenticated using (true) with check (true);
create policy "dispatch_prediction_jobs_select_auth" on public.dispatch_prediction_jobs for select to authenticated using (true);
create policy "dispatch_prediction_jobs_insert_auth" on public.dispatch_prediction_jobs for insert to authenticated with check (true);
create policy "dispatch_prediction_jobs_update_auth" on public.dispatch_prediction_jobs for update to authenticated using (true) with check (true);
create policy "dispatch_candidate_drivers_select_auth" on public.dispatch_candidate_drivers for select to authenticated using (true);
create policy "dispatch_candidate_drivers_insert_auth" on public.dispatch_candidate_drivers for insert to authenticated with check (true);
create policy "dispatch_candidate_drivers_update_auth" on public.dispatch_candidate_drivers for update to authenticated using (true) with check (true);
create policy "merchant_onboarding_sources_select_auth" on public.merchant_onboarding_sources for select to authenticated using (true);
create policy "merchant_onboarding_sources_insert_auth" on public.merchant_onboarding_sources for insert to authenticated with check (true);
create policy "merchant_onboarding_sources_update_auth" on public.merchant_onboarding_sources for update to authenticated using (true) with check (true);
create policy "merchant_onboarding_profiles_select_auth" on public.merchant_onboarding_profiles for select to authenticated using (true);
create policy "merchant_onboarding_profiles_insert_auth" on public.merchant_onboarding_profiles for insert to authenticated with check (true);
create policy "merchant_onboarding_profiles_update_auth" on public.merchant_onboarding_profiles for update to authenticated using (true) with check (true);
create policy "merchant_menu_import_items_select_auth" on public.merchant_menu_import_items for select to authenticated using (true);
create policy "merchant_menu_import_items_insert_auth" on public.merchant_menu_import_items for insert to authenticated with check (true);
create policy "merchant_menu_import_items_update_auth" on public.merchant_menu_import_items for update to authenticated using (true) with check (true);
create policy "merchant_activation_events_select_auth" on public.merchant_activation_events for select to authenticated using (true);
create policy "merchant_activation_events_insert_auth" on public.merchant_activation_events for insert to authenticated with check (true);

-- Updated_at triggers
drop trigger if exists trg_orbit_identity_profiles_updated_at on public.orbit_identity_profiles;
create trigger trg_orbit_identity_profiles_updated_at before update on public.orbit_identity_profiles for each row execute function public.handle_updated_at();

drop trigger if exists trg_wallet_accounts_updated_at on public.wallet_accounts;
create trigger trg_wallet_accounts_updated_at before update on public.wallet_accounts for each row execute function public.handle_updated_at();

drop trigger if exists trg_dispatch_prediction_jobs_updated_at on public.dispatch_prediction_jobs;
create trigger trg_dispatch_prediction_jobs_updated_at before update on public.dispatch_prediction_jobs for each row execute function public.handle_updated_at();

drop trigger if exists trg_merchant_onboarding_sources_updated_at on public.merchant_onboarding_sources;
create trigger trg_merchant_onboarding_sources_updated_at before update on public.merchant_onboarding_sources for each row execute function public.handle_updated_at();

drop trigger if exists trg_merchant_onboarding_profiles_updated_at on public.merchant_onboarding_profiles;
create trigger trg_merchant_onboarding_profiles_updated_at before update on public.merchant_onboarding_profiles for each row execute function public.handle_updated_at();

-- Enable realtime for wallet_accounts
ALTER PUBLICATION supabase_realtime ADD TABLE public.wallet_accounts;
