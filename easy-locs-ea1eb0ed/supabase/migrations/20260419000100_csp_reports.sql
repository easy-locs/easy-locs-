create table if not exists public.security_csp_reports (
  id           bigserial primary key,
  report       jsonb not null,
  user_agent   text,
  referer      text,
  received_at  timestamptz not null default now()
);

alter table public.security_csp_reports enable row level security;

do $$ begin
  if not exists (select 1 from pg_policy where polrelid = 'public.security_csp_reports'::regclass) then
    create policy "service_role_only" on public.security_csp_reports
      for all using (auth.role() = 'service_role') with check (auth.role() = 'service_role');
  end if;
end $$;

create index if not exists security_csp_reports_received_at_idx
  on public.security_csp_reports (received_at desc);
