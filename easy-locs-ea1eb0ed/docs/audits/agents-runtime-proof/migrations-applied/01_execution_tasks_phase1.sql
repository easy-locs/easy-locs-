-- Autonomous Execution Layer — Phase 1 Core Pipeline
-- Hardened execution_tasks table backing the dispatcher/validator/orchestrator-adapter chain.

CREATE SCHEMA IF NOT EXISTS system;

-- Risk level enum (SAFE | MEDIUM | CRITICAL)
DO $$ BEGIN
  CREATE TYPE system.execution_task_risk AS ENUM ('SAFE', 'MEDIUM', 'CRITICAL');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- Status enum (PENDING | RUNNING | SUCCESS | FAILED | BLOCKED)
DO $$ BEGIN
  CREATE TYPE system.execution_task_status AS ENUM ('PENDING', 'RUNNING', 'SUCCESS', 'FAILED', 'BLOCKED');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS system.execution_tasks (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type            TEXT NOT NULL,
  domain          TEXT NOT NULL,
  risk_level      system.execution_task_risk NOT NULL,
  status          system.execution_task_status NOT NULL DEFAULT 'PENDING',
  payload         JSONB NOT NULL DEFAULT '{}'::jsonb,
  result          JSONB,
  error           TEXT,
  requested_by    TEXT NOT NULL DEFAULT 'system',
  parent_task_id  UUID REFERENCES system.execution_tasks(id) ON DELETE SET NULL,
  attempt_count   INT NOT NULL DEFAULT 0,
  max_attempts    INT NOT NULL DEFAULT 3,
  blocked_reason  TEXT,
  approved_by     TEXT,
  approved_at     TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_execution_tasks_status      ON system.execution_tasks (status);
CREATE INDEX IF NOT EXISTS idx_execution_tasks_domain      ON system.execution_tasks (domain);
CREATE INDEX IF NOT EXISTS idx_execution_tasks_risk_level  ON system.execution_tasks (risk_level);
CREATE INDEX IF NOT EXISTS idx_execution_tasks_parent      ON system.execution_tasks (parent_task_id);
CREATE INDEX IF NOT EXISTS idx_execution_tasks_created_at  ON system.execution_tasks (created_at DESC);

-- updated_at maintenance trigger
CREATE OR REPLACE FUNCTION system.execution_tasks_touch_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_execution_tasks_touch_updated_at ON system.execution_tasks;
CREATE TRIGGER trg_execution_tasks_touch_updated_at
  BEFORE UPDATE ON system.execution_tasks
  FOR EACH ROW EXECUTE FUNCTION system.execution_tasks_touch_updated_at();

-- RLS: least-privilege.
--   - Only authenticated users with the `admin` app_role may READ this table.
--     Execution-task rows can carry sensitive payloads, approval metadata,
--     and blocked-reason diagnostics, so visibility is admin-scoped.
--   - INSERT / UPDATE / DELETE are reserved for the service role (server-side
--     dispatcher, validator, orchestrator adapter, and the server-side
--     execution loop built in task #711). Authenticated clients cannot create,
--     mutate, or approve execution tasks directly — they must go through the
--     `system.dispatch_execution_task` SECURITY DEFINER RPC defined below.
ALTER TABLE system.execution_tasks ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "execution_tasks_read_authenticated" ON system.execution_tasks;
DROP POLICY IF EXISTS "execution_tasks_read_admin" ON system.execution_tasks;
CREATE POLICY "execution_tasks_read_admin"
  ON system.execution_tasks FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::public.app_role));

DROP POLICY IF EXISTS "execution_tasks_service_role_all" ON system.execution_tasks;
CREATE POLICY "execution_tasks_service_role_all"
  ON system.execution_tasks FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Authenticated clients have NO direct INSERT/UPDATE/DELETE on execution_tasks.
-- The dashboard must dispatch via the SECURITY DEFINER RPC
-- `system.dispatch_execution_task(...)`, which itself enforces an admin-role
-- check via `public.has_role(auth.uid(), 'admin')`. This closes the
-- privilege-escalation path where any authenticated user could otherwise
-- enqueue tasks for the execution pipeline.
GRANT USAGE ON SCHEMA system TO authenticated, anon, service_role;
GRANT SELECT ON system.execution_tasks TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON system.execution_tasks TO service_role;
REVOKE INSERT, UPDATE, DELETE ON system.execution_tasks FROM authenticated, anon, PUBLIC;

-- ── Admin-gated dispatch RPC ───────────────────────────────────────────────
-- SECURITY DEFINER: runs as the table owner so it can INSERT despite the
-- locked-down RLS, but requires the caller to be an admin first. Returns the
-- inserted row (or raises). Defense-in-depth: also clamps risk_level and
-- approved_by — clients cannot self-approve a CRITICAL task by passing values.
CREATE OR REPLACE FUNCTION system.dispatch_execution_task(
  p_type           TEXT,
  p_domain         TEXT,
  p_risk_level     system.execution_task_risk,
  p_status         system.execution_task_status,
  p_payload        JSONB DEFAULT '{}'::jsonb,
  p_requested_by   TEXT  DEFAULT 'system',
  p_parent_task_id UUID  DEFAULT NULL,
  p_max_attempts   INT   DEFAULT 3,
  p_approved_by    TEXT  DEFAULT NULL,
  p_blocked_reason TEXT  DEFAULT NULL
) RETURNS system.execution_tasks
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, system
AS $$
DECLARE
  v_caller UUID := auth.uid();
  v_row    system.execution_tasks;
  v_approved_by TEXT := NULLIF(BTRIM(p_approved_by), '');
  v_approved_at TIMESTAMPTZ := NULL;
BEGIN
  -- service_role bypasses the auth check (no auth.uid()).
  IF v_caller IS NOT NULL THEN
    IF NOT public.has_role(v_caller, 'admin'::public.app_role) THEN
      RAISE EXCEPTION 'execution_tasks dispatch denied: caller % is not an admin', v_caller
        USING ERRCODE = '42501';
    END IF;
  END IF;

  -- Status must be PENDING or BLOCKED on creation; never RUNNING/SUCCESS/FAILED.
  IF p_status NOT IN ('PENDING', 'BLOCKED') THEN
    RAISE EXCEPTION 'execution_tasks dispatch denied: status % not allowed at creation', p_status
      USING ERRCODE = '22023';
  END IF;

  -- CRITICAL gate (server-side): tasks classified CRITICAL must carry an explicit
  -- non-system approver. If absent, force BLOCKED with a reason regardless of
  -- what the client asked for.
  IF p_risk_level = 'CRITICAL' AND (v_approved_by IS NULL OR v_approved_by = 'system') THEN
    p_status := 'BLOCKED';
    v_approved_by := NULL;
    p_blocked_reason := COALESCE(p_blocked_reason,
      'CRITICAL_REQUIRES_APPROVAL: server-side gate blocked CRITICAL task without admin approver');
  END IF;

  IF v_approved_by IS NOT NULL THEN
    v_approved_at := now();
  END IF;

  INSERT INTO system.execution_tasks (
    type, domain, risk_level, status, payload, requested_by,
    parent_task_id, attempt_count, max_attempts, blocked_reason,
    approved_by, approved_at
  ) VALUES (
    p_type, p_domain, p_risk_level, p_status, COALESCE(p_payload, '{}'::jsonb),
    COALESCE(NULLIF(BTRIM(p_requested_by), ''), 'system'),
    p_parent_task_id, 0, COALESCE(p_max_attempts, 3), p_blocked_reason,
    v_approved_by, v_approved_at
  )
  RETURNING * INTO v_row;

  RETURN v_row;
END;
$$;

REVOKE ALL ON FUNCTION system.dispatch_execution_task(
  TEXT, TEXT, system.execution_task_risk, system.execution_task_status,
  JSONB, TEXT, UUID, INT, TEXT, TEXT
) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION system.dispatch_execution_task(
  TEXT, TEXT, system.execution_task_risk, system.execution_task_status,
  JSONB, TEXT, UUID, INT, TEXT, TEXT
) TO authenticated, service_role;
