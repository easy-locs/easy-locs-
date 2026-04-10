
-- BLOC 12: app_notifications
create table if not exists public.app_notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  scope text not null default 'global',
  category text not null default 'general',
  title text not null,
  body text,
  route text,
  icon text,
  severity text not null default 'info',
  entity_type text,
  entity_id text,
  read_at timestamptz,
  dismissed_at timestamptz,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_app_notifications_user_created on public.app_notifications(user_id, created_at desc);
create index if not exists idx_app_notifications_user_read on public.app_notifications(user_id, read_at);
create index if not exists idx_app_notifications_scope on public.app_notifications(scope);

alter table public.app_notifications enable row level security;

do $$ begin
  if not exists (select 1 from pg_policies where tablename='app_notifications' and policyname='app_notifications_select_own') then
    create policy app_notifications_select_own on public.app_notifications for select to authenticated using (auth.uid() = user_id);
  end if;
end $$;

do $$ begin
  if not exists (select 1 from pg_policies where tablename='app_notifications' and policyname='app_notifications_update_own') then
    create policy app_notifications_update_own on public.app_notifications for update to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);
  end if;
end $$;

do $$ begin
  if not exists (select 1 from pg_policies where tablename='app_notifications' and policyname='app_notifications_insert_service') then
    create policy app_notifications_insert_service on public.app_notifications for insert to authenticated with check (auth.uid() = user_id);
  end if;
end $$;

-- BLOC 13: orbit_contacts_v2
create table if not exists public.orbit_contacts_v2 (
  id uuid primary key default gen_random_uuid(),
  owner_user_id uuid not null,
  peer_user_id uuid,
  peer_orbit_id text,
  display_name text,
  email text,
  phone text,
  avatar_url text,
  source text not null default 'manual',
  is_favorite boolean not null default false,
  is_blocked boolean not null default false,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_orbit_contacts_v2_owner on public.orbit_contacts_v2(owner_user_id, created_at desc);
create unique index if not exists uq_orbit_contacts_v2_owner_peer on public.orbit_contacts_v2(owner_user_id, coalesce(peer_user_id::text, ''), coalesce(email, ''));

alter table public.orbit_contacts_v2 enable row level security;

do $$ begin
  if not exists (select 1 from pg_policies where tablename='orbit_contacts_v2' and policyname='orbit_contacts_v2_select_own') then
    create policy orbit_contacts_v2_select_own on public.orbit_contacts_v2 for select to authenticated using (auth.uid() = owner_user_id);
  end if;
end $$;

do $$ begin
  if not exists (select 1 from pg_policies where tablename='orbit_contacts_v2' and policyname='orbit_contacts_v2_write_own') then
    create policy orbit_contacts_v2_write_own on public.orbit_contacts_v2 for all to authenticated using (auth.uid() = owner_user_id) with check (auth.uid() = owner_user_id);
  end if;
end $$;

-- BLOC 14: orbit_user_settings_v2
create table if not exists public.orbit_user_settings_v2 (
  user_id uuid primary key,
  read_receipts boolean not null default true,
  typing_indicators boolean not null default true,
  last_seen_visibility text not null default 'contacts',
  profile_photo_visibility text not null default 'contacts',
  disappear_default_seconds integer not null default 0,
  ghost_mode_enabled boolean not null default false,
  calls_enabled boolean not null default true,
  camera_uploads_enabled boolean not null default true,
  location_sharing_enabled boolean not null default true,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.orbit_user_settings_v2 enable row level security;

do $$ begin
  if not exists (select 1 from pg_policies where tablename='orbit_user_settings_v2' and policyname='orbit_user_settings_v2_own') then
    create policy orbit_user_settings_v2_own on public.orbit_user_settings_v2 for all to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);
  end if;
end $$;

-- BLOC 15: watchdog enrichment
alter table public.browser_repair_watchdog
  add column if not exists route_group text,
  add column if not exists severity text,
  add column if not exists last_run_id uuid,
  add column if not exists metadata jsonb not null default '{}'::jsonb;
