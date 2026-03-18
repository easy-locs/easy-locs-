
-- Step 136: Driver / Taxi / Orders / Locations / Addresses / Tracking tables

create table if not exists public.service_profiles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique,
  workspace_id uuid,
  profile_type text not null,
  display_name text,
  phone text,
  avatar_url text,
  is_active boolean default true,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index if not exists idx_service_profiles_user on public.service_profiles(user_id);

create table if not exists public.driver_profiles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique,
  workspace_id uuid,
  service_mode text not null default 'delivery',
  vehicle_type text,
  plate_number text,
  is_verified boolean default false,
  is_online boolean default false,
  is_available boolean default false,
  current_status text default 'offline',
  rating numeric default 5,
  jobs_completed integer default 0,
  last_seen_at timestamptz,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index if not exists idx_driver_profiles_user on public.driver_profiles(user_id);
create index if not exists idx_driver_profiles_service_mode on public.driver_profiles(service_mode, is_online, is_available);

create table if not exists public.driver_locations (
  id uuid primary key default gen_random_uuid(),
  driver_id uuid not null references public.driver_profiles(id) on delete cascade,
  lat numeric not null,
  lng numeric not null,
  accuracy_m numeric,
  heading numeric,
  speed_kmh numeric,
  service_mode text,
  recorded_at timestamptz default now()
);

create index if not exists idx_driver_locations_driver on public.driver_locations(driver_id, recorded_at desc);

create table if not exists public.saved_addresses (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  label text not null,
  full_address text not null,
  building text,
  unit_number text,
  area text,
  city text default 'Dubai',
  country_code text default 'AE',
  lat numeric,
  lng numeric,
  delivery_notes text,
  is_default boolean default false,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index if not exists idx_saved_addresses_user on public.saved_addresses(user_id, created_at desc);

create table if not exists public.orders (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid,
  customer_user_id uuid not null,
  merchant_profile_id uuid,
  order_type text not null default 'food_delivery',
  service_mode text not null default 'delivery',
  status text default 'draft',
  currency text default 'AED',
  subtotal numeric default 0,
  delivery_fee numeric default 0,
  service_fee numeric default 0,
  total_amount numeric default 0,
  pickup_address_id uuid references public.saved_addresses(id) on delete set null,
  dropoff_address_id uuid references public.saved_addresses(id) on delete set null,
  notes text,
  assigned_driver_user_id uuid,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  completed_at timestamptz
);

create index if not exists idx_orders_customer on public.orders(customer_user_id, created_at desc);
create index if not exists idx_orders_workspace on public.orders(workspace_id, created_at desc);

create table if not exists public.order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  menu_item_id uuid,
  item_name text not null,
  unit_price numeric not null default 0,
  quantity integer not null default 1,
  total_price numeric not null default 0,
  notes text,
  created_at timestamptz default now()
);

create index if not exists idx_order_items_order on public.order_items(order_id, created_at asc);

create table if not exists public.taxi_ride_requests (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null unique references public.orders(id) on delete cascade,
  rider_user_id uuid not null,
  pickup_label text not null,
  dropoff_label text not null,
  pickup_lat numeric,
  pickup_lng numeric,
  dropoff_lat numeric,
  dropoff_lng numeric,
  estimated_distance_km numeric,
  estimated_duration_min integer,
  vehicle_preference text,
  status text default 'searching',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists public.live_tracking_sessions (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid,
  context_type text not null,
  context_id uuid not null,
  driver_id uuid references public.driver_profiles(id) on delete set null,
  customer_user_id uuid,
  merchant_profile_id uuid,
  status text default 'active',
  started_at timestamptz default now(),
  ended_at timestamptz
);

create index if not exists idx_live_tracking_context on public.live_tracking_sessions(context_type, context_id);

create table if not exists public.live_tracking_points (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.live_tracking_sessions(id) on delete cascade,
  lat numeric not null,
  lng numeric not null,
  accuracy_m numeric,
  heading numeric,
  speed_kmh numeric,
  source text default 'device',
  recorded_at timestamptz default now()
);

create index if not exists idx_live_tracking_points_session on public.live_tracking_points(session_id, recorded_at desc);

-- Enable RLS
alter table public.service_profiles enable row level security;
alter table public.driver_profiles enable row level security;
alter table public.driver_locations enable row level security;
alter table public.saved_addresses enable row level security;
alter table public.orders enable row level security;
alter table public.order_items enable row level security;
alter table public.taxi_ride_requests enable row level security;
alter table public.live_tracking_sessions enable row level security;
alter table public.live_tracking_points enable row level security;

-- Enable realtime for live tracking
ALTER PUBLICATION supabase_realtime ADD TABLE public.orders;
ALTER PUBLICATION supabase_realtime ADD TABLE public.dispatch_jobs;
ALTER PUBLICATION supabase_realtime ADD TABLE public.dispatch_bids;
ALTER PUBLICATION supabase_realtime ADD TABLE public.live_tracking_points;
ALTER PUBLICATION supabase_realtime ADD TABLE public.driver_locations;

-- RLS Policies
create policy "service_profiles_select_self_or_workspace" on public.service_profiles for select to authenticated using (user_id = auth.uid() or (workspace_id is not null and public.is_workspace_member(workspace_id)));
create policy "service_profiles_insert_self" on public.service_profiles for insert to authenticated with check (user_id = auth.uid());
create policy "service_profiles_update_self_or_workspace" on public.service_profiles for update to authenticated using (user_id = auth.uid() or (workspace_id is not null and public.is_workspace_member(workspace_id))) with check (user_id = auth.uid() or (workspace_id is not null and public.is_workspace_member(workspace_id)));

create policy "driver_profiles_select_auth" on public.driver_profiles for select to authenticated using (user_id = auth.uid() or (workspace_id is not null and public.is_workspace_member(workspace_id)) or is_online = true);
create policy "driver_profiles_insert_self" on public.driver_profiles for insert to authenticated with check (user_id = auth.uid());
create policy "driver_profiles_update_self_or_workspace" on public.driver_profiles for update to authenticated using (user_id = auth.uid() or (workspace_id is not null and public.has_workspace_role(workspace_id, array['owner','admin','ops']))) with check (user_id = auth.uid() or (workspace_id is not null and public.has_workspace_role(workspace_id, array['owner','admin','ops'])));

create policy "driver_locations_select_auth" on public.driver_locations for select to authenticated using (exists (select 1 from public.driver_profiles dp where dp.id = driver_locations.driver_id and (dp.user_id = auth.uid() or dp.is_online = true or (dp.workspace_id is not null and public.is_workspace_member(dp.workspace_id)))));
create policy "driver_locations_insert_self" on public.driver_locations for insert to authenticated with check (exists (select 1 from public.driver_profiles dp where dp.id = driver_locations.driver_id and dp.user_id = auth.uid()));

create policy "saved_addresses_select_self" on public.saved_addresses for select to authenticated using (user_id = auth.uid());
create policy "saved_addresses_insert_self" on public.saved_addresses for insert to authenticated with check (user_id = auth.uid());
create policy "saved_addresses_update_self" on public.saved_addresses for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

create policy "orders_select_relevant" on public.orders for select to authenticated using (customer_user_id = auth.uid() or assigned_driver_user_id = auth.uid() or (workspace_id is not null and public.is_workspace_member(workspace_id)));
create policy "orders_insert_customer_or_workspace" on public.orders for insert to authenticated with check (customer_user_id = auth.uid() or (workspace_id is not null and public.is_workspace_member(workspace_id)));
create policy "orders_update_relevant" on public.orders for update to authenticated using (customer_user_id = auth.uid() or assigned_driver_user_id = auth.uid() or (workspace_id is not null and public.is_workspace_member(workspace_id))) with check (customer_user_id = auth.uid() or assigned_driver_user_id = auth.uid() or (workspace_id is not null and public.is_workspace_member(workspace_id)));

create policy "order_items_select_relevant" on public.order_items for select to authenticated using (exists (select 1 from public.orders o where o.id = order_items.order_id and (o.customer_user_id = auth.uid() or o.assigned_driver_user_id = auth.uid() or (o.workspace_id is not null and public.is_workspace_member(o.workspace_id)))));
create policy "order_items_insert_relevant" on public.order_items for insert to authenticated with check (exists (select 1 from public.orders o where o.id = order_items.order_id and (o.customer_user_id = auth.uid() or (o.workspace_id is not null and public.is_workspace_member(o.workspace_id)))));

create policy "taxi_ride_requests_select_relevant" on public.taxi_ride_requests for select to authenticated using (rider_user_id = auth.uid() or exists (select 1 from public.orders o where o.id = taxi_ride_requests.order_id and (o.assigned_driver_user_id = auth.uid() or (o.workspace_id is not null and public.is_workspace_member(o.workspace_id)))));
create policy "taxi_ride_requests_insert_relevant" on public.taxi_ride_requests for insert to authenticated with check (rider_user_id = auth.uid());
create policy "taxi_ride_requests_update_relevant" on public.taxi_ride_requests for update to authenticated using (rider_user_id = auth.uid() or exists (select 1 from public.orders o where o.id = taxi_ride_requests.order_id and (o.assigned_driver_user_id = auth.uid() or (o.workspace_id is not null and public.is_workspace_member(o.workspace_id))))) with check (rider_user_id = auth.uid() or exists (select 1 from public.orders o where o.id = taxi_ride_requests.order_id and (o.assigned_driver_user_id = auth.uid() or (o.workspace_id is not null and public.is_workspace_member(o.workspace_id)))));

create policy "live_tracking_sessions_select_relevant" on public.live_tracking_sessions for select to authenticated using (customer_user_id = auth.uid() or exists (select 1 from public.driver_profiles dp where dp.id = live_tracking_sessions.driver_id and dp.user_id = auth.uid()) or (workspace_id is not null and public.is_workspace_member(workspace_id)));
create policy "live_tracking_sessions_insert_relevant" on public.live_tracking_sessions for insert to authenticated with check (customer_user_id = auth.uid() or exists (select 1 from public.driver_profiles dp where dp.id = live_tracking_sessions.driver_id and dp.user_id = auth.uid()) or (workspace_id is not null and public.is_workspace_member(workspace_id)));
create policy "live_tracking_sessions_update_relevant" on public.live_tracking_sessions for update to authenticated using (customer_user_id = auth.uid() or exists (select 1 from public.driver_profiles dp where dp.id = live_tracking_sessions.driver_id and dp.user_id = auth.uid()) or (workspace_id is not null and public.is_workspace_member(workspace_id))) with check (customer_user_id = auth.uid() or exists (select 1 from public.driver_profiles dp where dp.id = live_tracking_sessions.driver_id and dp.user_id = auth.uid()) or (workspace_id is not null and public.is_workspace_member(workspace_id)));

create policy "live_tracking_points_select_relevant" on public.live_tracking_points for select to authenticated using (exists (select 1 from public.live_tracking_sessions s left join public.driver_profiles dp on dp.id = s.driver_id where s.id = live_tracking_points.session_id and (s.customer_user_id = auth.uid() or dp.user_id = auth.uid() or (s.workspace_id is not null and public.is_workspace_member(s.workspace_id)))));
create policy "live_tracking_points_insert_relevant" on public.live_tracking_points for insert to authenticated with check (exists (select 1 from public.live_tracking_sessions s left join public.driver_profiles dp on dp.id = s.driver_id where s.id = live_tracking_points.session_id and (s.customer_user_id = auth.uid() or dp.user_id = auth.uid() or (s.workspace_id is not null and public.is_workspace_member(s.workspace_id)))));

-- Updated_at triggers
drop trigger if exists trg_service_profiles_updated_at on public.service_profiles;
create trigger trg_service_profiles_updated_at before update on public.service_profiles for each row execute function public.handle_updated_at();

drop trigger if exists trg_driver_profiles_updated_at on public.driver_profiles;
create trigger trg_driver_profiles_updated_at before update on public.driver_profiles for each row execute function public.handle_updated_at();

drop trigger if exists trg_saved_addresses_updated_at on public.saved_addresses;
create trigger trg_saved_addresses_updated_at before update on public.saved_addresses for each row execute function public.handle_updated_at();

drop trigger if exists trg_orders_updated_at on public.orders;
create trigger trg_orders_updated_at before update on public.orders for each row execute function public.handle_updated_at();

drop trigger if exists trg_taxi_ride_requests_updated_at on public.taxi_ride_requests;
create trigger trg_taxi_ride_requests_updated_at before update on public.taxi_ride_requests for each row execute function public.handle_updated_at();
