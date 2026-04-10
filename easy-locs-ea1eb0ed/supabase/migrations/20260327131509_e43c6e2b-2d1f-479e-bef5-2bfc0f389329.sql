
create table if not exists public.call_sessions (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid,
  caller_orbit_id text not null,
  receiver_orbit_id text,
  call_type text not null default 'audio',
  status text not null default 'pending',
  started_at timestamptz,
  answered_at timestamptz,
  ended_at timestamptz,
  device_info jsonb not null default '{}'::jsonb,
  quality_state text,
  reconnect_count integer not null default 0,
  muted_by jsonb not null default '[]'::jsonb,
  camera_off_by jsonb not null default '[]'::jsonb,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.call_logs (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid,
  session_id uuid references public.call_sessions(id) on delete set null,
  caller_orbit_id text,
  receiver_orbit_id text,
  call_type text not null default 'audio',
  direction text not null default 'outgoing',
  status text not null default 'pending',
  started_at timestamptz,
  answered_at timestamptz,
  ended_at timestamptz,
  missed boolean not null default false,
  ended_reason text,
  quality_score numeric,
  reconnect_count integer not null default 0,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists idx_call_logs_conversation_id on public.call_logs(conversation_id);
create index if not exists idx_call_logs_created_at_desc on public.call_logs(created_at desc);
create index if not exists idx_call_sessions_conversation_id on public.call_sessions(conversation_id);
create index if not exists idx_call_sessions_status on public.call_sessions(status);

alter table public.call_sessions enable row level security;
alter table public.call_logs enable row level security;

create policy "call_sessions_auth_all" on public.call_sessions for all to authenticated using (true) with check (true);
create policy "call_logs_auth_all" on public.call_logs for all to authenticated using (true) with check (true);

alter publication supabase_realtime add table public.call_sessions;

create or replace function public.mark_call_as_missed_v2(
  p_session_id uuid,
  p_reason text default 'not_answered'
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.call_sessions
  set status = 'missed',
      ended_at = now(),
      updated_at = now(),
      metadata = coalesce(metadata, '{}'::jsonb) || jsonb_build_object('ended_reason', p_reason)
  where id = p_session_id
    and status in ('ringing', 'pending');

  update public.call_logs
  set missed = true,
      ended_reason = p_reason,
      status = 'missed'
  where session_id = p_session_id;
end;
$$;
