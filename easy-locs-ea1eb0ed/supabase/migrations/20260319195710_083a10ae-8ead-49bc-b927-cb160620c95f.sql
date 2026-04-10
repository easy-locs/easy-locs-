
create table if not exists public.dino_sync_jobs (
  id uuid primary key default gen_random_uuid(),
  job_type text not null,
  entity_type text not null,
  entity_id text not null,
  payload_json jsonb not null default '{}'::jsonb,
  priority integer not null default 100,
  status text not null default 'pending',
  attempts integer not null default 0,
  last_error text,
  scheduled_at timestamptz not null default now(),
  started_at timestamptz,
  finished_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists public.dino_quality_scores (
  id uuid primary key default gen_random_uuid(),
  route text not null,
  entity_type text,
  entity_id text,
  ui_score integer not null default 0,
  ux_score integer not null default 0,
  stability_score integer not null default 0,
  media_score integer not null default 0,
  i18n_score integer not null default 0,
  category_score integer not null default 0,
  total_score integer not null default 0,
  score_details jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

create table if not exists public.dino_notifications (
  id uuid primary key default gen_random_uuid(),
  actor_type text not null,
  actor_id text,
  channel text not null,
  template_key text not null,
  payload_json jsonb not null default '{}'::jsonb,
  status text not null default 'pending',
  provider_message_id text,
  error_message text,
  sent_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists public.dino_entity_state (
  id uuid primary key default gen_random_uuid(),
  entity_type text not null,
  entity_id text not null,
  state_key text not null,
  state_value jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

create unique index if not exists idx_dino_entity_state_unique
  on public.dino_entity_state(entity_type, entity_id, state_key);

create index if not exists idx_dino_sync_jobs_status
  on public.dino_sync_jobs(status, priority, scheduled_at);

create index if not exists idx_dino_quality_scores_route
  on public.dino_quality_scores(route);

create index if not exists idx_dino_notifications_status
  on public.dino_notifications(status, channel);

alter table public.dino_sync_jobs enable row level security;
alter table public.dino_quality_scores enable row level security;
alter table public.dino_notifications enable row level security;
alter table public.dino_entity_state enable row level security;

create policy "Service role full access on dino_sync_jobs" on public.dino_sync_jobs for all using (true) with check (true);
create policy "Service role full access on dino_quality_scores" on public.dino_quality_scores for all using (true) with check (true);
create policy "Service role full access on dino_notifications" on public.dino_notifications for all using (true) with check (true);
create policy "Service role full access on dino_entity_state" on public.dino_entity_state for all using (true) with check (true);
