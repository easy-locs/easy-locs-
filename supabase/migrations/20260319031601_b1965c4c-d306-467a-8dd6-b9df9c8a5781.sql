
create table if not exists growth_city_pages (
  id uuid primary key default gen_random_uuid(),
  page_type text not null,
  slug text not null unique,
  locale text not null default 'en',
  country_code text not null,
  city text not null,
  vertical text not null,
  title text,
  h1 text,
  description text,
  intro_text text,
  is_published boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists growth_demand_events (
  id uuid primary key default gen_random_uuid(),
  storefront_page_id uuid null,
  merchant_profile_id uuid null,
  city text null,
  country_code text null,
  vertical text null,
  event_type text not null,
  session_id text null,
  user_id uuid null,
  metadata_json jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

alter table merchant_onboarding_profiles
  add column if not exists dedupe_key text null,
  add column if not exists vertical text null,
  add column if not exists website text null,
  add column if not exists rating numeric null,
  add column if not exists review_count integer null,
  add column if not exists latitude numeric null,
  add column if not exists longitude numeric null,
  add column if not exists cover_image_url text null,
  add column if not exists logo_image_url text null,
  add column if not exists activation_score integer null,
  add column if not exists activation_band text null,
  add column if not exists activation_reasons jsonb not null default '[]'::jsonb,
  add column if not exists country text null,
  add column if not exists description text null,
  add column if not exists tags text[] null,
  add column if not exists source_status text null;

create index if not exists idx_growth_city_pages_city_vertical
  on growth_city_pages(country_code, city, vertical, locale);

create index if not exists idx_growth_demand_events_merchant
  on growth_demand_events(merchant_profile_id, event_type, created_at desc);

create index if not exists idx_merchant_onboarding_profiles_dedupe
  on merchant_onboarding_profiles(dedupe_key);

alter table growth_city_pages enable row level security;
alter table growth_demand_events enable row level security;

create policy "Public read city pages" on growth_city_pages for select using (true);
create policy "Public insert demand events" on growth_demand_events for insert with check (true);
create policy "Public read demand events" on growth_demand_events for select using (true);
