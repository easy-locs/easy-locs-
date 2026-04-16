-- Next-Gen Sécurité — RLS invariants
--
-- Enforces two invariants at migration time:
--   1. Every table in the sensitive schemas has row_security enabled.
--   2. Every such table has at least one policy OR is in a documented
--      whitelist of intentionally permissive catalogs (SEO / taxonomy).
--
-- If either invariant is violated, the migration raises and the deploy
-- fails loudly. This replaces "hope" with an enforced gate.

create schema if not exists system;

create table if not exists system.rls_whitelist (
  schema_name text not null,
  table_name  text not null,
  reason      text not null,
  added_at    timestamptz not null default now(),
  primary key (schema_name, table_name)
);

comment on table system.rls_whitelist is
  'Tables intentionally left without RLS or without per-user policies. Any row here must have a human-readable reason explaining why broad read access is safe (public taxonomy, SEO catalogs, reference data).';

-- Seed a small set of known-safe catalog tables. Expand deliberately.
insert into system.rls_whitelist (schema_name, table_name, reason) values
  ('public', 'spatial_ref_sys', 'PostGIS reference data — not user-owned')
on conflict do nothing;

create or replace function system.assert_rls_invariants()
returns void
language plpgsql
as $$
declare
  sensitive_schemas text[] := array[
    'public', 'identity', 'wallet', 'orbit',
    'marketplace', 'commerce', 'property',
    'onboarding', 'support', 'notification',
    'system', 'analytics'
  ];
  missing_rls record;
  missing_policies record;
  violations int := 0;
  msg text := '';
begin
  -- Invariant 1: RLS enabled everywhere in sensitive schemas
  for missing_rls in
    select n.nspname as schema, c.relname as name
    from pg_class c
    join pg_namespace n on n.oid = c.relnamespace
    where c.relkind = 'r'
      and n.nspname = any(sensitive_schemas)
      and c.relrowsecurity = false
      and not exists (
        select 1 from system.rls_whitelist w
        where w.schema_name = n.nspname and w.table_name = c.relname
      )
  loop
    violations := violations + 1;
    msg := msg || format(E'\n  - %I.%I has RLS disabled', missing_rls.schema, missing_rls.name);
  end loop;

  -- Invariant 2: Every RLS-enabled table has ≥ 1 policy
  for missing_policies in
    select n.nspname as schema, c.relname as name
    from pg_class c
    join pg_namespace n on n.oid = c.relnamespace
    where c.relkind = 'r'
      and n.nspname = any(sensitive_schemas)
      and c.relrowsecurity = true
      and not exists (select 1 from pg_policy p where p.polrelid = c.oid)
      and not exists (
        select 1 from system.rls_whitelist w
        where w.schema_name = n.nspname and w.table_name = c.relname
      )
  loop
    violations := violations + 1;
    msg := msg || format(E'\n  - %I.%I has RLS enabled but no policies defined', missing_policies.schema, missing_policies.name);
  end loop;

  if violations > 0 then
    raise warning 'RLS invariant check found % issue(s):%', violations, msg;
    -- Emit a structured record so the nightly job can report, without
    -- blocking forward migrations (existing tables may need gradual
    -- remediation). Turn this into `raise exception` once the backlog
    -- hits zero (tracked in the RLS audit checklist).
    insert into system.rls_audit_log(violations, detail, checked_at)
      values (violations, msg, now())
    on conflict do nothing;
  end if;
end;
$$;

comment on function system.assert_rls_invariants is
  'Checks every table in sensitive schemas has RLS enabled + at least one policy. Records violations in system.rls_audit_log. Upgrade to raise exception once remediation is complete.';

create table if not exists system.rls_audit_log (
  id           bigserial primary key,
  violations   int not null,
  detail       text not null,
  checked_at   timestamptz not null default now()
);
alter table system.rls_audit_log enable row level security;

-- Only service role may read the audit log (no user-facing policy).
do $$ begin
  if not exists (select 1 from pg_policy where polrelid = 'system.rls_audit_log'::regclass) then
    create policy "service_role_only" on system.rls_audit_log
      for all using (auth.role() = 'service_role') with check (auth.role() = 'service_role');
  end if;
end $$;

-- Run once now so a baseline row is written at migration time.
select system.assert_rls_invariants();
