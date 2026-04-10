
create table if not exists public.support_ticket_messages (
  id uuid primary key default gen_random_uuid(),
  ticket_id uuid not null references public.support_tickets(id) on delete cascade,
  author_user_id uuid,
  author_role text not null default 'user',
  message text not null,
  is_internal boolean not null default false,
  created_at timestamptz not null default now()
);

create index if not exists idx_support_ticket_messages_ticket_id
  on public.support_ticket_messages(ticket_id);

alter table public.seed_merchants
  add column if not exists support_phone text,
  add column if not exists support_email text,
  add column if not exists delivery_radius_km numeric default 7,
  add column if not exists minimum_order_amount numeric default 0,
  add column if not exists opening_hours jsonb default '{}'::jsonb,
  add column if not exists delivery_zones jsonb default '[]'::jsonb,
  add column if not exists promo_text text,
  add column if not exists promo_active boolean default false;

create table if not exists public.seed_merchant_promos (
  id uuid primary key default gen_random_uuid(),
  merchant_id uuid not null references public.seed_merchants(id) on delete cascade,
  title text not null,
  description text,
  discount_type text not null default 'percent',
  discount_value numeric not null default 0,
  minimum_order_amount numeric default 0,
  starts_at timestamptz,
  ends_at timestamptz,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create index if not exists idx_seed_merchant_promos_merchant_id
  on public.seed_merchant_promos(merchant_id);
