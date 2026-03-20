
-- Add V2 refund columns to existing refund_requests
ALTER TABLE public.refund_requests
  ADD COLUMN IF NOT EXISTS booking_id text,
  ADD COLUMN IF NOT EXISTS rent_payment_id text,
  ADD COLUMN IF NOT EXISTS owner_orbit_id text,
  ADD COLUMN IF NOT EXISTS buyer_or_tenant_orbit_id text,
  ADD COLUMN IF NOT EXISTS stripe_payment_intent_id text,
  ADD COLUMN IF NOT EXISTS stripe_refund_id text,
  ADD COLUMN IF NOT EXISTS updated_at timestamptz default now();

create index if not exists idx_refund_requests_booking_id on public.refund_requests(booking_id);

-- Payout requests table
create table if not exists public.payout_requests (
  id text primary key,
  owner_orbit_id text not null,
  wallet_id text not null,
  amount numeric not null,
  currency text not null,
  status text not null default 'pending',
  destination_type text,
  destination_ref text,
  note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_payout_requests_owner_orbit_id on public.payout_requests(owner_orbit_id);

alter table public.payout_requests enable row level security;

create policy "owner read payout requests"
on public.payout_requests for select
using (exists (select 1 from public.orbit_profiles_v2 op where op.id = auth.uid() and op.orbit_id = owner_orbit_id));

create policy "owner insert payout requests"
on public.payout_requests for insert
with check (exists (select 1 from public.orbit_profiles_v2 op where op.id = auth.uid() and op.orbit_id = owner_orbit_id));
