
create table if not exists public.chat_attachments (
  id text primary key,
  conversation_id text not null,
  message_id text,
  sender_orbit_id text not null,
  file_name text not null,
  file_path text not null,
  file_type text,
  file_size bigint,
  created_at timestamptz not null default now()
);

create index if not exists idx_chat_attachments_conversation_id
  on public.chat_attachments(conversation_id);

create table if not exists public.email_queue (
  id text primary key,
  to_email text not null,
  subject text not null,
  html text not null,
  status text not null default 'pending',
  metadata jsonb,
  created_at timestamptz not null default now(),
  sent_at timestamptz
);

alter table public.chat_attachments enable row level security;
alter table public.email_queue enable row level security;

create policy "participants_read_chat_attachments"
on public.chat_attachments
for select
using (
  exists (
    select 1
    from public.orbit_profiles_v2 op
    where op.id = auth.uid()
      and op.orbit_id = sender_orbit_id
  )
);

create policy "participants_insert_chat_attachments"
on public.chat_attachments
for insert
with check (
  exists (
    select 1
    from public.orbit_profiles_v2 op
    where op.id = auth.uid()
      and op.orbit_id = sender_orbit_id
  )
);

create policy "admins_read_email_queue"
on public.email_queue
for select
using (
  exists (
    select 1
    from public.orbit_profiles_v2 op
    where op.id = auth.uid()
      and op.role = 'admin'
  )
);
