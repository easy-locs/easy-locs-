
create table if not exists public.rides (
  id uuid primary key default gen_random_uuid(),
  rider_user_id uuid not null,
  driver_user_id uuid null,
  ride_type text not null default 'taxi',
  booking_mode text not null default 'now',
  status text not null default 'pending',
  pickup_label text not null default '',
  pickup_lat double precision null,
  pickup_lng double precision null,
  dropoff_label text not null default '',
  dropoff_lat double precision null,
  dropoff_lng double precision null,
  scheduled_for timestamptz null,
  notes text null,
  currency text not null default 'AED',
  estimated_price numeric(12,2) null,
  final_price numeric(12,2) null,
  passenger_name text null,
  passenger_phone text null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.ride_events (
  id uuid primary key default gen_random_uuid(),
  ride_id uuid not null references public.rides(id) on delete cascade,
  event_type text not null,
  actor_user_id uuid null,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

ALTER TABLE public.tracking_positions ADD COLUMN IF NOT EXISTS ride_id uuid references public.rides(id) on delete cascade;
ALTER TABLE public.tracking_positions ADD COLUMN IF NOT EXISTS user_id uuid;
ALTER TABLE public.tracking_positions ADD COLUMN IF NOT EXISTS created_at timestamptz default now();

create index if not exists rides_rider_user_id_idx on public.rides(rider_user_id);
create index if not exists rides_driver_user_id_idx on public.rides(driver_user_id);
create index if not exists rides_status_idx on public.rides(status);
create index if not exists ride_events_ride_id_idx on public.ride_events(ride_id);

create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end; $$;

drop trigger if exists rides_set_updated_at on public.rides;
create trigger rides_set_updated_at before update on public.rides for each row execute function public.set_updated_at();

alter table public.rides enable row level security;
alter table public.ride_events enable row level security;
alter table public.tracking_positions enable row level security;

drop policy if exists rides_select_own on public.rides;
create policy rides_select_own on public.rides for select to authenticated
using (auth.uid() = rider_user_id or auth.uid() = driver_user_id);

drop policy if exists rides_insert_rider on public.rides;
create policy rides_insert_rider on public.rides for insert to authenticated
with check (auth.uid() = rider_user_id);

drop policy if exists rides_update_party on public.rides;
create policy rides_update_party on public.rides for update to authenticated
using (auth.uid() = rider_user_id or auth.uid() = driver_user_id)
with check (auth.uid() = rider_user_id or auth.uid() = driver_user_id);

drop policy if exists ride_events_select_party on public.ride_events;
create policy ride_events_select_party on public.ride_events for select to authenticated
using (exists (select 1 from public.rides r where r.id = ride_events.ride_id and (r.rider_user_id = auth.uid() or r.driver_user_id = auth.uid())));

drop policy if exists ride_events_insert_party on public.ride_events;
create policy ride_events_insert_party on public.ride_events for insert to authenticated
with check (exists (select 1 from public.rides r where r.id = ride_events.ride_id and (r.rider_user_id = auth.uid() or r.driver_user_id = auth.uid())));

drop policy if exists tracking_positions_select_party on public.tracking_positions;
create policy tracking_positions_select_party on public.tracking_positions for select to authenticated
using (tracking_positions.ride_id is null or exists (select 1 from public.rides r where r.id = tracking_positions.ride_id and (r.rider_user_id = auth.uid() or r.driver_user_id = auth.uid())));

drop policy if exists tracking_positions_insert_own on public.tracking_positions;
create policy tracking_positions_insert_own on public.tracking_positions for insert to authenticated
with check (auth.uid() = tracking_positions.user_id);

ALTER PUBLICATION supabase_realtime ADD TABLE public.rides;
