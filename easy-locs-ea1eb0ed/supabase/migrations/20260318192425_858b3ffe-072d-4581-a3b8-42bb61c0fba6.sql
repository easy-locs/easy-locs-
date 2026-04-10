
-- ========= TABLES =========

create table if not exists public.rtc_signaling_messages (
  id uuid primary key default gen_random_uuid(),
  call_session_id uuid not null,
  sender_id uuid,
  workspace_id uuid,
  message_type text not null,
  payload jsonb not null,
  expires_at timestamptz default (now() + interval '1 day'),
  created_at timestamptz default now()
);

create index if not exists idx_rtc_signaling_call
on public.rtc_signaling_messages(call_session_id);

create table if not exists public.live_translation_stream (
  id uuid primary key default gen_random_uuid(),
  call_session_id uuid not null,
  workspace_id uuid,
  speaker_id uuid,
  source_text text,
  translated_text text,
  source_lang text,
  target_lang text,
  confidence numeric,
  segment_index integer default 0,
  created_at timestamptz default now()
);

create index if not exists idx_live_translation_stream_call
on public.live_translation_stream(call_session_id);

create table if not exists public.ai_chat_threads (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid,
  context_type text,
  context_id uuid,
  title text,
  created_by uuid,
  created_at timestamptz default now()
);

create table if not exists public.ai_chat_messages (
  id uuid primary key default gen_random_uuid(),
  thread_id uuid not null,
  workspace_id uuid,
  role text not null,
  content text not null,
  metadata jsonb default '{}'::jsonb,
  token_estimate integer default 0,
  created_at timestamptz default now()
);

create index if not exists idx_ai_chat_messages_thread
on public.ai_chat_messages(thread_id);

create table if not exists public.financial_reconciliation (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid,
  entity_type text,
  entity_id uuid,
  expected_amount numeric,
  actual_amount numeric,
  delta numeric,
  currency text default 'USD',
  notes text,
  status text default 'pending',
  resolved_by uuid,
  resolved_at timestamptz,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index if not exists idx_financial_recon_status
on public.financial_reconciliation(status);

create table if not exists public.call_participants (
  id uuid primary key default gen_random_uuid(),
  call_session_id uuid not null,
  user_id uuid,
  role text default 'participant',
  joined_at timestamptz default now(),
  left_at timestamptz,
  status text default 'joined'
);

create index if not exists idx_call_participants_call
on public.call_participants(call_session_id);

create table if not exists public.recon_alerts (
  id uuid primary key default gen_random_uuid(),
  recon_id uuid not null references public.financial_reconciliation(id) on delete cascade,
  severity text not null default 'medium',
  title text not null,
  body text,
  created_at timestamptz default now(),
  acknowledged_at timestamptz,
  acknowledged_by uuid
);

create index if not exists idx_recon_alerts_recon
on public.recon_alerts(recon_id);

create table if not exists public.ai_chat_usage (
  id uuid primary key default gen_random_uuid(),
  thread_id uuid,
  workspace_id uuid,
  user_id uuid,
  prompt_tokens integer default 0,
  completion_tokens integer default 0,
  total_tokens integer default 0,
  model text,
  created_at timestamptz default now()
);

-- ========= RLS =========

alter table public.rtc_signaling_messages enable row level security;
alter table public.live_translation_stream enable row level security;
alter table public.ai_chat_threads enable row level security;
alter table public.ai_chat_messages enable row level security;
alter table public.financial_reconciliation enable row level security;
alter table public.call_participants enable row level security;
alter table public.recon_alerts enable row level security;
alter table public.ai_chat_usage enable row level security;

-- rtc_signaling_messages
create policy "rtc_signaling_select_auth" on public.rtc_signaling_messages for select to authenticated using (true);
create policy "rtc_signaling_insert_auth" on public.rtc_signaling_messages for insert to authenticated with check (true);

-- live_translation_stream
create policy "translation_select_auth" on public.live_translation_stream for select to authenticated using (true);
create policy "translation_insert_auth" on public.live_translation_stream for insert to authenticated with check (true);

-- ai_chat_threads
create policy "ai_threads_select_auth" on public.ai_chat_threads for select to authenticated using (true);
create policy "ai_threads_insert_auth" on public.ai_chat_threads for insert to authenticated with check (true);

-- ai_chat_messages
create policy "ai_messages_select_auth" on public.ai_chat_messages for select to authenticated using (true);
create policy "ai_messages_insert_auth" on public.ai_chat_messages for insert to authenticated with check (true);

-- financial_reconciliation
create policy "recon_select_auth" on public.financial_reconciliation for select to authenticated using (true);
create policy "recon_insert_auth" on public.financial_reconciliation for insert to authenticated with check (true);
create policy "recon_update_auth" on public.financial_reconciliation for update to authenticated using (true) with check (true);

-- call_participants
create policy "call_participants_select_auth" on public.call_participants for select to authenticated using (true);
create policy "call_participants_insert_auth" on public.call_participants for insert to authenticated with check (true);
create policy "call_participants_update_auth" on public.call_participants for update to authenticated using (true) with check (true);

-- recon_alerts
create policy "recon_alerts_select_auth" on public.recon_alerts for select to authenticated using (true);
create policy "recon_alerts_insert_auth" on public.recon_alerts for insert to authenticated with check (true);
create policy "recon_alerts_update_auth" on public.recon_alerts for update to authenticated using (true) with check (true);

-- ai_chat_usage
create policy "ai_usage_select_auth" on public.ai_chat_usage for select to authenticated using (true);
create policy "ai_usage_insert_auth" on public.ai_chat_usage for insert to authenticated with check (true);

-- ========= TRIGGERS =========

create or replace function public.handle_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_financial_reconciliation_updated_at on public.financial_reconciliation;
create trigger trg_financial_reconciliation_updated_at
before update on public.financial_reconciliation
for each row execute function public.handle_updated_at();

create or replace function public.create_recon_alert_on_mismatch()
returns trigger
language plpgsql
as $$
begin
  if new.status = 'mismatch' then
    insert into public.recon_alerts (recon_id, severity, title, body)
    values (
      new.id,
      case
        when abs(coalesce(new.delta, 0)) >= 100 then 'critical'
        when abs(coalesce(new.delta, 0)) >= 25 then 'high'
        else 'medium'
      end,
      'Financial mismatch detected',
      'Entity ' || coalesce(new.entity_type, 'unknown') || ' has delta ' || coalesce(new.delta::text, '0')
    );
  end if;
  return new;
end;
$$;

drop trigger if exists trg_recon_alert_on_insert on public.financial_reconciliation;
create trigger trg_recon_alert_on_insert
after insert on public.financial_reconciliation
for each row execute function public.create_recon_alert_on_mismatch();

-- ========= REALTIME =========
ALTER PUBLICATION supabase_realtime ADD TABLE public.rtc_signaling_messages;
ALTER PUBLICATION supabase_realtime ADD TABLE public.live_translation_stream;
ALTER PUBLICATION supabase_realtime ADD TABLE public.ai_chat_messages;
ALTER PUBLICATION supabase_realtime ADD TABLE public.call_participants;
ALTER PUBLICATION supabase_realtime ADD TABLE public.financial_reconciliation;
ALTER PUBLICATION supabase_realtime ADD TABLE public.recon_alerts;
