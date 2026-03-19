
-- Seed merchants table
create table if not exists public.seed_merchants (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  category text not null,
  subcategory text not null,
  city text not null default 'Dubai',
  area text not null,
  rating numeric(2,1) not null default 4.2,
  review_count integer not null default 0,
  delivery_time_min integer not null default 20,
  delivery_time_max integer not null default 40,
  price_level integer not null default 2,
  cover_image text,
  logo_image text,
  is_open boolean not null default true,
  is_featured boolean not null default false,
  is_active boolean not null default true,
  visibility_score numeric not null default 50,
  tier text not null default 'standard',
  created_at timestamptz not null default now()
);

-- Seed products table
create table if not exists public.seed_products (
  id uuid primary key default gen_random_uuid(),
  merchant_id uuid not null references public.seed_merchants(id) on delete cascade,
  name text not null,
  description text,
  price numeric(10,2) not null,
  category text not null,
  image text,
  is_available boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

-- Indexes
create index if not exists idx_seed_merchants_category on public.seed_merchants(category);
create index if not exists idx_seed_merchants_city on public.seed_merchants(city);
create index if not exists idx_seed_merchants_area on public.seed_merchants(area);
create index if not exists idx_seed_products_merchant_id on public.seed_products(merchant_id);

-- RLS
alter table public.seed_merchants enable row level security;
alter table public.seed_products enable row level security;

-- Public read access (marketplace discovery)
create policy "Anyone can read active seed merchants"
  on public.seed_merchants for select
  to anon, authenticated
  using (is_active = true);

create policy "Anyone can read available seed products"
  on public.seed_products for select
  to anon, authenticated
  using (is_available = true);

-- Authenticated users can insert (for admin seeding)
create policy "Authenticated can insert seed merchants"
  on public.seed_merchants for insert
  to authenticated
  with check (true);

create policy "Authenticated can insert seed products"
  on public.seed_products for insert
  to authenticated
  with check (true);

create policy "Authenticated can update seed merchants"
  on public.seed_merchants for update
  to authenticated
  using (true);

create policy "Authenticated can update seed products"
  on public.seed_products for update
  to authenticated
  using (true);

-- Marketplace listings view
create or replace view public.marketplace_listings as
select
  id, name, category, subcategory, city, area, rating, review_count,
  delivery_time_min, delivery_time_max, price_level,
  cover_image, logo_image, is_open, is_featured, is_active,
  visibility_score, tier, created_at
from public.seed_merchants
where is_active = true;
