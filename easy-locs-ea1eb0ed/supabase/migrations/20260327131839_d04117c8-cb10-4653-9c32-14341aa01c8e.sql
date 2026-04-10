
alter table public.chat_messages_v2
  add column if not exists attachments jsonb not null default '[]'::jsonb,
  add column if not exists view_once boolean not null default false,
  add column if not exists media_kind text,
  add column if not exists media_count integer not null default 0,
  add column if not exists attachment_summary text;

create index if not exists idx_chat_messages_v2_view_once
  on public.chat_messages_v2(view_once);

create index if not exists idx_chat_messages_v2_media_kind
  on public.chat_messages_v2(media_kind);

create table if not exists public.orbit_media_open_logs (
  id uuid primary key default gen_random_uuid(),
  message_id uuid not null,
  conversation_id uuid not null,
  opened_by_user_id uuid,
  opened_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create index if not exists idx_orbit_media_open_logs_message_id
  on public.orbit_media_open_logs(message_id);

create index if not exists idx_orbit_media_open_logs_conversation_id
  on public.orbit_media_open_logs(conversation_id);

alter table public.orbit_media_open_logs enable row level security;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'orbit_media_open_logs'
      and policyname = 'orbit_media_open_logs_select_auth'
  ) then
    create policy orbit_media_open_logs_select_auth
    on public.orbit_media_open_logs
    for select
    to authenticated
    using (true);
  end if;
end $$;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'orbit_media_open_logs'
      and policyname = 'orbit_media_open_logs_insert_auth'
  ) then
    create policy orbit_media_open_logs_insert_auth
    on public.orbit_media_open_logs
    for insert
    to authenticated
    with check (opened_by_user_id = auth.uid());
  end if;
end $$;
