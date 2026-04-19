-- ============================================================================
-- Command Execution System — Unified entry point for all army & approval ops
--
-- Creates an isolated `command` schema providing:
--   • A single RPC: command.execute_command()
--   • Immutable audit trail: command.executed_commands
--   • RBAC table: command.command_permissions
--
-- Every army/approval action in the frontend is routed through this single
-- RPC so that every mutation is logged, idempotent, and permission-checked.
-- ============================================================================

create schema if not exists command;

-- ----------------------------------------------------------------------------
-- 1. Command type enum
-- ----------------------------------------------------------------------------
do $$ begin
  create type command.command_type as enum (
    'approve_task',
    'reject_task',
    'retry_task',
    'kill_agent',
    'kill_army',
    'revive_army',
    'list_task_approvals',
    'decide_task_approval'
  );
exception when duplicate_object then null; end $$;

-- ----------------------------------------------------------------------------
-- 2. executed_commands — immutable audit trail
-- ----------------------------------------------------------------------------
create table if not exists command.executed_commands (
  id                 uuid        primary key default gen_random_uuid(),
  command_type       command.command_type not null,
  input              jsonb       not null default '{}'::jsonb,
  output             jsonb,
  status             text        not null default 'pending'
                       check (status in ('pending', 'success', 'error')),
  error_message      text,
  executed_by        uuid        references auth.users(id) on delete set null,
  idempotency_key    text        unique,
  created_at         timestamptz not null default now(),
  executed_at        timestamptz
);

create index if not exists executed_commands_type_idx     on command.executed_commands(command_type);
create index if not exists executed_commands_executor_idx on command.executed_commands(executed_by);
create index if not exists executed_commands_created_idx  on command.executed_commands(created_at desc);

-- RLS: admins can read the full audit trail; no direct writes allowed.
alter table command.executed_commands enable row level security;

create policy "executed_commands_admin_read"
  on command.executed_commands for select
  to authenticated
  using (army.current_is_supreme());

-- ----------------------------------------------------------------------------
-- 3. command_permissions — RBAC table
-- ----------------------------------------------------------------------------
create table if not exists command.command_permissions (
  id           uuid        primary key default gen_random_uuid(),
  command_type command.command_type not null,
  role_name    text        not null,
  allowed      boolean     not null default true,
  created_at   timestamptz not null default now(),
  unique (command_type, role_name)
);

alter table command.command_permissions enable row level security;

create policy "command_permissions_admin_read"
  on command.command_permissions for select
  to authenticated
  using (army.current_is_supreme());

-- Seed default permissions: all command types allowed for supreme_commander/admin
insert into command.command_permissions (command_type, role_name, allowed)
select t, r, true
from unnest(enum_range(null::command.command_type)) as t,
     unnest(array['super_admin', 'supreme_commander', 'admin']) as r
on conflict (command_type, role_name) do nothing;

-- ----------------------------------------------------------------------------
-- 4. Helper: check whether the calling user may run a given command
-- ----------------------------------------------------------------------------
create or replace function command.current_may_execute(p_command_type command.command_type)
returns boolean language plpgsql stable security definer set search_path = public as $$
declare
  v_uid  uuid    := auth.uid();
  v_ok   boolean := false;
begin
  if v_uid is null then return false; end if;

  -- Fast path: army supreme-commander check already covers super_admin/admin
  if army.current_is_supreme() then
    -- Verify there is an explicit allow entry (or no entry — default allow)
    select coalesce(
      (select allowed from command.command_permissions
       where command_type = p_command_type
         and role_name in ('super_admin', 'supreme_commander', 'admin')
       limit 1),
      true
    ) into v_ok;
    return v_ok;
  end if;

  return false;
end;
$$;

-- ----------------------------------------------------------------------------
-- 5. execute_command — single unified entry point
--
-- Parameters:
--   p_command_type   — one of the command.command_type enum values
--   p_input          — jsonb payload for the command (see per-type docs below)
--   p_idempotency_key — optional client-supplied key; second call with the
--                       same key returns the original audit row unchanged
--
-- Returns: jsonb  { "ok": true/false, "data": ..., "error": "..." }
--
-- Per-type input shapes:
--   approve_task           { "task_id": uuid, "reason"?: text }
--   reject_task            { "task_id": uuid, "reason"?: text }
--   retry_task             { "task_id": uuid }
--   kill_agent             { "agent_id": uuid, "reason"?: text }
--   kill_army              { "reason"?: text }
--   revive_army            {}
--   list_task_approvals    { "task_id": uuid }
--   decide_task_approval   { "task_id": uuid, "decision": text,
--                            "reason"?: text, "comment_md"?: text,
--                            "client_request_id"?: text }
-- ----------------------------------------------------------------------------
create or replace function command.execute_command(
  p_command_type     command.command_type,
  p_input            jsonb    default '{}'::jsonb,
  p_idempotency_key  text     default null
)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  v_uid        uuid    := auth.uid();
  v_audit_id   uuid;
  v_result     jsonb;
  v_existing   command.executed_commands%rowtype;
begin
  -- Permission gate
  if not command.current_may_execute(p_command_type) then
    return jsonb_build_object('ok', false, 'error', 'permission_denied');
  end if;

  -- Idempotency: return previous result if key already used
  if p_idempotency_key is not null then
    select * into v_existing
    from command.executed_commands
    where idempotency_key = p_idempotency_key;

    if found then
      return jsonb_build_object(
        'ok',         v_existing.status = 'success',
        'data',       v_existing.output,
        'error',      v_existing.error_message,
        'idempotent', true
      );
    end if;
  end if;

  -- Create pending audit record
  insert into command.executed_commands
    (command_type, input, executed_by, idempotency_key)
  values
    (p_command_type, p_input, v_uid, p_idempotency_key)
  returning id into v_audit_id;

  -- Dispatch to the appropriate handler
  begin
    case p_command_type

      when 'approve_task' then
        perform army.approve_task(
          (p_input->>'task_id')::uuid,
          p_input->>'reason'
        );
        v_result := jsonb_build_object('ok', true);

      when 'reject_task' then
        perform army.reject_task(
          (p_input->>'task_id')::uuid,
          p_input->>'reason'
        );
        v_result := jsonb_build_object('ok', true);

      when 'retry_task' then
        perform army.retry_task(
          (p_input->>'task_id')::uuid
        );
        v_result := jsonb_build_object('ok', true);

      when 'kill_agent' then
        perform army.kill_agent(
          (p_input->>'agent_id')::uuid,
          coalesce(p_input->>'reason', 'manual')
        );
        v_result := jsonb_build_object('ok', true);

      when 'kill_army' then
        perform army.kill_army(
          coalesce(p_input->>'reason', 'manual')
        );
        v_result := jsonb_build_object('ok', true);

      when 'revive_army' then
        perform army.revive_army();
        v_result := jsonb_build_object('ok', true);

      when 'list_task_approvals' then
        declare
          v_rows jsonb;
        begin
          select jsonb_agg(row_to_json(r))
          into   v_rows
          from   system.list_task_approvals(
                   (p_input->>'task_id')::uuid
                 ) r;
          v_result := jsonb_build_object('ok', true, 'data', coalesce(v_rows, '[]'::jsonb));
        end;

      when 'decide_task_approval' then
        declare
          v_row jsonb;
        begin
          select row_to_json(r) into v_row
          from system.decide_task_approval(
            p_task_id          := (p_input->>'task_id')::uuid,
            p_decision         := p_input->>'decision',
            p_reason           := p_input->>'reason',
            p_comment_md       := p_input->>'comment_md',
            p_client_request_id:= p_input->>'client_request_id'
          ) r;
          v_result := jsonb_build_object('ok', true, 'data', v_row);
        end;

    end case;

    -- Update audit record with success
    update command.executed_commands
    set status      = 'success',
        output      = v_result,
        executed_at = now()
    where id = v_audit_id;

    return v_result;

  exception when others then
    -- Update audit record with error
    update command.executed_commands
    set status        = 'error',
        error_message = sqlerrm,
        executed_at   = now()
    where id = v_audit_id;

    return jsonb_build_object('ok', false, 'error', sqlerrm);
  end;
end;
$$;

-- Grant execute to authenticated users (RPC-level permission gate handles RBAC)
grant usage on schema command to authenticated;
grant execute on function command.execute_command(command.command_type, jsonb, text)
  to authenticated;
grant execute on function command.current_may_execute(command.command_type)
  to authenticated;

-- Allow the security-definer execute_command to read/write its own tables
grant select, insert, update on command.executed_commands to authenticated;
grant select on command.command_permissions to authenticated;
