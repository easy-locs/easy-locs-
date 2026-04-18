-- ============================================================================
-- Armée d'Agents Hiérarchisée — Governance schema
-- Creates an isolated `army` schema so we don't collide with existing
-- `system.execution_tasks`, `system.agents`, etc. The whole pipeline
-- (orders → tasks → approvals → workers → reports) lives here.
-- ============================================================================

create schema if not exists army;

-- ----------------------------------------------------------------------------
-- 0. Helpers — Supreme Commander check
-- ----------------------------------------------------------------------------
-- Resolve "is supreme commander" by checking known role tables in a tolerant
-- way (the project has multiple admin role conventions). We keep this as
-- security-definer so RLS callers can invoke it without breaking.
create or replace function army.current_is_supreme()
returns boolean language plpgsql stable security definer set search_path = public as $$
declare
  v_uid uuid := auth.uid();
  v_ok  boolean := false;
begin
  if v_uid is null then return false; end if;
  begin
    execute 'select exists(select 1 from public.user_roles
              where user_id = $1 and role::text in
                (''super_admin'',''supreme_commander'',''admin''))'
      into v_ok using v_uid;
    if v_ok then return true; end if;
  exception when undefined_table then null; when undefined_column then null;
  end;
  begin
    execute 'select coalesce((select is_super_admin from public.profiles where id = $1), false)'
      into v_ok using v_uid;
    if v_ok then return true; end if;
  exception when undefined_table then null; when undefined_column then null;
  end;
  return false;
end;
$$;

-- ----------------------------------------------------------------------------
-- 1. system_flags  — global kill switch + feature flags
-- ----------------------------------------------------------------------------
create table if not exists army.system_flags (
  key            text primary key,
  value          jsonb not null default '{}'::jsonb,
  updated_at     timestamptz not null default now(),
  updated_by     uuid references auth.users(id) on delete set null
);

insert into army.system_flags(key, value)
values
  ('army_kill_switch', '{"active": false, "reason": null}'::jsonb),
  ('army_budget_eur',  '{"daily_cap": 50, "consumed_today": 0}'::jsonb),
  ('army_quota',       '{"max_active_agents": 64, "per_general": 12}'::jsonb)
on conflict (key) do nothing;

-- ----------------------------------------------------------------------------
-- 2. agent_roles + agent_policies — hierarchy + permissions
-- ----------------------------------------------------------------------------
create table if not exists army.agent_roles (
  code           text primary key,
  rank           text not null check (rank in ('supreme','chief','general','captain','worker')),
  display_name   text not null,
  domain         text,
  parent_code    text references army.agent_roles(code),
  description    text,
  created_at     timestamptz not null default now()
);

create index if not exists agent_roles_rank_idx on army.agent_roles(rank);
create index if not exists agent_roles_domain_idx on army.agent_roles(domain);

create table if not exists army.agent_policies (
  id             uuid primary key default gen_random_uuid(),
  role_code      text not null references army.agent_roles(code) on delete cascade,
  permission     text not null,           -- e.g. 'task.create', 'agent.spawn'
  scope          text not null default 'own_domain', -- own_domain | global | self
  allowed        boolean not null default true,
  conditions     jsonb not null default '{}'::jsonb,
  created_at     timestamptz not null default now(),
  unique(role_code, permission, scope)
);

create index if not exists agent_policies_role_idx on army.agent_policies(role_code);

-- Seed the canonical hierarchy
insert into army.agent_roles(code, rank, display_name, domain, parent_code, description) values
  ('supreme_commander', 'supreme', 'Supreme Commander', null, null, 'Human operator, full authority'),
  ('chief_orchestrator', 'chief', 'Chief Orchestrator', null, 'supreme_commander', 'Routes orders to generals'),
  ('general_product',  'general', 'General — Product',     'product',  'chief_orchestrator', null),
  ('general_growth',   'general', 'General — Growth',      'growth',   'chief_orchestrator', null),
  ('general_ops',      'general', 'General — Ops',         'ops',      'chief_orchestrator', null),
  ('general_finance',  'general', 'General — Finance',     'finance',  'chief_orchestrator', null),
  ('general_qa_sec',   'general', 'General — QA/Security', 'security', 'chief_orchestrator', null),
  ('general_data',     'general', 'General — Data',        'data',     'chief_orchestrator', null),
  ('captain_generic',  'captain', 'Captain (generic)',     null,       null, 'Per-subdomain coordinator'),
  ('worker_generic',   'worker',  'Worker (disposable)',   null,       'captain_generic', 'TTL-bound executor')
on conflict (code) do nothing;

-- Seed policies. The policy name is the convention: <action>.<target>
-- Forbidden actions: explicit `allowed=false`.
insert into army.agent_policies(role_code, permission, scope, allowed, conditions) values
  -- Supreme: everything
  ('supreme_commander', 'order.create',     'global',     true,  '{}'),
  ('supreme_commander', 'army.kill',        'global',     true,  '{}'),
  ('supreme_commander', 'task.approve',     'global',     true,  '{}'),
  ('supreme_commander', 'task.reject',      'global',     true,  '{}'),
  ('supreme_commander', 'agent.kill',       'global',     true,  '{}'),
  -- Chief
  ('chief_orchestrator', 'order.dispatch',  'global',     true,  '{}'),
  ('chief_orchestrator', 'task.create',     'global',     true,  '{}'),
  ('chief_orchestrator', 'agent.spawn',     'global',     true,  '{"max_per_call":3}'),
  -- Generals (per-domain)
  ('general_product', 'task.create',  'own_domain', true, '{}'),
  ('general_product', 'agent.spawn',  'own_domain', true, '{}'),
  ('general_growth',  'task.create',  'own_domain', true, '{}'),
  ('general_growth',  'agent.spawn',  'own_domain', true, '{}'),
  ('general_ops',     'task.create',  'own_domain', true, '{}'),
  ('general_ops',     'agent.spawn',  'own_domain', true, '{}'),
  ('general_finance', 'task.create',  'own_domain', true, '{}'),
  ('general_finance', 'agent.spawn',  'own_domain', true, '{}'),
  ('general_qa_sec',  'task.create',  'own_domain', true, '{}'),
  ('general_qa_sec',  'agent.spawn',  'own_domain', true, '{}'),
  ('general_data',    'task.create',  'own_domain', true, '{}'),
  ('general_data',    'agent.spawn',  'own_domain', true, '{}'),
  -- Captain
  ('captain_generic', 'task.plan',    'own_domain', true,  '{}'),
  ('captain_generic', 'task.dispatch','own_domain', true,  '{}'),
  -- Worker
  ('worker_generic',  'task.execute', 'self',       true,  '{}'),
  ('worker_generic',  'task.report',  'self',       true,  '{}'),
  -- Universal interdictions (apply to ALL non-supreme roles)
  ('chief_orchestrator', 'publish.critical',   'global', false, '{"why":"requires supreme approval"}'),
  ('chief_orchestrator', 'payment.execute',    'global', false, '{"why":"requires supreme approval"}'),
  ('chief_orchestrator', 'data.delete_global', 'global', false, '{"why":"forbidden"}'),
  ('chief_orchestrator', 'schema.migrate',     'global', false, '{"why":"forbidden"}'),
  ('worker_generic',     'publish.critical',   'global', false, '{}'),
  ('worker_generic',     'payment.execute',    'global', false, '{}'),
  ('worker_generic',     'data.delete_global', 'global', false, '{}'),
  ('worker_generic',     'schema.migrate',     'global', false, '{}'),
  ('worker_generic',     'cross_domain.access','global', false, '{}')
on conflict (role_code, permission, scope) do nothing;

-- ----------------------------------------------------------------------------
-- 3. agent_instances — live registry of running agents (with TTL)
-- ----------------------------------------------------------------------------
create table if not exists army.agent_instances (
  id              uuid primary key default gen_random_uuid(),
  role_code       text not null references army.agent_roles(code),
  domain          text,
  parent_id       uuid references army.agent_instances(id) on delete set null,
  status          text not null default 'active'
                    check (status in ('spawning','active','idle','terminated','crashed')),
  spawned_at      timestamptz not null default now(),
  ttl_at          timestamptz not null,        -- mandatory TTL
  terminated_at   timestamptz,
  spawned_by      uuid references auth.users(id) on delete set null,
  spawn_reason    text,
  metadata        jsonb not null default '{}'::jsonb
);

create index if not exists agent_instances_status_idx on army.agent_instances(status);
create index if not exists agent_instances_role_idx on army.agent_instances(role_code);
create index if not exists agent_instances_ttl_idx on army.agent_instances(ttl_at) where status = 'active';

-- ----------------------------------------------------------------------------
-- 4. command_orders — top-level intent from Supreme Commander
-- ----------------------------------------------------------------------------
create table if not exists army.command_orders (
  id              uuid primary key default gen_random_uuid(),
  title           text not null,
  description     text,
  domain          text,
  risk            text not null default 'normal' check (risk in ('low','normal','high','critical')),
  priority        int  not null default 5,
  status          text not null default 'queued'
                    check (status in ('queued','dispatching','running','completed','failed','rejected','cancelled')),
  issued_by       uuid references auth.users(id) on delete set null,
  issued_at       timestamptz not null default now(),
  completed_at    timestamptz,
  result          jsonb,
  metadata        jsonb not null default '{}'::jsonb
);

create index if not exists command_orders_status_idx on army.command_orders(status);
create index if not exists command_orders_domain_idx on army.command_orders(domain);
create index if not exists command_orders_issued_idx on army.command_orders(issued_at desc);

-- ----------------------------------------------------------------------------
-- 5. execution_tasks — units of work, child of command_orders
-- ----------------------------------------------------------------------------
create table if not exists army.execution_tasks (
  id              uuid primary key default gen_random_uuid(),
  order_id        uuid not null references army.command_orders(id) on delete cascade,
  parent_task_id  uuid references army.execution_tasks(id) on delete set null,
  domain          text not null,
  type            text not null,
  payload         jsonb not null default '{}'::jsonb,
  risk            text not null default 'normal' check (risk in ('low','normal','high','critical')),
  status          text not null default 'queued'
                    check (status in ('queued','planning','awaiting_approval','running','completed','failed','rejected','cancelled')),
  assigned_role   text references army.agent_roles(code),
  assigned_agent  uuid references army.agent_instances(id) on delete set null,
  attempts        int  not null default 0,
  max_attempts    int  not null default 3,
  cost_eur        numeric(10,4) not null default 0,
  cost_tokens     int  not null default 0,
  result          jsonb,
  error           text,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  started_at      timestamptz,
  completed_at    timestamptz
);

create index if not exists execution_tasks_order_idx on army.execution_tasks(order_id);
create index if not exists execution_tasks_status_idx on army.execution_tasks(status);
create index if not exists execution_tasks_domain_idx on army.execution_tasks(domain);
create index if not exists execution_tasks_agent_idx on army.execution_tasks(assigned_agent);

-- ----------------------------------------------------------------------------
-- 6. task_approvals — human-gated decisions for risk='critical' tasks
-- ----------------------------------------------------------------------------
create table if not exists army.task_approvals (
  id              uuid primary key default gen_random_uuid(),
  task_id         uuid not null references army.execution_tasks(id) on delete cascade,
  status          text not null default 'pending'
                    check (status in ('pending','approved','rejected','expired')),
  requested_at    timestamptz not null default now(),
  decided_at      timestamptz,
  decided_by      uuid references auth.users(id) on delete set null,
  reason          text,
  unique(task_id)
);

create index if not exists task_approvals_status_idx on army.task_approvals(status);

-- ----------------------------------------------------------------------------
-- 7. agent_messages — inter-agent communication log
-- ----------------------------------------------------------------------------
create table if not exists army.agent_messages (
  id              bigserial primary key,
  order_id        uuid references army.command_orders(id) on delete cascade,
  task_id         uuid references army.execution_tasks(id) on delete cascade,
  from_role       text,
  to_role         text,
  from_agent      uuid references army.agent_instances(id) on delete set null,
  to_agent        uuid references army.agent_instances(id) on delete set null,
  kind            text not null,           -- dispatch | report | escalate | heartbeat
  payload         jsonb not null default '{}'::jsonb,
  created_at      timestamptz not null default now()
);

create index if not exists agent_messages_task_idx on army.agent_messages(task_id);
create index if not exists agent_messages_order_idx on army.agent_messages(order_id);
create index if not exists agent_messages_created_idx on army.agent_messages(created_at desc);

-- ----------------------------------------------------------------------------
-- 8. incident_log — every escalation / policy violation
-- ----------------------------------------------------------------------------
create table if not exists army.incident_log (
  id              uuid primary key default gen_random_uuid(),
  severity        text not null default 'warn'
                    check (severity in ('info','warn','error','critical')),
  source_agent    uuid references army.agent_instances(id) on delete set null,
  source_role     text,
  task_id         uuid references army.execution_tasks(id) on delete set null,
  order_id        uuid references army.command_orders(id) on delete set null,
  kind            text not null,           -- policy_violation | quota_exceeded | crash | escalation | kill
  message         text not null,
  context         jsonb not null default '{}'::jsonb,
  resolved_at     timestamptz,
  created_at      timestamptz not null default now()
);

create index if not exists incident_log_severity_idx on army.incident_log(severity);
create index if not exists incident_log_open_idx on army.incident_log(created_at desc) where resolved_at is null;

-- ----------------------------------------------------------------------------
-- 9. agent_metrics — latency / cost / outcome per task
-- ----------------------------------------------------------------------------
create table if not exists army.agent_metrics (
  id              bigserial primary key,
  agent_id        uuid references army.agent_instances(id) on delete set null,
  task_id         uuid references army.execution_tasks(id) on delete set null,
  role_code       text,
  domain          text,
  outcome         text check (outcome in ('success','failure','timeout','rejected')),
  latency_ms      int,
  cost_eur        numeric(10,4),
  cost_tokens     int,
  recorded_at     timestamptz not null default now()
);

create index if not exists agent_metrics_role_idx on army.agent_metrics(role_code, recorded_at desc);
create index if not exists agent_metrics_task_idx on army.agent_metrics(task_id);

-- ----------------------------------------------------------------------------
-- 10. queues — FIFO tables (pgmq-compatible fallback) + queue registry
-- ----------------------------------------------------------------------------
create table if not exists army.queue_registry (
  name            text primary key,
  description     text,
  created_at      timestamptz not null default now()
);

insert into army.queue_registry(name, description) values
  ('q_high_command', 'Supreme commander → chief orchestrator'),
  ('q_product',      'General Product backlog'),
  ('q_growth',       'General Growth backlog'),
  ('q_ops',          'General Ops backlog'),
  ('q_security',     'General QA/Security backlog'),
  ('q_repair',       'Self-healing / agent recycling')
on conflict (name) do nothing;

create table if not exists army.queue_messages (
  id              bigserial primary key,
  queue_name      text not null references army.queue_registry(name),
  payload         jsonb not null,
  visible_at      timestamptz not null default now(),
  locked_until    timestamptz,
  attempts        int not null default 0,
  created_at      timestamptz not null default now()
);

create index if not exists queue_messages_q_idx
  on army.queue_messages(queue_name, visible_at)
  where locked_until is null or locked_until < now();

-- Best-effort pgmq provisioning (creates real pgmq queues if extension present).
do $$
declare q text;
begin
  if exists (select 1 from pg_extension where extname = 'pgmq') then
    foreach q in array array['q_high_command','q_product','q_growth','q_ops','q_security','q_repair']
    loop
      begin perform pgmq.create(q); exception when others then null; end;
    end loop;
  end if;
end $$;

<<<<<<< HEAD
<<<<<<< HEAD
-- Seed the 6 canonical queues (logical only — table is shared)
-- 'q_high_command','q_product','q_growth','q_ops','q_security','q_repair'
=======
>>>>>>> 36012f7de8 (Task #998 — Hierarchical agent army (Command Center + Supabase))

=======
>>>>>>> fdd152f1ea (Task #998 — Hierarchical agent army (Command Center + Supabase))
-- ----------------------------------------------------------------------------
-- 11. RPCs — kill switch, approve/reject, spawn-validation
-- ----------------------------------------------------------------------------

-- Check the global kill switch in O(1).
create or replace function army.is_killed()
returns boolean language sql stable as $$
  select coalesce(
    (select (value->>'active')::boolean from army.system_flags where key = 'army_kill_switch'),
    false);
$$;

-- KILL ARMY — flip flag, drain queues, terminate agents, log incident.
create or replace function army.kill_army(p_reason text)
returns jsonb language plpgsql security definer set search_path = army, public as $$
declare
  v_drained int;
  v_terminated int;
begin
  if not army.current_is_supreme() then
    raise exception 'forbidden: only Supreme Commander can kill the army';
  end if;

  update army.system_flags
     set value = jsonb_build_object('active', true, 'reason', coalesce(p_reason,'manual'),
                                    'at', to_jsonb(now())),
         updated_at = now(),
         updated_by = auth.uid()
   where key = 'army_kill_switch';

  delete from army.queue_messages;
  get diagnostics v_drained = row_count;

  update army.agent_instances
     set status = 'terminated',
         terminated_at = now()
   where status in ('active','idle','spawning');
  get diagnostics v_terminated = row_count;

  update army.execution_tasks
     set status = 'cancelled',
         updated_at = now(),
         error = 'killed_by_supreme'
   where status in ('queued','planning','running','awaiting_approval');

  insert into army.incident_log(severity, kind, source_role, message, context)
  values ('critical', 'kill', 'supreme_commander',
          'KILL ARMY triggered: ' || coalesce(p_reason,'manual'),
          jsonb_build_object('drained', v_drained, 'terminated', v_terminated));

  return jsonb_build_object('drained', v_drained, 'terminated', v_terminated);
end;
$$;

-- Lift the kill switch.
create or replace function army.revive_army()
returns jsonb language plpgsql security definer set search_path = army, public as $$
begin
  if not army.current_is_supreme() then
    raise exception 'forbidden';
  end if;
  update army.system_flags
     set value = jsonb_set(value, '{active}', 'false'::jsonb),
         updated_at = now(),
         updated_by = auth.uid()
   where key = 'army_kill_switch';
  insert into army.incident_log(severity, kind, source_role, message)
  values ('info','kill','supreme_commander','army revived');
  return jsonb_build_object('ok', true);
end;
$$;

-- Approve / reject / retry / kill RPCs called from cockpit
create or replace function army.approve_task(p_task_id uuid, p_reason text default null)
returns jsonb language plpgsql security definer set search_path = army, public as $$
begin
  if not army.current_is_supreme() then raise exception 'forbidden'; end if;
  update army.task_approvals
     set status='approved', decided_at=now(), decided_by=auth.uid(), reason=p_reason
   where task_id = p_task_id and status='pending';
  update army.execution_tasks
     set status='queued', updated_at=now()
   where id = p_task_id and status='awaiting_approval';
  insert into army.agent_messages(task_id, from_role, to_role, kind, payload)
  values (p_task_id, 'supreme_commander', 'chief_orchestrator', 'approval',
          jsonb_build_object('decision','approved','reason',p_reason));
  return jsonb_build_object('ok', true);
end;
$$;

create or replace function army.reject_task(p_task_id uuid, p_reason text default null)
returns jsonb language plpgsql security definer set search_path = army, public as $$
begin
  if not army.current_is_supreme() then raise exception 'forbidden'; end if;
  update army.task_approvals
     set status='rejected', decided_at=now(), decided_by=auth.uid(), reason=p_reason
   where task_id = p_task_id and status='pending';
  update army.execution_tasks
     set status='rejected', updated_at=now(), error='rejected_by_supreme'
   where id = p_task_id;
  insert into army.incident_log(severity, kind, task_id, source_role, message, context)
  values ('warn', 'escalation', p_task_id, 'supreme_commander',
          'task rejected', jsonb_build_object('reason', p_reason));
  return jsonb_build_object('ok', true);
end;
$$;

create or replace function army.retry_task(p_task_id uuid)
returns jsonb language plpgsql security definer set search_path = army, public as $$
begin
  if not army.current_is_supreme() then raise exception 'forbidden'; end if;
  update army.execution_tasks
     set status='queued', updated_at=now(), error=null,
         attempts = attempts + 1
   where id = p_task_id and status in ('failed','cancelled');
  return jsonb_build_object('ok', true);
end;
$$;

create or replace function army.kill_agent(p_agent_id uuid, p_reason text default 'manual')
returns jsonb language plpgsql security definer set search_path = army, public as $$
begin
  if not army.current_is_supreme() then raise exception 'forbidden'; end if;
  update army.agent_instances
     set status='terminated', terminated_at=now()
   where id = p_agent_id;
  update army.execution_tasks
     set status='cancelled', updated_at=now(), error='agent_killed'
   where assigned_agent = p_agent_id and status in ('queued','running','planning');
  insert into army.incident_log(severity, kind, source_agent, source_role, message)
  values ('warn','kill', p_agent_id, 'supreme_commander', 'agent killed: ' || p_reason);
  return jsonb_build_object('ok', true);
end;
$$;

-- Validate the 8 spawn conditions. Returns ok=true or { ok:false, reason }.
create or replace function army.can_spawn(
  p_role_code     text,
  p_domain        text,
  p_task_type     text,
  p_dedup_key     text default null
) returns jsonb language plpgsql stable security definer set search_path = army, public as $$
declare
  v_role          army.agent_roles%rowtype;
  v_active_total  int;
  v_active_domain int;
  v_quota_total   int;
  v_quota_dom     int;
  v_budget_cap    numeric;
  v_budget_used   numeric;
  v_backlog       int;
  v_dup           int;
begin
  if army.is_killed() then
    return jsonb_build_object('ok', false, 'reason', 'army_killed');
  end if;

  select * into v_role from army.agent_roles where code = p_role_code;
  if not found then
    return jsonb_build_object('ok', false, 'reason', 'unknown_role');
  end if;

  -- Domain authorization: role.domain must match (null = global allowed)
  if v_role.domain is not null and v_role.domain <> p_domain then
    return jsonb_build_object('ok', false, 'reason', 'cross_domain_forbidden');
  end if;

  -- Type authorized? Workers must come from worker rank.
  if v_role.rank not in ('worker','captain') then
    return jsonb_build_object('ok', false, 'reason', 'only_workers_or_captains_can_be_spawned');
  end if;

  -- Quota
  select (value->>'max_active_agents')::int,
         (value->>'per_general')::int
    into v_quota_total, v_quota_dom
    from army.system_flags where key = 'army_quota';

  select count(*) into v_active_total
    from army.agent_instances where status in ('spawning','active','idle');
  if v_active_total >= coalesce(v_quota_total, 64) then
    return jsonb_build_object('ok', false, 'reason', 'quota_total_exceeded');
  end if;

  select count(*) into v_active_domain
    from army.agent_instances
   where status in ('spawning','active','idle') and domain = p_domain;
  if v_active_domain >= coalesce(v_quota_dom, 12) then
    return jsonb_build_object('ok', false, 'reason', 'quota_domain_exceeded');
  end if;

  -- Budget
  select (value->>'daily_cap')::numeric,
         (value->>'consumed_today')::numeric
    into v_budget_cap, v_budget_used
    from army.system_flags where key = 'army_budget_eur';
  if coalesce(v_budget_used,0) >= coalesce(v_budget_cap,50) then
    return jsonb_build_object('ok', false, 'reason', 'budget_exceeded');
  end if;

  -- Backlog (must justify spawn): there must be at least 1 queued task
  select count(*) into v_backlog
    from army.execution_tasks
   where domain = p_domain and status in ('queued','planning');
  if v_backlog < 1 then
    return jsonb_build_object('ok', false, 'reason', 'no_backlog');
  end if;

  -- Dedup
  if p_dedup_key is not null then
    select count(*) into v_dup
      from army.agent_instances
     where status in ('spawning','active','idle')
       and metadata->>'dedup_key' = p_dedup_key;
    if v_dup > 0 then
      return jsonb_build_object('ok', false, 'reason', 'duplicate');
    end if;
  end if;

  -- Policy validated (role must have agent.spawn target — the spawning role
  -- isn't this one; this is informational). We accept here.
  return jsonb_build_object('ok', true);
end;
$$;

-- ----------------------------------------------------------------------------
-- 12. Triggers — auto-bookkeeping
-- ----------------------------------------------------------------------------
create or replace function army.touch_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at := now(); return new; end;
$$;

drop trigger if exists trg_orders_touch on army.command_orders;
drop trigger if exists trg_tasks_touch on army.execution_tasks;

create trigger trg_tasks_touch before update on army.execution_tasks
  for each row execute function army.touch_updated_at();

-- Auto-create approval row when a task becomes critical
create or replace function army.tg_critical_to_approval()
returns trigger language plpgsql as $$
begin
  if new.risk = 'critical' and new.status = 'queued' then
    new.status := 'awaiting_approval';
    insert into army.task_approvals(task_id) values (new.id)
    on conflict (task_id) do nothing;
    insert into army.incident_log(severity, kind, task_id, source_role, message, context)
    values ('warn','escalation', new.id, new.assigned_role,
            'critical task awaiting approval',
            jsonb_build_object('domain', new.domain, 'type', new.type));
  end if;
  return new;
end;
$$;

drop trigger if exists trg_tasks_critical on army.execution_tasks;
create trigger trg_tasks_critical before insert on army.execution_tasks
  for each row execute function army.tg_critical_to_approval();

-- ----------------------------------------------------------------------------
-- 13. Aggregated view consumed by the cockpit
-- ----------------------------------------------------------------------------
create or replace view army.v_general_state as
  with q_depth as (
    select coalesce(payload->>'domain', queue_name) as domain, count(*) as depth
      from army.queue_messages
     group by 1
  ),
  active_agents as (
    select domain, count(*) as live
      from army.agent_instances
     where status in ('active','idle','spawning')
     group by domain
  ),
  open_inc as (
    select coalesce(context->>'domain', source_role) as domain, count(*) as incidents
      from army.incident_log
     where resolved_at is null and severity in ('error','critical')
     group by 1
  )
  select r.code             as role_code,
         r.display_name     as name,
         r.domain           as domain,
         coalesce(q.depth, 0)        as queue_depth,
         coalesce(a.live, 0)         as active_agents,
         coalesce(i.incidents, 0)    as open_incidents,
         case when coalesce(i.incidents,0) > 5 then 'degraded'
              when army.is_killed() then 'offline'
              else 'online' end      as health
    from army.agent_roles r
    left join q_depth      q on q.domain = r.domain
    left join active_agents a on a.domain = r.domain
    left join open_inc     i on i.domain = r.domain
   where r.rank = 'general';

create or replace view army.v_army_dashboard as
  select
    (select coalesce(sum(cost_eur),0) from army.execution_tasks
       where created_at > now() - interval '24 hours')          as cost_eur_24h,
    (select coalesce(sum(cost_tokens),0) from army.execution_tasks
       where created_at > now() - interval '24 hours')          as cost_tokens_24h,
    (select count(*) from army.agent_instances
       where status in ('active','idle','spawning'))            as active_agents,
    (select count(*) from army.command_orders
       where status in ('queued','dispatching','running'))       as open_orders,
    (select count(*) from army.execution_tasks
       where status = 'awaiting_approval')                       as pending_approvals,
    (select count(*) from army.incident_log
       where resolved_at is null and severity in ('error','critical')) as open_incidents,
    army.is_killed()                                              as kill_switch_active;

-- ----------------------------------------------------------------------------
-- 14. RLS
-- ----------------------------------------------------------------------------
alter table army.system_flags     enable row level security;
alter table army.agent_roles      enable row level security;
alter table army.agent_policies   enable row level security;
alter table army.agent_instances  enable row level security;
alter table army.command_orders   enable row level security;
alter table army.execution_tasks  enable row level security;
alter table army.task_approvals   enable row level security;
alter table army.agent_messages   enable row level security;
alter table army.incident_log     enable row level security;
alter table army.agent_metrics    enable row level security;
alter table army.queue_messages   enable row level security;
alter table army.queue_registry   enable row level security;

-- Read access: any authenticated user reads roles/policies (governance is public).
drop policy if exists army_roles_read on army.agent_roles;
create policy army_roles_read on army.agent_roles
  for select to authenticated using (true);

drop policy if exists army_policies_read on army.agent_policies;
create policy army_policies_read on army.agent_policies
  for select to authenticated using (true);

-- Supreme-only mutation policies on every table.
do $$
declare t text; pname text;
begin
  for t in select unnest(array[
      'system_flags','agent_instances','command_orders','execution_tasks',
      'task_approvals','agent_messages','incident_log','agent_metrics',
      'queue_messages','queue_registry','agent_roles','agent_policies'])
  loop
    pname := 'army_' || t || '_supreme';
    execute format('drop policy if exists %I on army.%I', pname, t);
    execute format($f$
      create policy %I on army.%I
        for all to authenticated
        using (army.current_is_supreme())
        with check (army.current_is_supreme());
    $f$, pname, t);
  end loop;
end $$;

-- service_role bypasses RLS — edge functions use it for the actual pipeline.

-- ----------------------------------------------------------------------------
-- 15. Realtime
-- ----------------------------------------------------------------------------
do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    begin alter publication supabase_realtime add table army.command_orders; exception when others then null; end;
    begin alter publication supabase_realtime add table army.execution_tasks; exception when others then null; end;
    begin alter publication supabase_realtime add table army.agent_instances; exception when others then null; end;
    begin alter publication supabase_realtime add table army.task_approvals; exception when others then null; end;
    begin alter publication supabase_realtime add table army.incident_log; exception when others then null; end;
    begin alter publication supabase_realtime add table army.system_flags; exception when others then null; end;
  end if;
end $$;

-- ----------------------------------------------------------------------------
-- 16. Tick configuration + autonomous dispatcher
-- ----------------------------------------------------------------------------
-- Single-row config table holding the URL+key the cron uses to reach
-- the `army-tick` edge function. Lives in the army schema so it is
-- covered by the supreme-only RLS policies above. Operator must run
-- once after first deploy:
--
--   update army.tick_config
--      set supabase_url = 'https://<ref>.supabase.co',
--          service_role_key = '<service-role-jwt>'
--    where id = 1;
--
-- Until that happens, army.run_tick() short-circuits and writes a
-- single incident_log entry per hour so the gap is visible in the
-- cockpit. No URL/key is ever stored in the migration itself.
create table if not exists army.tick_config (
  id                smallint primary key default 1 check (id = 1),
  supabase_url      text,
  service_role_key  text,
  last_run_at       timestamptz,
  last_warned_at    timestamptz,
  updated_at        timestamptz not null default now()
);
insert into army.tick_config(id) values (1) on conflict (id) do nothing;
alter table army.tick_config enable row level security;
drop policy if exists army_tick_config_supreme on army.tick_config;
create policy army_tick_config_supreme on army.tick_config
  for all to authenticated using (army.current_is_supreme()) with check (army.current_is_supreme());

-- run_tick: invoked by pg_cron every minute. Validates non-empty
-- config, then calls the army-tick edge function via pg_net.
create or replace function army.run_tick() returns void
language plpgsql security definer set search_path = army, public as $$
declare
  cfg army.tick_config%rowtype;
begin
  if army.is_killed() then
    return;
  end if;
  select * into cfg from army.tick_config where id = 1;
  if cfg.supabase_url is null or length(cfg.supabase_url) = 0
     or cfg.service_role_key is null or length(cfg.service_role_key) = 0 then
    if cfg.last_warned_at is null or cfg.last_warned_at < now() - interval '1 hour' then
      insert into army.incident_log(severity, kind, source_role, message, context)
      values ('warn','tick_config_missing','supreme_commander',
              'army.tick_config not set — autonomous tick disabled',
              jsonb_build_object('hint','update army.tick_config set supabase_url=..., service_role_key=...'));
      update army.tick_config set last_warned_at = now() where id = 1;
    end if;
    return;
  end if;
  if not exists (select 1 from pg_extension where extname = 'pg_net') then
    return;
  end if;
  perform net.http_post(
    url     := cfg.supabase_url || '/functions/v1/army-tick',
    headers := jsonb_build_object('Content-Type','application/json',
                                  'Authorization','Bearer ' || cfg.service_role_key),
    body    := '{}'::jsonb
  );
  update army.tick_config set last_run_at = now() where id = 1;
end;
$$;
revoke all on function army.run_tick() from public;
grant execute on function army.run_tick() to service_role;

<<<<<<< HEAD
-- pg_cron jobs (best-effort: skip if pg_cron unavailable)
=======
-- 16. pg_cron jobs (best-effort: skip if pg_cron unavailable)
>>>>>>> 36012f7de8 (Task #998 — Hierarchical agent army (Command Center + Supabase))
-- ----------------------------------------------------------------------------
do $$
begin
  if exists (select 1 from pg_extension where extname = 'pg_cron') then
    -- TTL sweep + stuck-task detection
    perform cron.schedule(
      'army_ttl_sweep',
      '*/5 * * * *',
      $cron$
        update army.agent_instances
           set status = 'terminated', terminated_at = now()
         where status in ('active','idle','spawning') and ttl_at < now();
        update army.execution_tasks
           set status = 'failed', error = 'stuck_timeout', updated_at = now()
         where status = 'running' and started_at < now() - interval '20 minutes';
      $cron$
    );
    -- Autonomous tick — runs every minute. army.run_tick() validates
    -- that supabase_url + service_role_key are present (and aborts
    -- otherwise with a logged incident) so this schedule is safe to
    -- create unconditionally.
    perform cron.schedule(
      'army_tick_dispatcher',
      '* * * * *',
      $cron$ select army.run_tick(); $cron$
    );

    -- Autonomous pipeline tick: drives the whole army every minute
    -- without any human intervention. Calls the army-tick edge function
    -- with the service-role key so the entire chain advances.
    if exists (select 1 from pg_extension where extname = 'pg_net') then
      begin
        perform cron.schedule(
          'army_tick_dispatcher_v2',
          '* * * * *',
          format($cron$
            select net.http_post(
              url     := %L,
              headers := jsonb_build_object('Content-Type','application/json',
                                            'Authorization','Bearer ' || %L),
              body    := '{}'::jsonb
            );
          $cron$,
          coalesce(current_setting('app.supabase_url', true), '') || '/functions/v1/army-tick',
          coalesce(current_setting('app.service_role_key', true), '')
          )
        );
      exception when others then null;
      end;
    end if;

    -- Drain helper: empty the queue table for any orphaned/old messages
    perform cron.schedule(
      'army_queue_drain',
      '*/10 * * * *',
      $cron$
        delete from army.queue_messages
         where created_at < now() - interval '1 day';
      $cron$
    );
  end if;
exception when others then null;
end $$;

grant usage on schema army to authenticated, service_role, anon;
grant select on army.agent_roles, army.agent_policies, army.v_general_state, army.v_army_dashboard
  to authenticated;
grant execute on function army.kill_army(text), army.revive_army(),
                          army.approve_task(uuid,text), army.reject_task(uuid,text),
                          army.retry_task(uuid), army.kill_agent(uuid,text),
                          army.can_spawn(text,text,text,text), army.is_killed()
  to authenticated;
