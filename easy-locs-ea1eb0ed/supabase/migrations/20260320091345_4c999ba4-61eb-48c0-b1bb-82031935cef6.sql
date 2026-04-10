
-- app_notifications table
create table if not exists public.app_notifications (
  id text primary key,
  "orbitId" text not null,
  type text not null,
  title text not null,
  body text not null,
  read boolean not null default false,
  "createdAt" timestamptz not null default now(),
  metadata jsonb
);

create index if not exists idx_app_notifications_orbit_id
  on public.app_notifications("orbitId");

create index if not exists idx_app_notifications_created_at
  on public.app_notifications("createdAt" desc);

-- Enable RLS
alter table public.app_notifications enable row level security;

-- Dev permissive policy
drop policy if exists "dev_all_app_notifications" on public.app_notifications;
create policy "dev_all_app_notifications" on public.app_notifications for all using (true) with check (true);
