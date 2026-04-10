
-- Add missing columns
alter table public.conversations_v2 add column if not exists created_by_orbit_id text;
alter table public.chat_messages_v2 add column if not exists receiver_orbit_id text;
alter table public.chat_messages_v2 add column if not exists read_at timestamptz;

-- conversations_v2 RLS
alter table public.conversations_v2 enable row level security;

drop policy if exists "conversations_participants_read" on public.conversations_v2;
create policy "conversations_participants_read" on public.conversations_v2 for select to authenticated
using (exists (select 1 from public.orbit_profiles_v2 op where op.id = auth.uid() and participants @> jsonb_build_array(jsonb_build_object('orbitId', op.orbit_id))));

drop policy if exists "conversations_creator_insert" on public.conversations_v2;
create policy "conversations_creator_insert" on public.conversations_v2 for insert to authenticated
with check (exists (select 1 from public.orbit_profiles_v2 op where op.id = auth.uid() and participants @> jsonb_build_array(jsonb_build_object('orbitId', op.orbit_id))));

drop policy if exists "conversations_participants_update" on public.conversations_v2;
create policy "conversations_participants_update" on public.conversations_v2 for update to authenticated
using (exists (select 1 from public.orbit_profiles_v2 op where op.id = auth.uid() and participants @> jsonb_build_array(jsonb_build_object('orbitId', op.orbit_id))))
with check (exists (select 1 from public.orbit_profiles_v2 op where op.id = auth.uid() and participants @> jsonb_build_array(jsonb_build_object('orbitId', op.orbit_id))));

-- chat_messages_v2 RLS
alter table public.chat_messages_v2 enable row level security;

drop policy if exists "chat_messages_participants_read" on public.chat_messages_v2;
create policy "chat_messages_participants_read" on public.chat_messages_v2 for select to authenticated
using (exists (select 1 from public.conversations_v2 c join public.orbit_profiles_v2 op on op.id = auth.uid() where c.id = conversation_id and c.participants @> jsonb_build_array(jsonb_build_object('orbitId', op.orbit_id))));

drop policy if exists "chat_messages_sender_insert" on public.chat_messages_v2;
create policy "chat_messages_sender_insert" on public.chat_messages_v2 for insert to authenticated
with check (exists (select 1 from public.conversations_v2 c join public.orbit_profiles_v2 op on op.id = auth.uid() where c.id = conversation_id and c.participants @> jsonb_build_array(jsonb_build_object('orbitId', op.orbit_id)) and op.orbit_id = sender_orbit_id));

drop policy if exists "chat_messages_participants_update" on public.chat_messages_v2;
create policy "chat_messages_participants_update" on public.chat_messages_v2 for update to authenticated
using (exists (select 1 from public.conversations_v2 c join public.orbit_profiles_v2 op on op.id = auth.uid() where c.id = conversation_id and c.participants @> jsonb_build_array(jsonb_build_object('orbitId', op.orbit_id))));

-- call_logs RLS
alter table public.call_logs enable row level security;

drop policy if exists "call_logs_participants_read" on public.call_logs;
create policy "call_logs_participants_read" on public.call_logs for select to authenticated
using (exists (select 1 from public.orbit_profiles_v2 op where op.id = auth.uid() and (op.orbit_id = caller_orbit_id or op.orbit_id = receiver_orbit_id)));

drop policy if exists "call_logs_participants_insert" on public.call_logs;
create policy "call_logs_participants_insert" on public.call_logs for insert to authenticated
with check (exists (select 1 from public.orbit_profiles_v2 op where op.id = auth.uid() and (op.orbit_id = caller_orbit_id or op.orbit_id = receiver_orbit_id)));

-- Enable realtime
do $$ begin
  alter publication supabase_realtime add table public.chat_messages_v2;
exception when duplicate_object then null;
end $$;
do $$ begin
  alter publication supabase_realtime add table public.conversations_v2;
exception when duplicate_object then null;
end $$;
do $$ begin
  alter publication supabase_realtime add table public.call_sessions;
exception when duplicate_object then null;
end $$;
do $$ begin
  alter publication supabase_realtime add table public.call_logs;
exception when duplicate_object then null;
end $$;
