
-- V1 Core: workspaces, members, profiles, settings, support, storage assets, dispatch, menu

create table if not exists public.workspaces (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text unique,
  owner_user_id uuid,
  workspace_type text default 'business',
  status text default 'active',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists public.workspace_members (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  user_id uuid not null,
  role text not null default 'member',
  status text default 'active',
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique(workspace_id, user_id)
);

create index if not exists idx_workspace_members_workspace on public.workspace_members(workspace_id);
create index if not exists idx_workspace_members_user on public.workspace_members(user_id);

create table if not exists public.user_profiles (
  id uuid primary key,
  full_name text,
  phone text,
  avatar_url text,
  default_workspace_id uuid references public.workspaces(id) on delete set null,
  locale text default 'en',
  timezone text default 'Asia/Dubai',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists public.workspace_settings (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null unique references public.workspaces(id) on delete cascade,
  currency text default 'AED',
  country_code text default 'AE',
  city text default 'Dubai',
  support_email text,
  support_phone text,
  order_fee_pct numeric default 0,
  payout_cycle text default 'weekly',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists public.support_tickets (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid,
  requester_user_id uuid,
  ticket_type text not null,
  priority text default 'medium',
  subject text not null,
  status text default 'open',
  assigned_to uuid,
  context_type text,
  context_id uuid,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  resolved_at timestamptz
);

create table if not exists public.support_ticket_messages (
  id uuid primary key default gen_random_uuid(),
  ticket_id uuid not null references public.support_tickets(id) on delete cascade,
  sender_user_id uuid,
  sender_role text default 'user',
  body text not null,
  metadata jsonb default '{}'::jsonb,
  created_at timestamptz default now()
);

create index if not exists idx_support_ticket_messages_ticket on public.support_ticket_messages(ticket_id, created_at asc);

create table if not exists public.storage_assets (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid,
  owner_user_id uuid,
  bucket text not null,
  path text not null,
  asset_type text not null,
  mime_type text,
  file_size bigint,
  status text default 'active',
  metadata jsonb default '{}'::jsonb,
  created_at timestamptz default now()
);

create index if not exists idx_storage_assets_workspace on public.storage_assets(workspace_id, created_at desc);

create table if not exists public.dispatch_jobs (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid,
  order_id uuid,
  seller_id uuid,
  buyer_id uuid,
  pickup_label text,
  dropoff_label text,
  status text default 'open',
  quoted_fee numeric,
  final_fee numeric,
  currency text default 'AED',
  assigned_driver_id uuid,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  completed_at timestamptz
);

create table if not exists public.dispatch_bids (
  id uuid primary key default gen_random_uuid(),
  job_id uuid not null references public.dispatch_jobs(id) on delete cascade,
  driver_id uuid not null,
  bid_type text default 'fixed',
  amount numeric,
  eta_minutes integer,
  status text default 'submitted',
  created_at timestamptz default now()
);

create index if not exists idx_dispatch_bids_job on public.dispatch_bids(job_id, created_at desc);

create table if not exists public.menu_categories (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid,
  merchant_profile_id uuid references public.merchant_onboarding_profiles(id) on delete cascade,
  name text not null,
  sort_order integer default 0,
  is_active boolean default true,
  created_at timestamptz default now()
);

create table if not exists public.menu_items (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid,
  merchant_profile_id uuid references public.merchant_onboarding_profiles(id) on delete cascade,
  category_id uuid references public.menu_categories(id) on delete set null,
  name text not null,
  description text,
  price numeric not null default 0,
  currency text default 'AED',
  image_url text,
  is_available boolean default true,
  sort_order integer default 0,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index if not exists idx_menu_items_profile on public.menu_items(merchant_profile_id, created_at desc);

-- RLS
alter table public.workspaces enable row level security;
alter table public.workspace_members enable row level security;
alter table public.user_profiles enable row level security;
alter table public.workspace_settings enable row level security;
alter table public.support_tickets enable row level security;
alter table public.support_ticket_messages enable row level security;
alter table public.storage_assets enable row level security;
alter table public.dispatch_jobs enable row level security;
alter table public.dispatch_bids enable row level security;
alter table public.menu_categories enable row level security;
alter table public.menu_items enable row level security;

-- Helper functions
create or replace function public.is_workspace_member(_workspace_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.workspace_members wm
    where wm.workspace_id = _workspace_id
      and wm.user_id = auth.uid()
      and wm.status = 'active'
  );
$$;

create or replace function public.has_workspace_role(_workspace_id uuid, _roles text[])
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.workspace_members wm
    where wm.workspace_id = _workspace_id
      and wm.user_id = auth.uid()
      and wm.status = 'active'
      and wm.role = any(_roles)
  );
$$;

-- RLS Policies
create policy "workspaces_select_member" on public.workspaces for select to authenticated
using (owner_user_id = auth.uid() or public.is_workspace_member(id));

create policy "workspaces_insert_auth" on public.workspaces for insert to authenticated
with check (owner_user_id = auth.uid());

create policy "workspaces_update_owner_admin" on public.workspaces for update to authenticated
using (owner_user_id = auth.uid() or public.has_workspace_role(id, array['owner','admin']))
with check (owner_user_id = auth.uid() or public.has_workspace_role(id, array['owner','admin']));

create policy "workspace_members_select_member" on public.workspace_members for select to authenticated
using (public.is_workspace_member(workspace_id));

create policy "workspace_members_insert_owner_admin" on public.workspace_members for insert to authenticated
with check (public.has_workspace_role(workspace_id, array['owner','admin']) or user_id = auth.uid());

create policy "workspace_members_update_owner_admin" on public.workspace_members for update to authenticated
using (public.has_workspace_role(workspace_id, array['owner','admin']))
with check (public.has_workspace_role(workspace_id, array['owner','admin']));

create policy "user_profiles_select_self" on public.user_profiles for select to authenticated
using (id = auth.uid());

create policy "user_profiles_insert_self" on public.user_profiles for insert to authenticated
with check (id = auth.uid());

create policy "user_profiles_update_self" on public.user_profiles for update to authenticated
using (id = auth.uid()) with check (id = auth.uid());

create policy "workspace_settings_select_member" on public.workspace_settings for select to authenticated
using (public.is_workspace_member(workspace_id));

create policy "workspace_settings_insert_owner_admin" on public.workspace_settings for insert to authenticated
with check (public.has_workspace_role(workspace_id, array['owner','admin']));

create policy "workspace_settings_update_owner_admin" on public.workspace_settings for update to authenticated
using (public.has_workspace_role(workspace_id, array['owner','admin']))
with check (public.has_workspace_role(workspace_id, array['owner','admin']));

create policy "support_tickets_select" on public.support_tickets for select to authenticated
using (requester_user_id = auth.uid() or (workspace_id is not null and public.is_workspace_member(workspace_id)));

create policy "support_tickets_insert" on public.support_tickets for insert to authenticated
with check (requester_user_id = auth.uid() or (workspace_id is not null and public.is_workspace_member(workspace_id)));

create policy "support_tickets_update" on public.support_tickets for update to authenticated
using (requester_user_id = auth.uid() or (workspace_id is not null and public.has_workspace_role(workspace_id, array['owner','admin','support','ops'])))
with check (requester_user_id = auth.uid() or (workspace_id is not null and public.has_workspace_role(workspace_id, array['owner','admin','support','ops'])));

create policy "support_ticket_messages_select" on public.support_ticket_messages for select to authenticated
using (exists (select 1 from public.support_tickets st where st.id = support_ticket_messages.ticket_id and (st.requester_user_id = auth.uid() or (st.workspace_id is not null and public.is_workspace_member(st.workspace_id)))));

create policy "support_ticket_messages_insert" on public.support_ticket_messages for insert to authenticated
with check (exists (select 1 from public.support_tickets st where st.id = support_ticket_messages.ticket_id and (st.requester_user_id = auth.uid() or (st.workspace_id is not null and public.is_workspace_member(st.workspace_id)))));

create policy "storage_assets_select" on public.storage_assets for select to authenticated
using (owner_user_id = auth.uid() or (workspace_id is not null and public.is_workspace_member(workspace_id)));

create policy "storage_assets_insert" on public.storage_assets for insert to authenticated
with check (owner_user_id = auth.uid() or (workspace_id is not null and public.is_workspace_member(workspace_id)));

create policy "dispatch_jobs_select" on public.dispatch_jobs for select to authenticated
using (buyer_id = auth.uid() or assigned_driver_id = auth.uid() or (workspace_id is not null and public.is_workspace_member(workspace_id)));

create policy "dispatch_jobs_insert" on public.dispatch_jobs for insert to authenticated
with check (buyer_id = auth.uid() or (workspace_id is not null and public.is_workspace_member(workspace_id)));

create policy "dispatch_jobs_update" on public.dispatch_jobs for update to authenticated
using (buyer_id = auth.uid() or assigned_driver_id = auth.uid() or (workspace_id is not null and public.is_workspace_member(workspace_id)))
with check (buyer_id = auth.uid() or assigned_driver_id = auth.uid() or (workspace_id is not null and public.is_workspace_member(workspace_id)));

create policy "dispatch_bids_select" on public.dispatch_bids for select to authenticated
using (driver_id = auth.uid() or exists (select 1 from public.dispatch_jobs dj where dj.id = dispatch_bids.job_id and (dj.buyer_id = auth.uid() or dj.assigned_driver_id = auth.uid() or (dj.workspace_id is not null and public.is_workspace_member(dj.workspace_id)))));

create policy "dispatch_bids_insert" on public.dispatch_bids for insert to authenticated
with check (driver_id = auth.uid());

create policy "dispatch_bids_update" on public.dispatch_bids for update to authenticated
using (driver_id = auth.uid() or exists (select 1 from public.dispatch_jobs dj where dj.id = dispatch_bids.job_id and (dj.workspace_id is not null and public.is_workspace_member(dj.workspace_id))))
with check (driver_id = auth.uid() or exists (select 1 from public.dispatch_jobs dj where dj.id = dispatch_bids.job_id and (dj.workspace_id is not null and public.is_workspace_member(dj.workspace_id))));

create policy "menu_categories_select" on public.menu_categories for select to authenticated
using (workspace_id is null or public.is_workspace_member(workspace_id));

create policy "menu_categories_insert" on public.menu_categories for insert to authenticated
with check (workspace_id is not null and public.is_workspace_member(workspace_id));

create policy "menu_categories_update" on public.menu_categories for update to authenticated
using (workspace_id is not null and public.is_workspace_member(workspace_id))
with check (workspace_id is not null and public.is_workspace_member(workspace_id));

create policy "menu_items_select" on public.menu_items for select to authenticated
using (workspace_id is null or public.is_workspace_member(workspace_id));

create policy "menu_items_insert" on public.menu_items for insert to authenticated
with check (workspace_id is not null and public.is_workspace_member(workspace_id));

create policy "menu_items_update" on public.menu_items for update to authenticated
using (workspace_id is not null and public.is_workspace_member(workspace_id))
with check (workspace_id is not null and public.is_workspace_member(workspace_id));

-- Triggers
drop trigger if exists trg_workspaces_updated_at on public.workspaces;
create trigger trg_workspaces_updated_at before update on public.workspaces for each row execute function public.handle_updated_at();

drop trigger if exists trg_workspace_members_updated_at on public.workspace_members;
create trigger trg_workspace_members_updated_at before update on public.workspace_members for each row execute function public.handle_updated_at();

drop trigger if exists trg_user_profiles_updated_at on public.user_profiles;
create trigger trg_user_profiles_updated_at before update on public.user_profiles for each row execute function public.handle_updated_at();

drop trigger if exists trg_workspace_settings_updated_at on public.workspace_settings;
create trigger trg_workspace_settings_updated_at before update on public.workspace_settings for each row execute function public.handle_updated_at();

drop trigger if exists trg_support_tickets_updated_at on public.support_tickets;
create trigger trg_support_tickets_updated_at before update on public.support_tickets for each row execute function public.handle_updated_at();

drop trigger if exists trg_dispatch_jobs_updated_at on public.dispatch_jobs;
create trigger trg_dispatch_jobs_updated_at before update on public.dispatch_jobs for each row execute function public.handle_updated_at();

drop trigger if exists trg_menu_items_updated_at on public.menu_items;
create trigger trg_menu_items_updated_at before update on public.menu_items for each row execute function public.handle_updated_at();

-- Auto profile on signup
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.user_profiles (id, full_name)
  values (new.id, coalesce(new.raw_user_meta_data->>'full_name', new.email))
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute procedure public.handle_new_user();
