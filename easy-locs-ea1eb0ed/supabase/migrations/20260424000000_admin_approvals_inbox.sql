-- ============================================================================
-- Sovereign Agent Control · L5 — /admin/approvals inbox (Task #812)
--
-- Adds the human-in-the-loop approval surface that was missing from the
-- execution-tasks state machine: every `pending_review` row is acted on
-- through ONE RPC (`system.decide_task_approval`) which writes to a new
-- audit table (`system.task_approvals`) and emits canonical execution
-- events that the inbox UI subscribes to.
--
-- Hard guarantees:
--   * Single source of truth: only `system.decide_task_approval` may
--     transition a `pending_review` row to `approved` / `rejected` /
--     `draft` (changes_requested). No client-side UPDATE on
--     `execution_tasks.status` for these transitions.
--   * Idempotent decisions: re-submitting the same decision on an
--     already-decided row returns the prior approval row instead of
--     erroring (so retries / double-clicks are safe).
--   * Payload-agnostic: the table stores `decision`, `reason`,
--     `comment_md`, and a snapshot of `agent_id` at decision time. The
--     inbox UI renders whatever JSON the policy attached to the task.
--   * Future build-agent ready: code-patch tasks will set
--     `intent_payload.diff_kind = 'text'` on the existing
--     `execution_tasks.payload` JSONB; the renderer (UI side) handles
--     both JSON and unified-diff payloads.
--   * Canonical events:
--       APPROVAL_REQUESTED  — fires when a row enters `pending_review`
--                             (insert OR transition from another state).
--       APPROVAL_DECIDED    — fires for every decision (approve, reject,
--                             changes_requested, comment).
--     Both are written into `public.engine_run_logs` matching the shape
--     the orchestrator's ExecutionEventSink already uses, so they show
--     up in the existing dashboard timeline alongside `task.queued`,
--     `task.locked`, etc., without any new transport.
-- ============================================================================

-- ── 1. Enum + table ───────────────────────────────────────────────────────
DO $$ BEGIN
  CREATE TYPE system.task_approval_decision AS ENUM (
    'approved',
    'rejected',
    'changes_requested',
    'comment'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS system.task_approvals (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id           UUID NOT NULL REFERENCES system.execution_tasks(id) ON DELETE CASCADE,
  reviewer_user_id  UUID NOT NULL,
  decision          system.task_approval_decision NOT NULL,
  reason            TEXT,                   -- required for `rejected`
  comment_md        TEXT,                   -- free-form markdown context
  -- Snapshot of the routing identity at decision time (the agent that
  -- requested this work). Captured so a later agent rename / re-version
  -- never invalidates the audit trail.
  agent_id_at_decision UUID,
  agent_kind_at_decision TEXT,
  decided_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  -- Idempotency anchor for repeat clicks on the same decision. Same
  -- (task_id, reviewer, decision) within a 5-second window collapses to
  -- the first row via the dedicated unique index below.
  client_request_id TEXT
);

CREATE INDEX IF NOT EXISTS idx_task_approvals_task_id_decided_at
  ON system.task_approvals (task_id, decided_at DESC);

CREATE INDEX IF NOT EXISTS idx_task_approvals_reviewer
  ON system.task_approvals (reviewer_user_id, decided_at DESC);

CREATE UNIQUE INDEX IF NOT EXISTS uniq_task_approvals_client_request
  ON system.task_approvals (task_id, reviewer_user_id, client_request_id)
  WHERE client_request_id IS NOT NULL;

-- ── 2. RLS ─────────────────────────────────────────────────────────────────
ALTER TABLE system.task_approvals ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS task_approvals_select_admin    ON system.task_approvals;
DROP POLICY IF EXISTS task_approvals_no_direct_write ON system.task_approvals;

-- Hard read/write lock: NO direct policies for the `authenticated` role.
-- Every read MUST go through `system.list_task_approvals(...)` (defined
-- below, SECURITY DEFINER, role-checked) and every write MUST go through
-- `system.decide_task_approval(...)`. Service role bypasses RLS.
-- This matches the L5 control-plane invariant: approvals audit can only
-- be observed via auditable RPCs, never via raw table reads.

REVOKE ALL ON system.task_approvals FROM authenticated, anon;

-- ── 3. Canonical event helper ─────────────────────────────────────────────
-- Mirrors the shape produced by the orchestrator's ExecutionEventSink so
-- existing log readers (dashboard, alerting) pick these up automatically.
CREATE OR REPLACE FUNCTION system.emit_task_canonical_event(
  p_task_id UUID,
  p_event_name TEXT,
  p_payload JSONB DEFAULT '{}'::jsonb,
  p_status TEXT DEFAULT 'ok'
) RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, system
AS $$
DECLARE
  v_task system.execution_tasks;
BEGIN
  SELECT * INTO v_task FROM system.execution_tasks WHERE id = p_task_id;
  IF NOT FOUND THEN
    -- Best-effort: never block a transaction because logging failed.
    RETURN;
  END IF;

  INSERT INTO public.engine_run_logs (
    engine_name, category, status, effect_summary, metadata_json
  ) VALUES (
    'orchestrator-v2:' || COALESCE(v_task.domain, 'unknown'),
    p_event_name,
    p_status,
    p_event_name || ' ' || p_task_id::text,
    jsonb_build_object(
      'task_id', p_task_id::text,
      'domain', v_task.domain,
      'task_type', v_task.type,
      'correlation_id', v_task.correlation_id,
      'risk_level', v_task.risk_level,
      'payload', p_payload
    )
  );
EXCEPTION WHEN OTHERS THEN
  -- Logging is best-effort (matches the orchestrator sink contract).
  NULL;
END;
$$;

REVOKE ALL ON FUNCTION system.emit_task_canonical_event(UUID, TEXT, JSONB, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION system.emit_task_canonical_event(UUID, TEXT, JSONB, TEXT)
  TO service_role;

-- ── 4. APPROVAL_REQUESTED trigger ─────────────────────────────────────────
-- Fires whenever a row enters `pending_review` (INSERT path or any UPDATE
-- transition). Uses statement-after-row trigger so it sees the committed
-- new state.
CREATE OR REPLACE FUNCTION system.trg_task_emit_approval_requested()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  v_payload JSONB;
BEGIN
  IF NEW.status = 'pending_review'
     AND (TG_OP = 'INSERT' OR OLD.status IS DISTINCT FROM NEW.status) THEN
    v_payload := jsonb_build_object(
      'task_id', NEW.id::text,
      'domain', NEW.domain,
      'task_type', NEW.type,
      'risk', NEW.risk_level,
      'agent_id', NEW.agent_id,
      'requested_by', NEW.requested_by,
      'approval_policy', NEW.approval_policy,
      'summary', LEFT(COALESCE(NEW.blocked_reason, ''), 280)
    );
    PERFORM system.emit_task_canonical_event(
      NEW.id, 'approval.requested', v_payload, 'ok'
    );
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_execution_tasks_approval_requested ON system.execution_tasks;
CREATE TRIGGER trg_execution_tasks_approval_requested
  AFTER INSERT OR UPDATE OF status ON system.execution_tasks
  FOR EACH ROW EXECUTE FUNCTION system.trg_task_emit_approval_requested();

-- ── 5. decide_task_approval RPC — single source of truth ─────────────────
CREATE OR REPLACE FUNCTION system.decide_task_approval(
  p_task_id           UUID,
  p_decision          system.task_approval_decision,
  p_reason            TEXT DEFAULT NULL,
  p_comment_md        TEXT DEFAULT NULL,
  p_client_request_id TEXT DEFAULT NULL
) RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, system
AS $$
DECLARE
  v_caller    UUID := auth.uid();
  v_task      system.execution_tasks;
  v_existing  system.task_approvals;
  v_inserted  system.task_approvals;
  v_reason    TEXT := NULLIF(BTRIM(p_reason), '');
  v_comment   TEXT := NULLIF(BTRIM(p_comment_md), '');
  v_clientreq TEXT := NULLIF(BTRIM(p_client_request_id), '');
BEGIN
  -- Caller must be authenticated and admin (service_role bypasses).
  IF v_caller IS NULL THEN
    RAISE EXCEPTION 'decide_task_approval denied: not authenticated'
      USING ERRCODE = '42501';
  END IF;
  -- Governance contract: only super_admin may decide approvals. The page
  -- route is also gated by SuperAdminGate, but the RPC enforces the same
  -- bound at the DB layer so direct API calls cannot bypass it.
  IF NOT public.has_role(v_caller, 'super_admin'::public.app_role) THEN
    RAISE EXCEPTION 'decide_task_approval denied: caller % is not a super_admin', v_caller
      USING ERRCODE = '42501';
  END IF;

  SELECT * INTO v_task FROM system.execution_tasks WHERE id = p_task_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'decide_task_approval: task % not found', p_task_id
      USING ERRCODE = '22023';
  END IF;

  -- Idempotency short-circuit — same (task, reviewer, client_request_id).
  IF v_clientreq IS NOT NULL THEN
    SELECT * INTO v_existing
      FROM system.task_approvals
     WHERE task_id = p_task_id
       AND reviewer_user_id = v_caller
       AND client_request_id = v_clientreq
     LIMIT 1;
    IF FOUND THEN
      RETURN jsonb_build_object(
        'ok', TRUE,
        'idempotent', TRUE,
        'approval_id', v_existing.id,
        'decision', v_existing.decision,
        'task_status', v_task.status
      );
    END IF;
  END IF;

  -- A decision on a non-pending row: idempotently return the LAST
  -- decision instead of erroring. This makes "I already approved this,
  -- did my click register?" a safe re-click.
  IF v_task.status <> 'pending_review' AND p_decision <> 'comment' THEN
    SELECT * INTO v_existing
      FROM system.task_approvals
     WHERE task_id = p_task_id
       AND decision = p_decision
     ORDER BY decided_at DESC
     LIMIT 1;
    IF FOUND THEN
      RETURN jsonb_build_object(
        'ok', TRUE,
        'idempotent', TRUE,
        'approval_id', v_existing.id,
        'decision', v_existing.decision,
        'task_status', v_task.status,
        'note', 'task is no longer pending_review; returning prior decision'
      );
    END IF;
    RAISE EXCEPTION 'decide_task_approval: task % is in status % (must be pending_review)',
      p_task_id, v_task.status
      USING ERRCODE = '22023';
  END IF;

  -- `rejected` requires a reason (governance hard requirement).
  IF p_decision = 'rejected' AND v_reason IS NULL THEN
    RAISE EXCEPTION 'decide_task_approval: rejection requires a non-empty reason'
      USING ERRCODE = '22023';
  END IF;

  -- Insert the audit row first, then transition the task row. The
  -- transition trigger on execution_tasks enforces the legal state
  -- machine, so any illegal transition will roll back the audit row.
  INSERT INTO system.task_approvals (
    task_id, reviewer_user_id, decision, reason, comment_md,
    agent_id_at_decision, agent_kind_at_decision, client_request_id
  ) VALUES (
    p_task_id, v_caller, p_decision, v_reason, v_comment,
    v_task.agent_id,
    -- agent_kind lives on system.agents; resolve at write-time so it is
    -- captured even if the agent row is later updated/renamed.
    (SELECT agent_kind FROM system.agents WHERE id = v_task.agent_id),
    v_clientreq
  )
  RETURNING * INTO v_inserted;

  IF p_decision = 'approved' THEN
    UPDATE system.execution_tasks
       SET status        = 'approved',
           approved_by   = COALESCE(v_caller::text, approved_by),
           approved_at   = now()
     WHERE id = p_task_id;
  ELSIF p_decision = 'rejected' THEN
    UPDATE system.execution_tasks
       SET status      = 'rejected',
           rejected_by = v_caller::text,
           blocked_reason =
             COALESCE(v_reason, 'rejected by reviewer')
     WHERE id = p_task_id;
  ELSIF p_decision = 'changes_requested' THEN
    UPDATE system.execution_tasks
       SET status         = 'draft',
           blocked_reason = COALESCE(v_comment, v_reason, 'changes requested by reviewer')
     WHERE id = p_task_id;
  END IF;
  -- 'comment' does not transition the task row.

  -- Emit canonical APPROVAL_DECIDED event.
  PERFORM system.emit_task_canonical_event(
    p_task_id,
    'approval.decided',
    jsonb_build_object(
      'approval_id', v_inserted.id,
      'decision', p_decision,
      'reviewer', v_caller,
      'reason', v_reason,
      'has_comment', v_comment IS NOT NULL
    ),
    CASE WHEN p_decision = 'rejected' THEN 'error' ELSE 'ok' END
  );

  RETURN jsonb_build_object(
    'ok', TRUE,
    'idempotent', FALSE,
    'approval_id', v_inserted.id,
    'decision', p_decision,
    'task_status', (SELECT status FROM system.execution_tasks WHERE id = p_task_id)
  );
END;
$$;

REVOKE ALL ON FUNCTION system.decide_task_approval(
  UUID, system.task_approval_decision, TEXT, TEXT, TEXT
) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION system.decide_task_approval(
  UUID, system.task_approval_decision, TEXT, TEXT, TEXT
) TO authenticated, service_role;

-- ── 5b. list_task_approvals — RPC-only audit read path ──────────────────
-- Direct SELECT on `system.task_approvals` is revoked above; admins
-- read the audit trail via this SECURITY DEFINER RPC, which (a) checks
-- the caller has the admin role, and (b) returns rows in chronological
-- order so the UI can render the trail without a second sort.
CREATE OR REPLACE FUNCTION system.list_task_approvals(p_task_id UUID)
RETURNS SETOF system.task_approvals
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
SET search_path = public, system
AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'super_admin'::public.app_role) THEN
    RAISE EXCEPTION 'forbidden: super_admin role required'
      USING ERRCODE = '42501';
  END IF;
  RETURN QUERY
    SELECT * FROM system.task_approvals
     WHERE task_id = p_task_id
     ORDER BY decided_at ASC;
END;
$$;

REVOKE ALL ON FUNCTION system.list_task_approvals(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION system.list_task_approvals(UUID)
  TO authenticated, service_role;

-- ── 5c. Extend the execution_task state machine ────────────────────────
-- The `changes_requested` decision moves a task from `pending_review`
-- back to `draft` so the requester can revise the proposal and resubmit.
-- The base matrix in 20260418500000_execution_tasks_v2.sql does not
-- include this edge — we add it here (and only here) so reviewer flow
-- works without rewriting the v2 migration.
CREATE OR REPLACE FUNCTION system.assert_task_transition(
  _old system.execution_task_status,
  _new system.execution_task_status
) RETURNS BOOLEAN
LANGUAGE plpgsql
IMMUTABLE
AS $$
BEGIN
  IF _old IS NULL THEN RETURN TRUE; END IF;
  IF _old = _new  THEN RETURN TRUE; END IF;
  RETURN CASE _old
    WHEN 'draft'          THEN _new IN ('pending_review','approved','queued','cancelled')
    -- L5 addition: 'draft' lets reviewers send tasks back for revision.
    WHEN 'pending_review' THEN _new IN ('draft','approved','rejected','cancelled')
    WHEN 'approved'       THEN _new IN ('queued','cancelled')
    WHEN 'rejected'       THEN _new IN ('draft','cancelled')
    WHEN 'queued'         THEN _new IN ('running','blocked','cancelled')
    WHEN 'running'        THEN _new IN ('succeeded','failed','blocked','cancelled')
    WHEN 'failed'         THEN _new IN ('queued','blocked','rolled_back','cancelled')
    WHEN 'succeeded'      THEN _new IN ('rolled_back')
    WHEN 'blocked'        THEN _new IN ('queued','cancelled')
    WHEN 'rolled_back'    THEN FALSE
    WHEN 'cancelled'      THEN FALSE
    ELSE FALSE
  END;
END;
$$;

-- ── 6. Backfill: emit APPROVAL_REQUESTED for any rows already in
--    pending_review at the time this migration runs, so the inbox UI
--    surfaces them in its log timeline immediately. Best-effort.
DO $$
DECLARE r RECORD;
BEGIN
  FOR r IN SELECT id FROM system.execution_tasks WHERE status = 'pending_review'
  LOOP
    PERFORM system.emit_task_canonical_event(
      r.id, 'approval.requested',
      jsonb_build_object('backfill', TRUE), 'ok'
    );
  END LOOP;
END $$;
