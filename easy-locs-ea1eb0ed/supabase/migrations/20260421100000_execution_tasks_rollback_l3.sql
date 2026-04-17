-- ============================================================================
-- Sovereign Agent Control · L3 — Typed rollback path for agents (task #811)
--
-- Promotes the Phase-2 execution_tasks state machine from a single terminal
-- `rolled_back` step to a full, observable rollback lifecycle that any agent
-- kind (business adapter, AI router, future dev.builder, asis.cognitive) can
-- implement uniformly.
--
-- This migration is structural + governance only; the orchestrator wiring
-- lives in TypeScript (orchestrator-v2.ts).
--
-- Adds:
--   1. `rolling_back` and `rollback_failed` enum values to
--      `system.execution_task_status`.
--   2. Governance + observability columns:
--        previous_state         JSONB        — snapshot captured pre-execute
--        rollback_strategy      TEXT         — auto | manual | none
--        rollback_requested_by  TEXT         — operator who triggered manual
--        rollback_reason        TEXT         — failure reason or operator note
--        rollback_started_at    TIMESTAMPTZ  — auto-stamped by trigger
--        rollback_failed_at     TIMESTAMPTZ  — auto-stamped by trigger
--      (`rollback_result` and `rolled_back_at` already exist from #750.)
--   3. Updated transition matrix:
--        failed         → queued, blocked, rolling_back, rolled_back, cancelled
--        succeeded      → rolling_back, rolled_back
--        rolling_back   → rolled_back, rollback_failed
--        rollback_failed→ rolling_back, blocked, cancelled
--      `rolled_back` and `cancelled` remain terminal. `rollback_failed` is
--      NOT terminal: it remains in that state until a human-driven retry
--      (rolling_back), an admin escalation (blocked) or cancellation —
--      fail-loud, never fail-silent.
--   4. `system.request_rollback(p_task_id uuid, p_reason text,
--        p_allow_after_success boolean default false)` RPC.
--      Super-admin only (or service_role). Asserts current state is
--      `failed` (or `succeeded` only when `p_allow_after_success = true`,
--      mirroring the adapter's `allow_rollback_after_success` flag).
--      Transitions the row to `rolling_back` and stamps audit fields.
-- ============================================================================

-- ── 1. Enum extension ─────────────────────────────────────────────────────
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_enum e
      JOIN pg_type t ON t.oid = e.enumtypid
      JOIN pg_namespace n ON n.oid = t.typnamespace
     WHERE n.nspname = 'system'
       AND t.typname = 'execution_task_status'
       AND e.enumlabel = 'rolling_back'
  ) THEN
    ALTER TYPE system.execution_task_status ADD VALUE 'rolling_back';
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_enum e
      JOIN pg_type t ON t.oid = e.enumtypid
      JOIN pg_namespace n ON n.oid = t.typnamespace
     WHERE n.nspname = 'system'
       AND t.typname = 'execution_task_status'
       AND e.enumlabel = 'rollback_failed'
  ) THEN
    ALTER TYPE system.execution_task_status ADD VALUE 'rollback_failed';
  END IF;
END $$;

-- ── 2. Governance + observability columns ────────────────────────────────
ALTER TABLE system.execution_tasks
  ADD COLUMN IF NOT EXISTS previous_state        JSONB,
  ADD COLUMN IF NOT EXISTS rollback_strategy     TEXT NOT NULL DEFAULT 'manual',
  ADD COLUMN IF NOT EXISTS rollback_requested_by TEXT,
  ADD COLUMN IF NOT EXISTS rollback_reason       TEXT,
  ADD COLUMN IF NOT EXISTS rollback_started_at   TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS rollback_failed_at    TIMESTAMPTZ;

DO $$ BEGIN
  ALTER TABLE system.execution_tasks
    ADD CONSTRAINT execution_tasks_rollback_strategy_chk
    CHECK (rollback_strategy IN ('auto','manual','none'));
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- ── 3. Updated active-status partial index (orchestrator polling) ────────
-- Re-include `rolling_back` and `rollback_failed` so the execution loop
-- and the dashboard surface "active" rollbacks alongside in-flight tasks.
DROP INDEX IF EXISTS system.idx_execution_tasks_status_active;
CREATE INDEX IF NOT EXISTS idx_execution_tasks_status_active
  ON system.execution_tasks (status, created_at)
  WHERE status IN (
    'draft','pending_review','approved','queued','running','failed','blocked',
    'rolling_back','rollback_failed'
  );

-- Idempotency uniqueness must continue to hold while a rollback is in
-- flight or stuck (rollback_failed). Once the row reaches the terminal
-- `rolled_back`, the key is freed for re-dispatch.
DROP INDEX IF EXISTS system.execution_tasks_idempotency_key_active_uniq;
CREATE UNIQUE INDEX IF NOT EXISTS execution_tasks_idempotency_key_active_uniq
  ON system.execution_tasks(idempotency_key)
  WHERE idempotency_key IS NOT NULL
    AND status IN (
      'pending_review','approved','queued','running','blocked','failed',
      'rolling_back','rollback_failed'
    );

-- ── 4. Transition matrix + auto-stamp trigger ────────────────────────────
CREATE OR REPLACE FUNCTION system.assert_task_transition(
  _old system.execution_task_status,
  _new system.execution_task_status
) RETURNS BOOLEAN
LANGUAGE plpgsql IMMUTABLE
AS $$
BEGIN
  IF _old IS NOT DISTINCT FROM _new THEN RETURN TRUE; END IF;
  IF _old IS NULL THEN RETURN TRUE; END IF;

  RETURN CASE _old
    WHEN 'draft'           THEN _new IN ('pending_review','approved','queued','cancelled')
    WHEN 'pending_review'  THEN _new IN ('approved','rejected','cancelled')
    WHEN 'approved'        THEN _new IN ('queued','cancelled')
    WHEN 'rejected'        THEN _new IN ('draft','cancelled')
    WHEN 'queued'          THEN _new IN ('running','blocked','cancelled')
    WHEN 'running'         THEN _new IN ('succeeded','failed','blocked')
    WHEN 'failed'          THEN _new IN ('queued','blocked','rolling_back','rolled_back','cancelled')
    WHEN 'succeeded'       THEN _new IN ('rolling_back','rolled_back')
    WHEN 'blocked'         THEN _new IN ('queued','cancelled')
    WHEN 'rolling_back'    THEN _new IN ('rolled_back','rollback_failed')
    WHEN 'rollback_failed' THEN _new IN ('rolling_back','blocked','cancelled')
    WHEN 'rolled_back'     THEN FALSE -- terminal
    WHEN 'cancelled'       THEN FALSE -- terminal
    ELSE FALSE
  END;
END;
$$;

REVOKE ALL ON FUNCTION system.assert_task_transition(
  system.execution_task_status, system.execution_task_status
) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION system.assert_task_transition(
  system.execution_task_status, system.execution_task_status
) TO authenticated, service_role;

CREATE OR REPLACE FUNCTION system.execution_tasks_enforce_state_machine()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF OLD.status IS DISTINCT FROM NEW.status THEN
    IF NOT system.assert_task_transition(OLD.status, NEW.status) THEN
      RAISE EXCEPTION 'execution_tasks illegal state transition: % → %', OLD.status, NEW.status
        USING ERRCODE = '22023';
    END IF;

    -- Auto-stamp lifecycle timestamps when entering each state.
    IF NEW.status = 'running'         AND NEW.started_at          IS NULL THEN NEW.started_at          := now(); END IF;
    IF NEW.status = 'succeeded'       AND NEW.completed_at        IS NULL THEN NEW.completed_at        := now(); END IF;
    IF NEW.status = 'failed'          AND NEW.failed_at           IS NULL THEN NEW.failed_at           := now(); END IF;
    IF NEW.status = 'rolling_back'    AND NEW.rollback_started_at IS NULL THEN NEW.rollback_started_at := now(); END IF;
    IF NEW.status = 'rolled_back'     AND NEW.rolled_back_at      IS NULL THEN NEW.rolled_back_at      := now(); END IF;
    IF NEW.status = 'rollback_failed' AND NEW.rollback_failed_at  IS NULL THEN NEW.rollback_failed_at  := now(); END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_execution_tasks_state_machine ON system.execution_tasks;
CREATE TRIGGER trg_execution_tasks_state_machine
  BEFORE UPDATE ON system.execution_tasks
  FOR EACH ROW EXECUTE FUNCTION system.execution_tasks_enforce_state_machine();

-- ── 5. system.request_rollback RPC (super-admin only, kind-agnostic) ─────
-- Operator-driven entry point for triggering a rollback on a previously
-- terminal (succeeded) or failed task. Service-role bypasses the role
-- check so the orchestrator and other internal services can drive the
-- same path. Caller-passed `p_allow_after_success` MUST mirror the
-- adapter's `allow_rollback_after_success` flag.
--
-- DEFENSE-IN-DEPTH: even when this RPC accepts the request, the
-- orchestrator's `runRollback` re-checks the adapter's
-- `allow_rollback_after_success` declaration at execute time. A direct
-- UPDATE that bypasses this RPC therefore cannot trigger a rollback the
-- adapter has not opted in to — the orchestrator will reject the row
-- into `rollback_failed` with code ROLLBACK_NOT_ALLOWED.
CREATE OR REPLACE FUNCTION system.request_rollback(
  p_task_id              UUID,
  p_reason               TEXT,
  p_allow_after_success  BOOLEAN DEFAULT FALSE
) RETURNS system.execution_tasks
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, system
AS $$
DECLARE
  v_caller    UUID := auth.uid();
  v_task      system.execution_tasks;
  v_requester TEXT;
BEGIN
  IF p_task_id IS NULL THEN
    RAISE EXCEPTION 'request_rollback: task_id is required' USING ERRCODE = '22023';
  END IF;
  IF p_reason IS NULL OR BTRIM(p_reason) = '' THEN
    RAISE EXCEPTION 'request_rollback: reason is required' USING ERRCODE = '22023';
  END IF;

  -- Super-admin gate (service_role bypass). Mirrors the dispatch RPC
  -- pattern: an authenticated caller MUST hold the super_admin role; the
  -- service_role JWT bypasses the check entirely.
  IF v_caller IS NOT NULL THEN
    IF NOT public.has_role(v_caller, 'super_admin'::public.app_role) THEN
      RAISE EXCEPTION 'request_rollback denied: caller % is not a super_admin', v_caller
        USING ERRCODE = '42501';
    END IF;
    v_requester := v_caller::text;
  ELSE
    v_requester := 'service_role';
  END IF;

  SELECT * INTO v_task FROM system.execution_tasks WHERE id = p_task_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'request_rollback: task % not found', p_task_id USING ERRCODE = 'P0002';
  END IF;

  IF v_task.status = 'failed' THEN
    NULL; -- always rollback-eligible
  ELSIF v_task.status = 'succeeded' THEN
    IF NOT p_allow_after_success THEN
      RAISE EXCEPTION 'request_rollback: task % is succeeded but allow_after_success=false', p_task_id
        USING ERRCODE = '22023';
    END IF;
  ELSE
    RAISE EXCEPTION 'request_rollback: task % is in status % (only failed/succeeded eligible)', p_task_id, v_task.status
      USING ERRCODE = '22023';
  END IF;

  UPDATE system.execution_tasks
     SET status                = 'rolling_back',
         rollback_requested_by = v_requester,
         rollback_reason       = BTRIM(p_reason)
   WHERE id = p_task_id
   RETURNING * INTO v_task;

  RETURN v_task;
END;
$$;

REVOKE ALL ON FUNCTION system.request_rollback(UUID, TEXT, BOOLEAN) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION system.request_rollback(UUID, TEXT, BOOLEAN)
  TO authenticated, service_role;
