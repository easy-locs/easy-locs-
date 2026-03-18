
-- Public storefront settings
create table if not exists public.public_storefront_settings (
  id uuid primary key default gen_random_uuid(),
  merchant_profile_id uuid not null unique references public.merchant_onboarding_profiles(id) on delete cascade,
  is_public boolean default true,
  public_slug text unique,
  seo_title text,
  seo_description text,
  cover_image_url text,
  logo_url text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Guest checkout sessions (uses storefront_carts)
create table if not exists public.guest_checkout_sessions (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid,
  guest_id text not null,
  cart_id uuid references public.storefront_carts(id) on delete set null,
  phone text,
  status text default 'started',
  expires_at timestamptz,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);
create index if not exists idx_guest_checkout_sessions_guest on public.guest_checkout_sessions(guest_id, created_at desc);

-- Phone OTP sessions
create table if not exists public.phone_otp_sessions (
  id uuid primary key default gen_random_uuid(),
  phone text not null,
  otp_code text not null,
  status text default 'pending',
  attempts integer default 0,
  expires_at timestamptz not null,
  guest_id text,
  user_id uuid,
  created_at timestamptz default now(),
  verified_at timestamptz
);
create index if not exists idx_phone_otp_phone on public.phone_otp_sessions(phone, created_at desc);

-- Payment intents
create table if not exists public.payment_intents (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid,
  order_id uuid references public.orders(id) on delete set null,
  cart_id uuid references public.storefront_carts(id) on delete set null,
  user_id uuid,
  guest_id text,
  provider text not null default 'manual',
  currency text default 'AED',
  amount numeric not null default 0,
  status text default 'created',
  external_intent_id text,
  payment_method_type text,
  metadata jsonb default '{}'::jsonb,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  paid_at timestamptz
);
create index if not exists idx_payment_intents_order on public.payment_intents(order_id, created_at desc);

-- Merchant coverage areas (no ghost_kitchens FK)
create table if not exists public.merchant_coverage_areas (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid,
  merchant_profile_id uuid not null references public.merchant_onboarding_profiles(id) on delete cascade,
  kitchen_id uuid,
  area_name text not null,
  city text default 'Dubai',
  min_order_amount numeric default 0,
  delivery_fee numeric default 0,
  estimated_eta_min integer default 30,
  is_active boolean default true,
  polygon jsonb default '[]'::jsonb,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);
create index if not exists idx_merchant_coverage_areas_merchant on public.merchant_coverage_areas(merchant_profile_id, created_at desc);

-- Delivery ETA predictions
create table if not exists public.delivery_eta_predictions (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid,
  order_id uuid references public.orders(id) on delete cascade,
  dispatch_job_id uuid references public.dispatch_jobs(id) on delete set null,
  merchant_profile_id uuid references public.merchant_onboarding_profiles(id) on delete set null,
  driver_user_id uuid,
  area text,
  prep_time_min integer default 0,
  travel_time_min integer default 0,
  queue_time_min integer default 0,
  total_eta_min integer default 0,
  confidence numeric default 0.5,
  created_at timestamptz default now()
);
create index if not exists idx_delivery_eta_predictions_order on public.delivery_eta_predictions(order_id, created_at desc);

-- Abandoned cart events
create table if not exists public.abandoned_cart_events (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid,
  cart_id uuid not null references public.storefront_carts(id) on delete cascade,
  customer_user_id uuid,
  guest_id text,
  subtotal numeric default 0,
  item_count integer default 0,
  status text default 'detected',
  created_at timestamptz default now(),
  converted_at timestamptz
);
create index if not exists idx_abandoned_cart_events_cart on public.abandoned_cart_events(cart_id, created_at desc);

-- Loyalty accounts
create table if not exists public.loyalty_accounts (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid,
  user_id uuid,
  guest_id text,
  points_balance integer default 0,
  tier text default 'bronze',
  lifetime_points integer default 0,
  total_cashback numeric default 0,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique(workspace_id, user_id),
  unique(workspace_id, guest_id)
);

-- Loyalty ledger
create table if not exists public.loyalty_ledger (
  id uuid primary key default gen_random_uuid(),
  loyalty_account_id uuid not null references public.loyalty_accounts(id) on delete cascade,
  entry_type text not null,
  points integer default 0,
  cashback_amount numeric default 0,
  reference_type text,
  reference_id uuid,
  metadata jsonb default '{}'::jsonb,
  created_at timestamptz default now()
);
create index if not exists idx_loyalty_ledger_account on public.loyalty_ledger(loyalty_account_id, created_at desc);

-- Enable RLS
alter table public.public_storefront_settings enable row level security;
alter table public.guest_checkout_sessions enable row level security;
alter table public.phone_otp_sessions enable row level security;
alter table public.payment_intents enable row level security;
alter table public.merchant_coverage_areas enable row level security;
alter table public.delivery_eta_predictions enable row level security;
alter table public.abandoned_cart_events enable row level security;
alter table public.loyalty_accounts enable row level security;
alter table public.loyalty_ledger enable row level security;

-- RLS: public_storefront_settings (public read for is_public=true)
create policy "public_storefront_settings_anon_read" on public.public_storefront_settings for select to anon using (is_public = true);
create policy "public_storefront_settings_auth_read" on public.public_storefront_settings for select to authenticated using (
  is_public = true or exists (
    select 1 from public.merchant_onboarding_profiles mp
    where mp.id = public_storefront_settings.merchant_profile_id
      and mp.workspace_id is not null and public.is_workspace_member(mp.workspace_id)
  )
);
create policy "public_storefront_settings_modify" on public.public_storefront_settings for all to authenticated using (
  exists (select 1 from public.merchant_onboarding_profiles mp where mp.id = public_storefront_settings.merchant_profile_id and public.is_workspace_member(mp.workspace_id))
) with check (
  exists (select 1 from public.merchant_onboarding_profiles mp where mp.id = public_storefront_settings.merchant_profile_id and public.is_workspace_member(mp.workspace_id))
);

-- RLS: guest_checkout_sessions
create policy "guest_checkout_sessions_select" on public.guest_checkout_sessions for select to authenticated using (workspace_id is null or public.is_workspace_member(workspace_id));
create policy "guest_checkout_sessions_insert" on public.guest_checkout_sessions for insert to authenticated with check (true);

-- RLS: phone_otp_sessions
create policy "phone_otp_sessions_select" on public.phone_otp_sessions for select to authenticated using (true);
create policy "phone_otp_sessions_insert" on public.phone_otp_sessions for insert to authenticated with check (true);
create policy "phone_otp_sessions_update" on public.phone_otp_sessions for update to authenticated using (true) with check (true);

-- RLS: payment_intents
create policy "payment_intents_select" on public.payment_intents for select to authenticated using (user_id = auth.uid() or (workspace_id is not null and public.is_workspace_member(workspace_id)));
create policy "payment_intents_insert" on public.payment_intents for insert to authenticated with check (user_id = auth.uid() or (workspace_id is not null and public.is_workspace_member(workspace_id)));
create policy "payment_intents_update" on public.payment_intents for update to authenticated using (user_id = auth.uid() or (workspace_id is not null and public.is_workspace_member(workspace_id))) with check (user_id = auth.uid() or (workspace_id is not null and public.is_workspace_member(workspace_id)));

-- RLS: merchant_coverage_areas
create policy "merchant_coverage_areas_read" on public.merchant_coverage_areas for select to authenticated using (is_active = true or (workspace_id is not null and public.is_workspace_member(workspace_id)));
create policy "merchant_coverage_areas_modify" on public.merchant_coverage_areas for all to authenticated using (workspace_id is not null and public.is_workspace_member(workspace_id)) with check (workspace_id is not null and public.is_workspace_member(workspace_id));

-- RLS: delivery_eta_predictions
create policy "delivery_eta_predictions_read" on public.delivery_eta_predictions for select to authenticated using (
  driver_user_id = auth.uid() or exists (select 1 from public.orders o where o.id = delivery_eta_predictions.order_id and (o.customer_user_id = auth.uid() or (o.workspace_id is not null and public.is_workspace_member(o.workspace_id))))
);
create policy "delivery_eta_predictions_insert" on public.delivery_eta_predictions for insert to authenticated with check (workspace_id is null or public.is_workspace_member(workspace_id));

-- RLS: abandoned_cart_events
create policy "abandoned_cart_events_read" on public.abandoned_cart_events for select to authenticated using (workspace_id is null or public.is_workspace_member(workspace_id));
create policy "abandoned_cart_events_insert" on public.abandoned_cart_events for insert to authenticated with check (workspace_id is null or public.is_workspace_member(workspace_id));
create policy "abandoned_cart_events_update" on public.abandoned_cart_events for update to authenticated using (workspace_id is null or public.is_workspace_member(workspace_id)) with check (workspace_id is null or public.is_workspace_member(workspace_id));

-- RLS: loyalty_accounts
create policy "loyalty_accounts_read" on public.loyalty_accounts for select to authenticated using (user_id = auth.uid() or (workspace_id is not null and public.is_workspace_member(workspace_id)));
create policy "loyalty_accounts_insert" on public.loyalty_accounts for insert to authenticated with check (user_id = auth.uid() or (workspace_id is not null and public.is_workspace_member(workspace_id)));
create policy "loyalty_accounts_update" on public.loyalty_accounts for update to authenticated using (user_id = auth.uid() or (workspace_id is not null and public.is_workspace_member(workspace_id))) with check (user_id = auth.uid() or (workspace_id is not null and public.is_workspace_member(workspace_id)));

-- RLS: loyalty_ledger
create policy "loyalty_ledger_read" on public.loyalty_ledger for select to authenticated using (
  exists (select 1 from public.loyalty_accounts la where la.id = loyalty_ledger.loyalty_account_id and (la.user_id = auth.uid() or (la.workspace_id is not null and public.is_workspace_member(la.workspace_id))))
);
create policy "loyalty_ledger_insert" on public.loyalty_ledger for insert to authenticated with check (
  exists (select 1 from public.loyalty_accounts la where la.id = loyalty_ledger.loyalty_account_id and (la.user_id = auth.uid() or (la.workspace_id is not null and public.is_workspace_member(la.workspace_id))))
);

-- Updated_at triggers
drop trigger if exists trg_public_storefront_settings_updated_at on public.public_storefront_settings;
create trigger trg_public_storefront_settings_updated_at before update on public.public_storefront_settings for each row execute function public.handle_updated_at();

drop trigger if exists trg_guest_checkout_sessions_updated_at on public.guest_checkout_sessions;
create trigger trg_guest_checkout_sessions_updated_at before update on public.guest_checkout_sessions for each row execute function public.handle_updated_at();

drop trigger if exists trg_payment_intents_updated_at on public.payment_intents;
create trigger trg_payment_intents_updated_at before update on public.payment_intents for each row execute function public.handle_updated_at();

drop trigger if exists trg_merchant_coverage_areas_updated_at on public.merchant_coverage_areas;
create trigger trg_merchant_coverage_areas_updated_at before update on public.merchant_coverage_areas for each row execute function public.handle_updated_at();

drop trigger if exists trg_loyalty_accounts_updated_at on public.loyalty_accounts;
create trigger trg_loyalty_accounts_updated_at before update on public.loyalty_accounts for each row execute function public.handle_updated_at();

-- Enable realtime for key tables
ALTER PUBLICATION supabase_realtime ADD TABLE public.payment_intents;
ALTER PUBLICATION supabase_realtime ADD TABLE public.loyalty_accounts;
