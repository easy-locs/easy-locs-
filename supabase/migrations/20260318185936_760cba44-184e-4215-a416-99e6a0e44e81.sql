
create table if not exists public.rtc_config (
  id uuid primary key default gen_random_uuid(),
  provider text default 'custom',
  stun_urls text[] default '{}',
  turn_urls text[] default '{}',
  turn_username text,
  turn_password text,
  enabled boolean default true,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table public.rtc_config enable row level security;

create policy "Authenticated users can read rtc_config"
on public.rtc_config for select to authenticated using (true);

create table if not exists public.call_transcripts (
  id uuid primary key default gen_random_uuid(),
  call_session_id uuid not null,
  speaker_user_id uuid,
  source_locale text,
  transcript_text text not null,
  translated_locale text,
  translated_text text,
  created_at timestamptz default now()
);

create index if not exists idx_call_transcripts_call_session
on public.call_transcripts(call_session_id);

alter table public.call_transcripts enable row level security;

create policy "Authenticated users can insert call_transcripts"
on public.call_transcripts for insert to authenticated with check (true);

create policy "Authenticated users can read call_transcripts"
on public.call_transcripts for select to authenticated using (true);

create table if not exists public.permission_templates (
  id uuid primary key default gen_random_uuid(),
  template_key text unique not null,
  label text not null,
  permissions jsonb default '[]'::jsonb,
  created_at timestamptz default now()
);

alter table public.permission_templates enable row level security;

create policy "Authenticated users can read permission_templates"
on public.permission_templates for select to authenticated using (true);

create table if not exists public.ai_ops_suggestions (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid,
  suggestion_type text not null,
  context_type text,
  context_id uuid,
  title text not null,
  suggestion_text text not null,
  status text default 'open',
  created_at timestamptz default now()
);

alter table public.ai_ops_suggestions enable row level security;

create policy "Authenticated users can read ai_ops_suggestions"
on public.ai_ops_suggestions for select to authenticated using (true);

create policy "Authenticated users can insert ai_ops_suggestions"
on public.ai_ops_suggestions for insert to authenticated with check (true);

create table if not exists public.executive_kpi_snapshots (
  id uuid primary key default gen_random_uuid(),
  snapshot_date date not null,
  active_rides integer default 0,
  active_orders integer default 0,
  gross_volume numeric default 0,
  refunds_volume numeric default 0,
  disputes_open integer default 0,
  payouts_pending integer default 0,
  hot_zones integer default 0,
  conversion_rate numeric default 0,
  created_at timestamptz default now()
);

create unique index if not exists uq_executive_kpi_snapshots_date
on public.executive_kpi_snapshots(snapshot_date);

alter table public.executive_kpi_snapshots enable row level security;

create policy "Authenticated users can read executive_kpi_snapshots"
on public.executive_kpi_snapshots for select to authenticated using (true);

create policy "Authenticated users can insert executive_kpi_snapshots"
on public.executive_kpi_snapshots for insert to authenticated with check (true);

create policy "Authenticated users can update executive_kpi_snapshots"
on public.executive_kpi_snapshots for update to authenticated using (true);
