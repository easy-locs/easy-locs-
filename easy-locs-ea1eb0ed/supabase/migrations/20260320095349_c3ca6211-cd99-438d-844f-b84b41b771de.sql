
create table if not exists public.listing_views (
  id text primary key,
  listing_id text not null,
  user_id uuid references auth.users(id) on delete set null,
  orbit_id text,
  source text,
  created_at timestamptz not null default now()
);

create index if not exists idx_listing_views_listing_id
  on public.listing_views(listing_id);

create index if not exists idx_listing_views_created_at
  on public.listing_views(created_at desc);

create table if not exists public.seller_kpi_snapshots (
  id text primary key,
  owner_orbit_id text not null,
  total_listings int not null default 0,
  published_listings int not null default 0,
  total_bookings int not null default 0,
  confirmed_bookings int not null default 0,
  completed_bookings int not null default 0,
  gross_revenue numeric not null default 0,
  pending_rent_amount numeric not null default 0,
  paid_rent_amount numeric not null default 0,
  created_at timestamptz not null default now()
);

create index if not exists idx_seller_kpi_snapshots_owner_orbit_id
  on public.seller_kpi_snapshots(owner_orbit_id);

alter table public.listing_views enable row level security;
alter table public.seller_kpi_snapshots enable row level security;

create policy "public_insert_listing_views"
on public.listing_views for insert
with check (true);

create policy "owner_read_own_kpi_snapshots"
on public.seller_kpi_snapshots for select
using (
  exists (
    select 1 from public.orbit_profiles_v2 op
    where op.id = auth.uid() and op.orbit_id = owner_orbit_id
  )
);
