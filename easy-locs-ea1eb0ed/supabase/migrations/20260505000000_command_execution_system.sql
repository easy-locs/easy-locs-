-- ============================================================================
-- Command Execution System — Unified control-plane entry point
-- Task #998 — replaces scattered army.* / system.* RPC calls with a single
-- audited, idempotent, permission-validated entry function.
--
-- Architecture:
--   public.execute_command(p_command_type, p_input, p_idempotency_key)
--     ↓ routes to ↓
--   army.approve_task / army.reject_task / army.retry_task /
--   army.kill_agent / army.kill_army / army.revive_army /
--   system.decide_task_approval / system.list_task_approvals
--
-- All invocations are recorded in command.executed_commands for full
-- observability. Idempotency is enforced via p_idempotency_key so callers
-- can safely retry without duplicating state mutations.
-- ============================================================================

-- ── 1. Command schema + audit table ─────────────────────────────────────────

CREATE SCHEMA IF NOT EXISTS command;

GRANT USAGE ON SCHEMA command TO authenticated, service_role;

-- Immutable audit log — one row per execute_command invocation.
CREATE TABLE IF NOT EXISTS command.executed_commands (
  id               uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  command_type     text        NOT NULL,
  input            jsonb       NOT NULL DEFAULT '{}'::jsonb,
  output           jsonb,
  status           text        NOT NULL DEFAULT 'pending'
                              CHECK (status IN ('pending', 'completed', 'failed')),
  error_message    text,
  idempotency_key  text        UNIQUE,
  executed_by      uuid        REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at       timestamptz NOT NULL DEFAULT now(),
  executed_at      timestamptz
);

CREATE INDEX IF NOT EXISTS ix_executed_commands_executed_by
  ON command.executed_commands(executed_by);
CREATE INDEX IF NOT EXISTS ix_executed_commands_command_type
  ON command.executed_commands(command_type);
CREATE INDEX IF NOT EXISTS ix_executed_commands_created_at
  ON command.executed_commands(created_at DESC);
CREATE INDEX IF NOT EXISTS ix_executed_commands_idempotency_key
  ON command.executed_commands(idempotency_key)
  WHERE idempotency_key IS NOT NULL;

-- RLS: only service_role and authenticated admins may read audit rows.
-- Inserts/updates are done by the SECURITY DEFINER function only.
ALTER TABLE command.executed_commands ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS executed_commands_admin_read ON command.executed_commands;
CREATE POLICY executed_commands_admin_read
  ON command.executed_commands
  FOR SELECT
  TO authenticated
  USING (
    public.has_role(auth.uid(), 'super_admin'::public.app_role)
  );

-- ── 2. public.execute_command — unified entry RPC ───────────────────────────
--
-- Supported command types:
--   army actions    : approve_task, reject_task, retry_task,
--                     kill_agent, kill_army, revive_army
--   system actions  : decide_task_approval, list_task_approvals
--
-- p_input keys vary by command type (see inline comments).
-- p_idempotency_key is optional; when supplied, a completed command with the
-- same key is returned without re-executing.
--
-- Returns jsonb with at least { ok: true/false, ... }.
-- Throws if permission is denied or the underlying RPC raises.

CREATE OR REPLACE FUNCTION public.execute_command(
  p_command_type   text,
  p_input          jsonb    DEFAULT '{}'::jsonb,
  p_idempotency_key text    DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, command, army, system
AS $$
DECLARE
  v_user_id       uuid;
  v_output        jsonb;
  v_error_msg     text;
  v_command_id    uuid;
  v_existing      jsonb;
BEGIN
  -- ── AUTH ──────────────────────────────────────────────────────────────────
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'execute_command: not authenticated'
      USING ERRCODE = '42501';
  END IF;

  -- ── IDEMPOTENCY ───────────────────────────────────────────────────────────
  IF p_idempotency_key IS NOT NULL THEN
    SELECT output INTO v_existing
      FROM command.executed_commands
     WHERE idempotency_key = p_idempotency_key
       AND status = 'completed'
     LIMIT 1;
    IF FOUND THEN
      RETURN v_existing;
    END IF;
  END IF;

  -- ── AUDIT — record attempt ─────────────────────────────────────────────
  INSERT INTO command.executed_commands
    (command_type, input, status, executed_by, idempotency_key)
  VALUES
    (p_command_type, p_input, 'pending', v_user_id, p_idempotency_key)
  RETURNING id INTO v_command_id;

  -- ── ROUTE ─────────────────────────────────────────────────────────────────
  BEGIN
    CASE p_command_type

      -- army.approve_task(p_task_id uuid, p_reason text)
      WHEN 'approve_task' THEN
        SELECT army.approve_task(
          (p_input->>'p_task_id')::uuid,
          p_input->>'p_reason'
        ) INTO v_output;

      -- army.reject_task(p_task_id uuid, p_reason text)
      WHEN 'reject_task' THEN
        SELECT army.reject_task(
          (p_input->>'p_task_id')::uuid,
          p_input->>'p_reason'
        ) INTO v_output;

      -- army.retry_task(p_task_id uuid)
      WHEN 'retry_task' THEN
        SELECT army.retry_task(
          (p_input->>'p_task_id')::uuid
        ) INTO v_output;

      -- army.kill_agent(p_agent_id uuid, p_reason text)
      WHEN 'kill_agent' THEN
        SELECT army.kill_agent(
          (p_input->>'p_agent_id')::uuid,
          COALESCE(p_input->>'p_reason', 'manual')
        ) INTO v_output;

      -- army.kill_army(p_reason text)
      WHEN 'kill_army' THEN
        SELECT army.kill_army(
          COALESCE(p_input->>'p_reason', 'manual')
        ) INTO v_output;

      -- army.revive_army()
      WHEN 'revive_army' THEN
        SELECT army.revive_army() INTO v_output;

      -- system.decide_task_approval(p_task_id, p_decision, p_reason,
      --                             p_comment_md, p_client_request_id)
      WHEN 'decide_task_approval' THEN
        SELECT system.decide_task_approval(
          (p_input->>'p_task_id')::uuid,
          (p_input->>'p_decision')::system.task_approval_decision,
          p_input->>'p_reason',
          p_input->>'p_comment_md',
          p_input->>'p_client_request_id'
        ) INTO v_output;

      -- system.list_task_approvals(p_task_id)
      WHEN 'list_task_approvals' THEN
        SELECT system.list_task_approvals(
          (p_input->>'p_task_id')::uuid
        ) INTO v_output;

      ELSE
        RAISE EXCEPTION 'execute_command: unknown command type %', p_command_type
          USING ERRCODE = '22023';
    END CASE;

    -- ── AUDIT — record success ───────────────────────────────────────────
    UPDATE command.executed_commands
       SET status      = 'completed',
           output      = v_output,
           executed_at = now()
     WHERE id = v_command_id;

    RETURN v_output;

  EXCEPTION WHEN OTHERS THEN
    -- ── AUDIT — record failure ───────────────────────────────────────────
    v_error_msg := SQLERRM;
    UPDATE command.executed_commands
       SET status        = 'failed',
           error_message = v_error_msg,
           executed_at   = now()
     WHERE id = v_command_id;

    RAISE;
  END;
END;
$$;

-- Tighten access: revoke from public, grant to authenticated only.
REVOKE ALL ON FUNCTION public.execute_command(text, jsonb, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.execute_command(text, jsonb, text) TO authenticated;
