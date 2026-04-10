
create table if not exists public.onboarding_review_queue (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  canonical_record_id uuid references public.onboarding_canonical_records(id) on delete cascade,
  entity_id text not null,
  vertical text not null,
  priority integer not null default 50,
  review_status text not null default 'pending',
  review_reason text,
  assigned_to uuid null,
  reviewed_by uuid null,
  reviewed_at timestamptz null,
  quality_score numeric not null default 0,
  missing_fields_json jsonb not null default '[]'::jsonb,
  warnings_json jsonb not null default '[]'::jsonb,
  suggested_visibility text not null default 'draft',
  final_visibility text null,
  metadata_json jsonb not null default '{}'::jsonb
);

create table if not exists public.onboarding_review_actions (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  review_queue_id uuid references public.onboarding_review_queue(id) on delete cascade,
  action_type text not null,
  actor_user_id uuid null,
  before_json jsonb,
  after_json jsonb,
  notes text null
);

create table if not exists public.onboarding_recrawl_jobs (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  started_at timestamptz null,
  finished_at timestamptz null,
  entity_id text not null,
  vertical text not null,
  trigger_reason text not null,
  status text not null default 'queued',
  input_json jsonb not null default '{}'::jsonb,
  result_json jsonb,
  error_message text null
);

alter table public.onboarding_review_queue enable row level security;
alter table public.onboarding_review_actions enable row level security;
alter table public.onboarding_recrawl_jobs enable row level security;

create policy "Authenticated users can manage review queue"
  on public.onboarding_review_queue for all to authenticated using (true) with check (true);

create policy "Authenticated users can manage review actions"
  on public.onboarding_review_actions for all to authenticated using (true) with check (true);

create policy "Authenticated users can manage recrawl jobs"
  on public.onboarding_recrawl_jobs for all to authenticated using (true) with check (true);
