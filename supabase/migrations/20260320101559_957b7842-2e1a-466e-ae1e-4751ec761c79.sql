
-- Push tokens table
create table if not exists public.push_tokens (
  id text primary key,
  user_id uuid not null,
  orbit_id text,
  token text not null,
  platform text,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists idx_push_tokens_unique on public.push_tokens(token);

-- Notification deliveries table
create table if not exists public.notification_deliveries (
  id text primary key,
  notification_id text not null,
  channel text not null,
  status text not null default 'pending',
  provider_ref text,
  error_message text,
  created_at timestamptz not null default now(),
  delivered_at timestamptz
);

create index if not exists idx_notification_deliveries_notification_id on public.notification_deliveries(notification_id);

-- RLS
alter table public.push_tokens enable row level security;
alter table public.notification_deliveries enable row level security;

drop policy if exists "read own push tokens" on public.push_tokens;
create policy "read own push tokens" on public.push_tokens for select using (auth.uid() = user_id);

drop policy if exists "insert own push tokens" on public.push_tokens;
create policy "insert own push tokens" on public.push_tokens for insert with check (auth.uid() = user_id);

drop policy if exists "update own push tokens" on public.push_tokens;
create policy "update own push tokens" on public.push_tokens for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "admins read notification deliveries" on public.notification_deliveries;
create policy "admins read notification deliveries" on public.notification_deliveries for select using (
  exists (
    select 1 from public.org_members om where om.user_id = auth.uid() and om.role in ('owner', 'admin')
  )
);
