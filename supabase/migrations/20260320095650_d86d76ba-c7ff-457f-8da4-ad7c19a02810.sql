
create table if not exists public.listing_reviews (
  id text primary key,
  listing_id text not null,
  booking_id text,
  reviewer_orbit_id text not null,
  owner_orbit_id text not null,
  rating int not null,
  comment text,
  created_at timestamptz not null default now()
);

create index if not exists idx_listing_reviews_listing_id
  on public.listing_reviews(listing_id);

create table if not exists public.listing_coupons (
  id text primary key,
  owner_orbit_id text not null,
  listing_id text,
  code text not null,
  discount_type text not null,
  discount_value numeric not null,
  active boolean not null default true,
  usage_limit int,
  used_count int not null default 0,
  start_at timestamptz,
  end_at timestamptz,
  created_at timestamptz not null default now()
);

create unique index if not exists idx_listing_coupons_code_unique
  on public.listing_coupons(code);

alter table public.listing_reviews enable row level security;
alter table public.listing_coupons enable row level security;

create policy "public read reviews"
on public.listing_reviews
for select
using (true);

create policy "participant insert reviews"
on public.listing_reviews
for insert
with check (
  exists (
    select 1
    from public.orbit_profiles_v2 op
    where op.id = auth.uid()
      and op.orbit_id = reviewer_orbit_id
  )
);

create policy "public read active coupons"
on public.listing_coupons
for select
using (active = true);

create policy "owner insert coupons"
on public.listing_coupons
for insert
with check (
  exists (
    select 1
    from public.orbit_profiles_v2 op
    where op.id = auth.uid()
      and op.orbit_id = owner_orbit_id
  )
);

create policy "owner update coupons"
on public.listing_coupons
for update
using (
  exists (
    select 1
    from public.orbit_profiles_v2 op
    where op.id = auth.uid()
      and op.orbit_id = owner_orbit_id
  )
)
with check (
  exists (
    select 1
    from public.orbit_profiles_v2 op
    where op.id = auth.uid()
      and op.orbit_id = owner_orbit_id
  )
);

create policy "owner delete coupons"
on public.listing_coupons
for delete
using (
  exists (
    select 1
    from public.orbit_profiles_v2 op
    where op.id = auth.uid()
      and op.orbit_id = owner_orbit_id
  )
);

-- Validation trigger for rating range instead of CHECK constraint
create or replace function public.validate_review_rating()
returns trigger
language plpgsql
as $$
begin
  if NEW.rating < 1 or NEW.rating > 5 then
    raise exception 'Rating must be between 1 and 5';
  end if;
  return NEW;
end;
$$;

create trigger trg_validate_review_rating
  before insert or update on public.listing_reviews
  for each row execute function public.validate_review_rating();
