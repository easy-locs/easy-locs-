create table if not exists public.runtime_qa_runs (
  id uuid primary key default gen_random_uuid(),
  engine_name text not null default 'master-runtime-qa-engine',
  scope text not null default 'full',
  started_at timestamptz not null default now(),
  finished_at timestamptz,
  status text not null default 'running',
  total_modules integer not null default 0,
  total_scenarios integer not null default 0,
  pass_count integer not null default 0,
  fail_count integer not null default 0,
  degraded_count integer not null default 0,
  fixed_count integer not null default 0,
  critical_count integer not null default 0,
  warning_count integer not null default 0,
  duration_ms integer,
  report_json jsonb not null default '{}'::jsonb,
  metadata_json jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.runtime_qa_scenarios (
  id uuid primary key default gen_random_uuid(),
  run_id uuid not null references public.runtime_qa_runs(id) on delete cascade,
  module_key text not null,
  scenario_key text not null,
  area text not null,
  route_key text,
  status text not null,
  severity text not null,
  issue_type text,
  summary text,
  root_cause text,
  auto_fix_applied boolean not null default false,
  fix_summary text,
  duration_ms integer not null default 0,
  metadata_json jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.runtime_qa_steps (
  id uuid primary key default gen_random_uuid(),
  run_id uuid not null references public.runtime_qa_runs(id) on delete cascade,
  scenario_id uuid references public.runtime_qa_scenarios(id) on delete cascade,
  module_key text not null,
  scenario_key text not null,
  step_key text not null,
  status text not null,
  elapsed_ms integer not null default 0,
  details_json jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.runtime_qa_watchdog (
  id uuid primary key default gen_random_uuid(),
  module_key text not null,
  route_key text not null,
  current_status text not null default 'unknown',
  consecutive_failures integer not null default 0,
  last_seen_ok_at timestamptz,
  last_seen_fail_at timestamptz,
  current_issue text,
  metadata_json jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  unique (module_key, route_key)
);

create index if not exists idx_runtime_qa_runs_started_at on public.runtime_qa_runs(started_at desc);
create index if not exists idx_runtime_qa_runs_status on public.runtime_qa_runs(status);
create index if not exists idx_runtime_qa_scenarios_run_id on public.runtime_qa_scenarios(run_id);
create index if not exists idx_runtime_qa_scenarios_module_key on public.runtime_qa_scenarios(module_key);
create index if not exists idx_runtime_qa_scenarios_status on public.runtime_qa_scenarios(status);
create index if not exists idx_runtime_qa_steps_run_id on public.runtime_qa_steps(run_id);
create index if not exists idx_runtime_qa_watchdog_module_route on public.runtime_qa_watchdog(module_key, route_key);

alter table public.runtime_qa_runs enable row level security;
alter table public.runtime_qa_scenarios enable row level security;
alter table public.runtime_qa_steps enable row level security;
alter table public.runtime_qa_watchdog enable row level security;

create policy runtime_qa_runs_service_all on public.runtime_qa_runs for all to service_role using (true) with check (true);
create policy runtime_qa_scenarios_service_all on public.runtime_qa_scenarios for all to service_role using (true) with check (true);
create policy runtime_qa_steps_service_all on public.runtime_qa_steps for all to service_role using (true) with check (true);
create policy runtime_qa_watchdog_service_all on public.runtime_qa_watchdog for all to service_role using (true) with check (true);

create policy runtime_qa_runs_authenticated_read on public.runtime_qa_runs for select to authenticated using (true);
create policy runtime_qa_scenarios_authenticated_read on public.runtime_qa_scenarios for select to authenticated using (true);
create policy runtime_qa_steps_authenticated_read on public.runtime_qa_steps for select to authenticated using (true);
create policy runtime_qa_watchdog_authenticated_read on public.runtime_qa_watchdog for select to authenticated using (true);