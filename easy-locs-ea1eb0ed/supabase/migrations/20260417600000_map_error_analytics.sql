create table if not exists public.map_error_analytics (
  id            uuid primary key default gen_random_uuid(),
  component     text not null,
  error_type    text not null check (error_type in ('token','webgl','network','init_failure','runtime','unknown')),
  error_message text not null,
  route         text not null default '',
  lat           double precision,
  lng           double precision,
  zoom          smallint,
  session_id    text,
  user_agent    text,
  created_at    timestamptz not null default now()
);

create index if not exists idx_map_error_analytics_created_at on public.map_error_analytics (created_at desc);
create index if not exists idx_map_error_analytics_error_type on public.map_error_analytics (error_type);
create index if not exists idx_map_error_analytics_component on public.map_error_analytics (component);

alter table public.map_error_analytics enable row level security;

revoke all on public.map_error_analytics from anon, authenticated;
grant insert on public.map_error_analytics to authenticated;
grant all on public.map_error_analytics to service_role;

create policy "authenticated_insert_only" on public.map_error_analytics
  for insert to authenticated with check (true);

create policy "service_role_full_access" on public.map_error_analytics
  for all to service_role using (true) with check (true);

create table if not exists public.map_error_alert_log (
  id               uuid primary key default gen_random_uuid(),
  alert_type       text not null,
  threshold        integer not null,
  actual_count     integer not null,
  window_minutes   integer not null,
  details          jsonb default '{}',
  created_at       timestamptz not null default now()
);

create index if not exists idx_map_error_alert_log_created_at on public.map_error_alert_log (created_at desc);

alter table public.map_error_alert_log enable row level security;

revoke all on public.map_error_alert_log from anon, authenticated;
grant insert on public.map_error_alert_log to authenticated;
grant all on public.map_error_alert_log to service_role;

create policy "authenticated_insert_only" on public.map_error_alert_log
  for insert to authenticated with check (true);

create policy "service_role_full_access" on public.map_error_alert_log
  for all to service_role using (true) with check (true);
