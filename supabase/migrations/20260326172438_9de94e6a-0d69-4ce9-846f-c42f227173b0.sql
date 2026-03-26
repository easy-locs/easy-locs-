
create table if not exists public.mobility_ai_logs (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  job_id uuid null references public.mobility_jobs(id) on delete cascade,
  log_type text not null,
  log_level text not null default 'info',
  message text not null,
  metadata_json jsonb not null default '{}'::jsonb
);

alter table public.mobility_ai_logs enable row level security;

create policy "Authenticated users can read ai logs" on public.mobility_ai_logs for select to authenticated using (true);
create policy "Authenticated users can insert ai logs" on public.mobility_ai_logs for insert to authenticated with check (true);
