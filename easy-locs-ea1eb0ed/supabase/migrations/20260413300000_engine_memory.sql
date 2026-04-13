create table if not exists public.engine_memory (
  id uuid primary key default gen_random_uuid(),
  type text not null check (type in ('ui','data','orbit','flow','performance','security')),
  issue_signature text not null,
  root_cause text,
  fix_applied text,
  fix_function text,
  confidence real not null default 0.5 check (confidence >= 0 and confidence <= 1),
  auto_apply boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  applied_count integer not null default 0,
  last_applied_at timestamptz,
  domain text,
  category text,
  engine_id text,
  rule_id text,
  success_count integer not null default 0,
  failure_count integer not null default 0,
  avg_fix_duration_ms real not null default 0,
  recurrence_after_fix integer not null default 0,
  score real not null default 0.5,
  disabled boolean not null default false
);

create unique index if not exists idx_engine_memory_signature on public.engine_memory (issue_signature);
create index if not exists idx_engine_memory_type on public.engine_memory (type);
create index if not exists idx_engine_memory_auto_apply on public.engine_memory (auto_apply) where auto_apply = true;
create index if not exists idx_engine_memory_score on public.engine_memory (score desc);

alter table public.engine_memory enable row level security;

create policy "engine_memory_read" on public.engine_memory for select using (auth.role() = 'authenticated');
create policy "engine_memory_insert" on public.engine_memory for insert with check (auth.role() = 'authenticated');
create policy "engine_memory_update" on public.engine_memory for update using (auth.role() = 'authenticated');
