-- ============================================================================
-- Autonomous Execution Layer — Phase 2, Schema execution_tasks v2 (task #750)
--
-- Promotes `system.execution_tasks` from the Phase-1 PENDING/RUNNING/.. model
-- to the Phase-2 governance model required by the Locks/Idempotency layer
-- and the upcoming ExecutionOrchestratorV2.
--
-- This migration is purely structural — no application logic, no orchestrator
-- behaviour. It establishes:
--   1. A new lowercase status enum with the full Phase-2 lifecycle
--      (draft, pending_review, approved, rejected, queued, running,
--       succeeded, failed, blocked, rolled_back, cancelled).
--   2. Retroactive migration of existing rows from the Phase-1 uppercase
--      values to the v2 model.
--   3. New governance / traceability / locking / verification columns.
--   4. A canonical transition matrix exposed as
--      `system.assert_task_transition(old, new)` plus a BEFORE UPDATE trigger
--      that refuses any illegal or retrograde state transition.
--   5. A unique partial index on `idempotency_key` (already added in
--      Phase-1 hardening) re-asserted defensively.
--   6. A v2 dispatch RPC that accepts the new fields and continues to
--      enforce the strict CRITICAL → blocked rule.
-- ============================================================================

-- ── 0. Pre-cleanup: drop dependents that reference the old status enum ────
-- (We have to drop them first so we can rebuild the enum.)
DROP TRIGGER  IF EXISTS trg_execution_tasks_state_machine ON system.execution_tasks;
DROP FUNCTION IF EXISTS system.execution_tasks_enforce_state_machine() CASCADE;

DROP FUNCTION IF EXISTS system.dispatch_execution_task(
  TEXT, TEXT, system.execution_task_risk, system.execution_task_status,
  JSONB, TEXT, UUID, INT, TEXT, TEXT
);
DROP FUNCTION IF EXISTS system.dispatch_execution_task(
  TEXT, TEXT, system.execution_task_risk, system.execution_task_status,
  JSONB, TEXT, UUID, INT, TEXT, TEXT, TEXT
);

-- validate_execution_task does NOT reference the status enum literally, but
-- we drop & recreate it at the end to keep ownership of the v2 surface.
DROP FUNCTION IF EXISTS system.validate_execution_task(UUID);

-- ── 1. Status enum: rebuild to v2 lowercase model ────────────────────────
-- Postgres won't let us redefine an enum in place, so we rename the legacy
-- type, create the v2 type, ALTER COLUMN with a USING mapping, then drop
-- the legacy type. Existing rows are remapped per the matrix below.
DO $$ BEGIN
  -- Only rename if the legacy type is still the canonical name.
  IF EXISTS (
    SELECT 1 FROM pg_type t
      JOIN pg_namespace n ON n.oid = t.typnamespace
     WHERE n.nspname = 'system' AND t.typname = 'execution_task_status'
  ) AND NOT EXISTS (
    SELECT 1 FROM pg_type t
      JOIN pg_namespace n ON n.oid = t.typnamespace
     WHERE n.nspname = 'system' AND t.typname = 'execution_task_status_legacy'
  ) THEN
    ALTER TYPE system.execution_task_status RENAME TO execution_task_status_legacy;
  END IF;
END $$;

DO $$ BEGIN
  CREATE TYPE system.execution_task_status AS ENUM (
    'draft',
    'pending_review',
    'approved',
    'rejected',
    'queued',
    'running',
    'succeeded',
    'failed',
    'blocked',
    'rolled_back',
    'cancelled'
  );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- Remap the column. The retroactive mapping respects the task spec:
--   PENDING  → queued        (Phase-1 PENDING rows already passed dispatch
--                             gating; they are ready for the orchestrator.
--                             requires_approval is false by default in v2,
--                             so pending_review is not used here.)
--   RUNNING  → running
--   SUCCESS  → succeeded
--   FAILED   → failed
--   BLOCKED  → blocked
DO $$
DECLARE
  v_col_type_name TEXT;
BEGIN
  SELECT t.typname INTO v_col_type_name
    FROM pg_attribute a
    JOIN pg_type t ON t.oid = a.atttypid
    JOIN pg_class c ON c.oid = a.attrelid
    JOIN pg_namespace n ON n.oid = c.relnamespace
   WHERE n.nspname = 'system'
     AND c.relname = 'execution_tasks'
     AND a.attname = 'status'
     AND NOT a.attisdropped;

  IF v_col_type_name = 'execution_task_status_legacy' THEN
    ALTER TABLE system.execution_tasks
      ALTER COLUMN status DROP DEFAULT;

    ALTER TABLE system.execution_tasks
      ALTER COLUMN status TYPE system.execution_task_status
      USING (
        CASE status::text
          WHEN 'PENDING' THEN 'queued'
          WHEN 'RUNNING' THEN 'running'
          WHEN 'SUCCESS' THEN 'succeeded'
          WHEN 'FAILED'  THEN 'failed'
          WHEN 'BLOCKED' THEN 'blocked'
          ELSE 'queued'
        END
      )::system.execution_task_status;

    ALTER TABLE system.execution_tasks
      ALTER COLUMN status SET DEFAULT 'draft'::system.execution_task_status;
  END IF;
END $$;

DROP TYPE IF EXISTS system.execution_task_status_legacy;

-- ── 2. New v2 columns ────────────────────────────────────────────────────
ALTER TABLE system.execution_tasks
  ADD COLUMN IF NOT EXISTS root_task_id        UUID REFERENCES system.execution_tasks(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS correlation_id      TEXT,
  ADD COLUMN IF NOT EXISTS entity_type         TEXT,
  ADD COLUMN IF NOT EXISTS entity_id           TEXT,
  ADD COLUMN IF NOT EXISTS approval_policy     TEXT NOT NULL DEFAULT 'none',
  ADD COLUMN IF NOT EXISTS requires_approval   BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS execution_state     TEXT,
  ADD COLUMN IF NOT EXISTS rejected_by         TEXT,
  ADD COLUMN IF NOT EXISTS escalated_by        TEXT,
  ADD COLUMN IF NOT EXISTS locked_by           TEXT,
  ADD COLUMN IF NOT EXISTS lock_key            TEXT,
  ADD COLUMN IF NOT EXISTS validation_result   JSONB,
  ADD COLUMN IF NOT EXISTS execution_result    JSONB,
  ADD COLUMN IF NOT EXISTS rollback_result     JSONB,
  ADD COLUMN IF NOT EXISTS retry_policy        JSONB,
  ADD COLUMN IF NOT EXISTS error_code          TEXT,
  ADD COLUMN IF NOT EXISTS started_at          TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS completed_at        TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS failed_at           TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS rolled_back_at      TIMESTAMPTZ;

-- Bound approval_policy to a known set so callers can't smuggle freeform
-- strings that the orchestrator wouldn't recognise.
DO $$ BEGIN
  ALTER TABLE system.execution_tasks
    ADD CONSTRAINT execution_tasks_approval_policy_chk
    CHECK (approval_policy IN ('none', 'single_admin', 'two_person', 'auto'));
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- ── 3. Indexes for the v2 access patterns ────────────────────────────────
-- idempotency_key uniqueness in v2 is **scoped to active lifecycle states**:
-- only one in-flight task may hold a given key at a time, but once a prior
-- task reaches a terminal state (succeeded / rejected / rolled_back /
-- cancelled / draft) the same key may be reused for a fresh dispatch
-- (replay / re-run after rollback). The Phase-1 global-unique index is
-- replaced here.
DROP INDEX IF EXISTS system.execution_tasks_idempotency_key_uniq;

CREATE UNIQUE INDEX IF NOT EXISTS execution_tasks_idempotency_key_active_uniq
  ON system.execution_tasks(idempotency_key)
  WHERE idempotency_key IS NOT NULL
    AND status IN (
      'pending_review','approved','queued','running','blocked','failed'
    );

CREATE INDEX IF NOT EXISTS idx_execution_tasks_correlation_id
  ON system.execution_tasks (correlation_id)
  WHERE correlation_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_execution_tasks_root_task_id
  ON system.execution_tasks (root_task_id);

CREATE INDEX IF NOT EXISTS idx_execution_tasks_entity
  ON system.execution_tasks (entity_type, entity_id)
  WHERE entity_type IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_execution_tasks_lock_key
  ON system.execution_tasks (lock_key)
  WHERE lock_key IS NOT NULL;

-- Active-status partial index — what the orchestrator polls.
CREATE INDEX IF NOT EXISTS idx_execution_tasks_status_active
  ON system.execution_tasks (status, created_at)
  WHERE status IN (
    'draft','pending_review','approved','queued','running','failed','blocked'
  );

-- ── 4. Transition matrix + guard ─────────────────────────────────────────
-- Authoritative Phase-2 transition matrix. Every state is reachable only
-- via the listed predecessors; anything else is rejected at the DB layer.
--
-- draft           → pending_review, approved, queued, cancelled
-- pending_review  → approved, rejected, cancelled
-- approved        → queued, cancelled
-- rejected        → draft, cancelled
-- queued          → running, blocked, cancelled
-- running         → succeeded, failed, blocked
-- failed          → queued, blocked, rolled_back, cancelled
-- succeeded       → rolled_back
-- blocked         → queued, cancelled
-- rolled_back     → (terminal)
-- cancelled       → (terminal)
CREATE OR REPLACE FUNCTION system.assert_task_transition(
  _old system.execution_task_status,
  _new system.execution_task_status
) RETURNS BOOLEAN
LANGUAGE plpgsql IMMUTABLE
AS $$
BEGIN
  -- Same-state writes are allowed (data updates without a status change).
  IF _old IS NOT DISTINCT FROM _new THEN RETURN TRUE; END IF;

  -- NULL old (insert path) → any creation-eligible status. Only enforced on
  -- UPDATE via the trigger below; INSERT-time validation is handled by the
  -- dispatch RPC.
  IF _old IS NULL THEN RETURN TRUE; END IF;

  RETURN CASE _old
    WHEN 'draft'          THEN _new IN ('pending_review','approved','queued','cancelled')
    WHEN 'pending_review' THEN _new IN ('approved','rejected','cancelled')
    WHEN 'approved'       THEN _new IN ('queued','cancelled')
    WHEN 'rejected'       THEN _new IN ('draft','cancelled')
    WHEN 'queued'         THEN _new IN ('running','blocked','cancelled')
    WHEN 'running'        THEN _new IN ('succeeded','failed','blocked')
    WHEN 'failed'         THEN _new IN ('queued','blocked','rolled_back','cancelled')
    WHEN 'succeeded'      THEN _new IN ('rolled_back')
    WHEN 'blocked'        THEN _new IN ('queued','cancelled')
    WHEN 'rolled_back'    THEN FALSE -- terminal
    WHEN 'cancelled'      THEN FALSE -- terminal
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

-- BEFORE UPDATE trigger — refuses illegal transitions even from direct
-- service-role writes. Also stamps the standard timestamp transitions.
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

    -- Auto-stamp lifecycle timestamps when entering the corresponding state,
    -- unless the caller has already set them explicitly.
    IF NEW.status = 'running'      AND NEW.started_at     IS NULL THEN NEW.started_at     := now(); END IF;
    IF NEW.status = 'succeeded'    AND NEW.completed_at   IS NULL THEN NEW.completed_at   := now(); END IF;
    IF NEW.status = 'failed'       AND NEW.failed_at      IS NULL THEN NEW.failed_at      := now(); END IF;
    IF NEW.status = 'rolled_back'  AND NEW.rolled_back_at IS NULL THEN NEW.rolled_back_at := now(); END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_execution_tasks_state_machine ON system.execution_tasks;
CREATE TRIGGER trg_execution_tasks_state_machine
  BEFORE UPDATE ON system.execution_tasks
  FOR EACH ROW EXECUTE FUNCTION system.execution_tasks_enforce_state_machine();

-- ── 5. Hardened dispatch RPC (v2) ────────────────────────────────────────
-- Same name as Phase-1 to keep call-sites stable, extended signature with
-- the v2 governance / traceability params. Maintains:
--   * admin gate (or service_role bypass)
--   * server-authoritative risk classification
--   * Phase-1 strict allowlist: CRITICAL → blocked, never executed
--   * idempotent insert via idempotency_key
--   * single-tx atomic insert
CREATE OR REPLACE FUNCTION system.dispatch_execution_task(
  p_type              TEXT,
  p_domain            TEXT,
  p_risk_level        system.execution_task_risk,
  p_status            system.execution_task_status,
  p_payload           JSONB DEFAULT '{}'::jsonb,
  p_requested_by      TEXT  DEFAULT 'system',
  p_parent_task_id    UUID  DEFAULT NULL,
  p_max_attempts      INT   DEFAULT 3,
  p_approved_by       TEXT  DEFAULT NULL,
  p_blocked_reason    TEXT  DEFAULT NULL,
  p_idempotency_key   TEXT  DEFAULT NULL,
  -- v2 additions (all optional; legacy callers pass NULL/default)
  p_root_task_id      UUID  DEFAULT NULL,
  p_correlation_id    TEXT  DEFAULT NULL,
  p_entity_type       TEXT  DEFAULT NULL,
  p_entity_id         TEXT  DEFAULT NULL,
  p_approval_policy   TEXT  DEFAULT 'none',
  p_requires_approval BOOLEAN DEFAULT FALSE,
  p_retry_policy      JSONB DEFAULT NULL
) RETURNS system.execution_tasks
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, system
AS $$
DECLARE
  v_caller       UUID := auth.uid();
  v_existing     system.execution_tasks;
  v_row          system.execution_tasks;
  v_approved_by  TEXT := NULLIF(BTRIM(p_approved_by), '');
  v_approved_at  TIMESTAMPTZ := NULL;
  v_server_risk  system.execution_task_risk;
  v_status       system.execution_task_status := p_status;
  v_blocked_rsn  TEXT := p_blocked_reason;
  v_normalized_t TEXT := UPPER(BTRIM(COALESCE(p_type, '')));
  v_policy       TEXT := COALESCE(NULLIF(BTRIM(p_approval_policy), ''), 'none');
BEGIN
  -- Admin gate (service_role bypasses).
  IF v_caller IS NOT NULL THEN
    IF NOT public.has_role(v_caller, 'admin'::public.app_role) THEN
      RAISE EXCEPTION 'execution_tasks dispatch denied: caller % is not an admin', v_caller
        USING ERRCODE = '42501';
    END IF;
  END IF;

  -- Idempotency: short-circuit if an **active** row with this key exists.
  -- Terminal-state rows (succeeded / rejected / rolled_back / cancelled /
  -- draft) do NOT block re-dispatch with the same key; this matches the
  -- v2 partial-unique index predicate.
  IF p_idempotency_key IS NOT NULL AND BTRIM(p_idempotency_key) <> '' THEN
    SELECT * INTO v_existing
      FROM system.execution_tasks
     WHERE idempotency_key = p_idempotency_key
       AND status IN (
         'pending_review','approved','queued','running','blocked','failed'
       )
     LIMIT 1;
    IF FOUND THEN
      RETURN v_existing;
    END IF;
  END IF;

  -- Status sanity: only creation-eligible v2 statuses accepted at insert.
  IF v_status NOT IN ('draft','pending_review','approved','queued','blocked') THEN
    RAISE EXCEPTION 'execution_tasks dispatch denied: status % not allowed at creation', v_status
      USING ERRCODE = '22023';
  END IF;

  -- Server-authoritative risk classification.
  v_server_risk := system.classify_task_risk(p_type);
  IF v_server_risk <> p_risk_level THEN
    v_blocked_rsn := COALESCE(v_blocked_rsn, '') ||
      CASE WHEN COALESCE(v_blocked_rsn,'') = '' THEN '' ELSE ' | ' END ||
      format('RISK_MISMATCH: client=%s server=%s', p_risk_level, v_server_risk);
  END IF;

  -- Phase-1 strict allowlist: CRITICAL types are NEVER auto-executed by the
  -- pipeline. They are recorded as blocked for audit but do not enter queued.
  IF v_server_risk = 'CRITICAL' THEN
    v_status := 'blocked';
    v_approved_by := NULL;
    v_blocked_rsn := COALESCE(v_blocked_rsn, '') ||
      CASE WHEN COALESCE(v_blocked_rsn,'') = '' THEN '' ELSE ' | ' END ||
      'PHASE1_CRITICAL_FORBIDDEN: CRITICAL task types cannot execute in phase 1';
  END IF;

  -- Approval-flow override: tasks that explicitly require human approval
  -- enter pending_review instead of queued, even when SAFE.
  IF p_requires_approval AND v_status = 'queued' AND v_server_risk <> 'CRITICAL' THEN
    v_status := 'pending_review';
  END IF;

  IF v_approved_by IS NOT NULL THEN
    v_approved_at := now();
  END IF;

  INSERT INTO system.execution_tasks (
    type, domain, risk_level, status, payload, requested_by,
    parent_task_id, attempt_count, max_attempts, blocked_reason,
    approved_by, approved_at, idempotency_key,
    root_task_id, correlation_id, entity_type, entity_id,
    approval_policy, requires_approval, retry_policy
  ) VALUES (
    v_normalized_t, p_domain, v_server_risk, v_status,
    COALESCE(p_payload, '{}'::jsonb),
    COALESCE(NULLIF(BTRIM(p_requested_by), ''), 'system'),
    p_parent_task_id, 0, COALESCE(p_max_attempts, 3), v_blocked_rsn,
    v_approved_by, v_approved_at,
    NULLIF(BTRIM(p_idempotency_key), ''),
    p_root_task_id,
    NULLIF(BTRIM(p_correlation_id), ''),
    NULLIF(BTRIM(p_entity_type), ''),
    NULLIF(BTRIM(p_entity_id), ''),
    v_policy,
    COALESCE(p_requires_approval, FALSE),
    p_retry_policy
  )
  RETURNING * INTO v_row;

  RETURN v_row;
EXCEPTION
  WHEN unique_violation THEN
    IF p_idempotency_key IS NOT NULL THEN
      SELECT * INTO v_existing
        FROM system.execution_tasks
       WHERE idempotency_key = p_idempotency_key
         AND status IN (
           'pending_review','approved','queued','running','blocked','failed'
         )
       LIMIT 1;
      IF FOUND THEN
        RETURN v_existing;
      END IF;
    END IF;
    RAISE;
END;
$$;

REVOKE ALL ON FUNCTION system.dispatch_execution_task(
  TEXT, TEXT, system.execution_task_risk, system.execution_task_status,
  JSONB, TEXT, UUID, INT, TEXT, TEXT, TEXT,
  UUID, TEXT, TEXT, TEXT, TEXT, BOOLEAN, JSONB
) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION system.dispatch_execution_task(
  TEXT, TEXT, system.execution_task_risk, system.execution_task_status,
  JSONB, TEXT, UUID, INT, TEXT, TEXT, TEXT,
  UUID, TEXT, TEXT, TEXT, TEXT, BOOLEAN, JSONB
) TO authenticated, service_role;

-- ── 6. Recreate validate_execution_task with v2-aware gates ──────────────
-- Same body as Phase-1 (it never referenced the old enum literals), but
-- recreated here so a fresh install is self-contained.
CREATE OR REPLACE FUNCTION system.validate_execution_task(p_task_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, system
AS $$
DECLARE
  v_task        system.execution_tasks;
  v_server_risk system.execution_task_risk;
  v_approver    TEXT;
  v_type        TEXT;
BEGIN
  SELECT * INTO v_task FROM system.execution_tasks WHERE id = p_task_id;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', FALSE, 'reason', 'TASK_NOT_FOUND');
  END IF;

  v_type := UPPER(BTRIM(COALESCE(v_task.type, '')));

  IF v_type = '' THEN
    RETURN jsonb_build_object('ok', FALSE, 'reason', 'MISSING_TYPE: task.type is required');
  END IF;
  IF v_task.domain IS NULL OR BTRIM(v_task.domain) = '' THEN
    RETURN jsonb_build_object('ok', FALSE, 'reason', 'MISSING_DOMAIN: task.domain is required');
  END IF;

  v_server_risk := system.classify_task_risk(v_type);
  v_approver    := NULLIF(BTRIM(COALESCE(v_task.approved_by, '')), '');

  IF v_server_risk = 'CRITICAL' THEN
    RETURN jsonb_build_object(
      'ok', FALSE,
      'reason', 'PHASE1_CRITICAL_FORBIDDEN: CRITICAL task types cannot execute in phase 1',
      'risk_level', v_server_risk
    );
  END IF;

  IF v_server_risk = 'MEDIUM' THEN
    IF v_type IN ('NOTIFICATION_DISPATCH', 'NON_SENSITIVE_BULK_UPDATE') THEN
      IF v_approver IS NULL OR v_approver = 'system' THEN
        RETURN jsonb_build_object(
          'ok', FALSE,
          'reason', format(
            'MEDIUM_REQUIRES_APPROVAL: task type %L is approval-gated and cannot run without a non-system approver',
            v_type
          ),
          'risk_level', v_server_risk
        );
      END IF;
    END IF;
  END IF;

  RETURN jsonb_build_object('ok', TRUE, 'reason', NULL, 'risk_level', v_server_risk);
END;
$$;

REVOKE ALL ON FUNCTION system.validate_execution_task(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION system.validate_execution_task(UUID) TO authenticated, service_role;
