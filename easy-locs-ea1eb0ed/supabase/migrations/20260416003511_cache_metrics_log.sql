create table if not exists public.cache_metrics_log (
  id bigint generated always as identity primary key,
  recorded_at timestamptz not null default now(),
  function_name text not null default 'extract-article',
  hits integer not null,
  misses integer not null,
  evictions integer not null,
  expirations integer not null,
  stores integer not null,
  hit_rate numeric(5,2) not null,
  current_size integer not null,
  average_size numeric(8,2) not null,
  max_size integer not null,
  ttl_ms integer not null,
  uptime_ms bigint not null
);

create index if not exists idx_cache_metrics_log_recorded_at
  on public.cache_metrics_log (recorded_at desc);

create index if not exists idx_cache_metrics_log_function_name
  on public.cache_metrics_log (function_name);

alter table public.cache_metrics_log enable row level security;

create policy "Service role full access on cache_metrics_log"
  on public.cache_metrics_log
  for all
  to service_role
  using (true)
  with check (true);

do $outer$
begin
  if exists (select 1 from pg_extension where extname = 'pg_cron') then
    perform cron.schedule(
      'cleanup-cache-metrics-log',
      '0 3 * * *',
      $job$delete from public.cache_metrics_log where recorded_at < now() - interval '30 days'$job$
    );
  end if;
end
$outer$;
