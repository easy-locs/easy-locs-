
create table if not exists public.push_device_tokens (
  id uuid primary key default gen_random_uuid(),
  user_id uuid,
  guest_id text,
  platform text not null,
  provider text not null default 'fcm',
  device_token text not null,
  is_active boolean default true,
  last_seen_at timestamptz default now(),
  created_at timestamptz default now()
);

create index if not exists idx_push_device_tokens_user
on public.push_device_tokens(user_id, created_at desc);

create table if not exists public.customer_recommendations (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid,
  user_id uuid,
  guest_id text,
  merchant_profile_id uuid,
  menu_item_id uuid,
  score numeric default 0,
  reason text,
  created_at timestamptz default now()
);

create index if not exists idx_customer_recommendations_user
on public.customer_recommendations(user_id, created_at desc);

create table if not exists public.competitor_price_snapshots (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid,
  merchant_profile_id uuid,
  competitor_name text not null,
  item_name text not null,
  area text,
  observed_price numeric not null,
  currency text default 'AED',
  observed_at timestamptz default now(),
  metadata jsonb default '{}'::jsonb
);

create index if not exists idx_competitor_price_snapshots_merchant
on public.competitor_price_snapshots(merchant_profile_id, observed_at desc);

create table if not exists public.system_feature_flags (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid,
  flag_key text not null,
  flag_value jsonb default 'false'::jsonb,
  description text,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique(workspace_id, flag_key)
);

-- RLS
alter table public.push_device_tokens enable row level security;
alter table public.customer_recommendations enable row level security;
alter table public.competitor_price_snapshots enable row level security;
alter table public.system_feature_flags enable row level security;

-- Push tokens: self only
create policy "push_device_tokens_select_self"
on public.push_device_tokens for select to authenticated
using (user_id = auth.uid());

create policy "push_device_tokens_insert_self"
on public.push_device_tokens for insert to authenticated
with check (user_id = auth.uid());

create policy "push_device_tokens_update_self"
on public.push_device_tokens for update to authenticated
using (user_id = auth.uid())
with check (user_id = auth.uid());

-- Recommendations: self or workspace member
create policy "customer_recommendations_select"
on public.customer_recommendations for select to authenticated
using (
  user_id = auth.uid()
  or (workspace_id is not null and public.is_workspace_member(workspace_id))
);

create policy "customer_recommendations_insert"
on public.customer_recommendations for insert to authenticated
with check (
  user_id = auth.uid()
  or (workspace_id is not null and public.is_workspace_member(workspace_id))
);

create policy "customer_recommendations_delete"
on public.customer_recommendations for delete to authenticated
using (
  user_id = auth.uid()
  or (workspace_id is not null and public.is_workspace_member(workspace_id))
);

-- Competitor prices: workspace member
create policy "competitor_price_snapshots_select"
on public.competitor_price_snapshots for select to authenticated
using (
  workspace_id is null
  or public.is_workspace_member(workspace_id)
);

create policy "competitor_price_snapshots_insert"
on public.competitor_price_snapshots for insert to authenticated
with check (
  workspace_id is null
  or public.is_workspace_member(workspace_id)
);

-- Feature flags: read for members, write for admin/owner/ops
create policy "system_feature_flags_select"
on public.system_feature_flags for select to authenticated
using (
  workspace_id is null
  or public.is_workspace_member(workspace_id)
);

create policy "system_feature_flags_insert"
on public.system_feature_flags for insert to authenticated
with check (
  workspace_id is not null
  and public.has_workspace_role(workspace_id, array['owner','admin','ops'])
);

create policy "system_feature_flags_update"
on public.system_feature_flags for update to authenticated
using (
  workspace_id is not null
  and public.has_workspace_role(workspace_id, array['owner','admin','ops'])
)
with check (
  workspace_id is not null
  and public.has_workspace_role(workspace_id, array['owner','admin','ops'])
);

-- Updated_at trigger
drop trigger if exists trg_system_feature_flags_updated_at on public.system_feature_flags;
create trigger trg_system_feature_flags_updated_at
before update on public.system_feature_flags
for each row execute function public.handle_updated_at();
