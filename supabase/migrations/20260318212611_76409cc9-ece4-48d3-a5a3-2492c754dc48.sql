
create table if not exists public.admin_alerts (
  id uuid primary key default gen_random_uuid(),
  alert_type text not null,
  severity text default 'medium',
  title text not null,
  body text,
  status text default 'open',
  context_type text,
  context_id text,
  metadata_json jsonb default '{}'::jsonb,
  created_at timestamptz default now(),
  resolved_at timestamptz
);

create table if not exists public.incident_cases (
  id uuid primary key default gen_random_uuid(),
  incident_type text not null,
  severity text default 'medium',
  title text not null,
  summary text,
  status text default 'open',
  owner_user_id uuid,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  resolved_at timestamptz
);

create table if not exists public.incident_case_events (
  id uuid primary key default gen_random_uuid(),
  incident_id uuid not null references public.incident_cases(id) on delete cascade,
  actor_user_id uuid,
  event_type text not null,
  body text,
  metadata_json jsonb default '{}'::jsonb,
  created_at timestamptz default now()
);

create index if not exists idx_incident_case_events_incident
on public.incident_case_events(incident_id, created_at asc);

create table if not exists public.order_payout_locks (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null unique,
  beneficiary_type text not null,
  locked_at timestamptz default now(),
  notes text
);

create table if not exists public.log_export_jobs (
  id uuid primary key default gen_random_uuid(),
  export_type text not null,
  status text default 'queued',
  filters jsonb default '{}'::jsonb,
  output_url text,
  error_message text,
  created_by uuid,
  created_at timestamptz default now(),
  completed_at timestamptz
);

alter table public.admin_alerts enable row level security;
alter table public.incident_cases enable row level security;
alter table public.incident_case_events enable row level security;
alter table public.order_payout_locks enable row level security;
alter table public.log_export_jobs enable row level security;

create policy "admin_alerts_select_authenticated" on public.admin_alerts for select to authenticated using (true);
create policy "admin_alerts_insert_authenticated" on public.admin_alerts for insert to authenticated with check (true);
create policy "admin_alerts_update_authenticated" on public.admin_alerts for update to authenticated using (true) with check (true);

create policy "incident_cases_select_authenticated" on public.incident_cases for select to authenticated using (true);
create policy "incident_cases_insert_authenticated" on public.incident_cases for insert to authenticated with check (true);
create policy "incident_cases_update_authenticated" on public.incident_cases for update to authenticated using (true) with check (true);

create policy "incident_case_events_select_authenticated" on public.incident_case_events for select to authenticated using (true);
create policy "incident_case_events_insert_authenticated" on public.incident_case_events for insert to authenticated with check (true);

create policy "order_payout_locks_select_authenticated" on public.order_payout_locks for select to authenticated using (true);
create policy "order_payout_locks_insert_authenticated" on public.order_payout_locks for insert to authenticated with check (true);

create policy "log_export_jobs_select_authenticated" on public.log_export_jobs for select to authenticated using (true);
create policy "log_export_jobs_insert_authenticated" on public.log_export_jobs for insert to authenticated with check (true);
create policy "log_export_jobs_update_authenticated" on public.log_export_jobs for update to authenticated using (true) with check (true);

drop trigger if exists trg_incident_cases_updated_at on public.incident_cases;
create trigger trg_incident_cases_updated_at
before update on public.incident_cases
for each row execute function public.handle_updated_at();
