
-- Call sessions
create table if not exists public.call_sessions (
  id uuid primary key default gen_random_uuid(),
  thread_id uuid,
  initiator_id uuid not null,
  recipient_id uuid,
  call_type text not null default 'voice',
  status text not null default 'ringing',
  started_at timestamptz,
  ended_at timestamptz,
  duration_seconds integer default 0,
  metadata_json jsonb default '{}'::jsonb,
  created_at timestamptz default now()
);

create index if not exists idx_call_sessions_thread_id on public.call_sessions(thread_id);

-- Message translations
create table if not exists public.message_translations (
  id uuid primary key default gen_random_uuid(),
  message_id uuid not null,
  source_locale text,
  target_locale text not null,
  translated_text text not null,
  provider text default 'ai',
  created_at timestamptz default now()
);

create index if not exists idx_message_translations_message_id on public.message_translations(message_id);

-- Refund requests
create table if not exists public.refund_requests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  context_type text not null,
  context_id uuid,
  amount numeric not null default 0,
  currency text default 'AED',
  reason text,
  refund_status text not null default 'pending',
  auto_approved boolean default false,
  created_at timestamptz default now(),
  processed_at timestamptz
);

create index if not exists idx_refund_requests_status on public.refund_requests(refund_status);

-- SLA events
create table if not exists public.ops_sla_events (
  id uuid primary key default gen_random_uuid(),
  context_type text not null,
  context_id uuid,
  sla_type text not null,
  target_seconds integer not null,
  elapsed_seconds integer default 0,
  sla_status text not null default 'running',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index if not exists idx_ops_sla_events_type on public.ops_sla_events(sla_type);

-- User trust graph
create table if not exists public.user_trust_graph (
  user_id uuid primary key,
  trust_score numeric default 50,
  safety_score numeric default 50,
  reliability_score numeric default 50,
  disputes_count integer default 0,
  cancellations_count integer default 0,
  completed_orders_count integer default 0,
  completed_rides_count integer default 0,
  successful_payments_count integer default 0,
  updated_at timestamptz default now()
);

-- Moderation events
create table if not exists public.moderation_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid,
  thread_id uuid,
  message_id uuid,
  event_type text not null,
  severity text default 'medium',
  action_taken text default 'flagged',
  metadata_json jsonb default '{}'::jsonb,
  created_at timestamptz default now()
);

create index if not exists idx_moderation_events_user_id on public.moderation_events(user_id);

-- Team workspaces
create table if not exists public.team_workspaces (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null,
  name text not null,
  workspace_type text default 'operations',
  created_by uuid,
  created_at timestamptz default now()
);

-- Team workspace members
create table if not exists public.team_workspace_members (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.team_workspaces(id) on delete cascade,
  user_id uuid not null,
  role text not null default 'member',
  permissions jsonb default '[]'::jsonb,
  created_at timestamptz default now()
);

create index if not exists idx_team_workspace_members_workspace_id on public.team_workspace_members(workspace_id);

-- Team tasks
create table if not exists public.team_tasks (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.team_workspaces(id) on delete cascade,
  assigned_to uuid,
  task_type text not null,
  status text default 'open',
  title text not null,
  description text,
  context_type text,
  context_id uuid,
  priority text default 'medium',
  created_by uuid,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index if not exists idx_team_tasks_workspace_id on public.team_tasks(workspace_id);

-- Orbit call presence
create table if not exists public.orbit_call_presence (
  id uuid primary key default gen_random_uuid(),
  call_session_id uuid not null,
  user_id uuid not null,
  joined_at timestamptz default now(),
  left_at timestamptz,
  connection_state text default 'connecting',
  device_type text,
  metadata_json jsonb default '{}'::jsonb
);

create index if not exists idx_orbit_call_presence_session on public.orbit_call_presence(call_session_id);

-- Enable RLS on all new tables
alter table public.call_sessions enable row level security;
alter table public.message_translations enable row level security;
alter table public.refund_requests enable row level security;
alter table public.ops_sla_events enable row level security;
alter table public.user_trust_graph enable row level security;
alter table public.moderation_events enable row level security;
alter table public.team_workspaces enable row level security;
alter table public.team_workspace_members enable row level security;
alter table public.team_tasks enable row level security;
alter table public.orbit_call_presence enable row level security;

-- RLS policies for authenticated users
create policy "Authenticated users can manage call_sessions" on public.call_sessions for all to authenticated using (true) with check (true);
create policy "Authenticated users can manage message_translations" on public.message_translations for all to authenticated using (true) with check (true);
create policy "Authenticated users can manage refund_requests" on public.refund_requests for all to authenticated using (true) with check (true);
create policy "Authenticated users can manage ops_sla_events" on public.ops_sla_events for all to authenticated using (true) with check (true);
create policy "Authenticated users can manage user_trust_graph" on public.user_trust_graph for all to authenticated using (true) with check (true);
create policy "Authenticated users can manage moderation_events" on public.moderation_events for all to authenticated using (true) with check (true);
create policy "Authenticated users can manage team_workspaces" on public.team_workspaces for all to authenticated using (true) with check (true);
create policy "Authenticated users can manage team_workspace_members" on public.team_workspace_members for all to authenticated using (true) with check (true);
create policy "Authenticated users can manage team_tasks" on public.team_tasks for all to authenticated using (true) with check (true);
create policy "Authenticated users can manage orbit_call_presence" on public.orbit_call_presence for all to authenticated using (true) with check (true);

-- Enable realtime for call_sessions
ALTER PUBLICATION supabase_realtime ADD TABLE public.call_sessions;
