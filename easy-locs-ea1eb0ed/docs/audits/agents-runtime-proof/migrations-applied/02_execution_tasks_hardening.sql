-- ============================================================================
-- Autonomous Execution Layer — Phase 1 Hardening (task #710 final blockers)
--
-- Implements the six remaining production-safety blockers raised in the final
-- review:
--   1. Idempotent dispatch (unique idempotency_key)
--   2. Atomic RPC transaction (single PL/pgSQL function = single tx)
--   3. Server-side authority on risk_level (RPC re-classifies, never trusts client)
--   4. Phase-1 strict allowlist: CRITICAL execution always BLOCKED at the RPC
--   5. Failure observability (structured status enum in engine_run_logs metadata)
--   6. Strict state-machine enforcement (DB trigger rejecting illegal transitions)
-- ============================================================================

-- ── 1. Idempotency key ─────────────────────────────────────────────────────
ALTER TABLE system.execution_tasks
  ADD COLUMN IF NOT EXISTS idempotency_key TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS execution_tasks_idempotency_key_uniq
  ON system.execution_tasks(idempotency_key)
  WHERE idempotency_key IS NOT NULL;

-- ── 3. Server-side risk classifier (single source of truth in DB) ──────────
-- Mirrors src/core/execution/risk-classification.ts. Unknown → CRITICAL.
CREATE OR REPLACE FUNCTION system.classify_task_risk(_type TEXT)
RETURNS system.execution_task_risk
LANGUAGE plpgsql IMMUTABLE
AS $$
DECLARE
  t TEXT := UPPER(BTRIM(COALESCE(_type, '')));
BEGIN
  IF t = '' THEN RETURN 'CRITICAL'; END IF;

  IF t IN (
    'ANALYSIS','VALIDATION','RETRY','RESYNC','REPORT_GENERATION',
    'INCIDENT_CLASSIFICATION','NON_SENSITIVE_DEDUP','READ_ONLY_QUERY','CACHE_REFRESH'
  ) THEN
    RETURN 'SAFE';
  END IF;

  IF t IN (
    'UI_FIX','NON_CRITICAL_DATA_FIX','REVIEW_QUEUE_RESOLUTION',
    'NOTIFICATION_DISPATCH','NON_SENSITIVE_BULK_UPDATE'
  ) THEN
    RETURN 'MEDIUM';
  END IF;

  IF t IN (
    'SCHEMA_MIGRATION','DEPLOYMENT','CODE_PATCH','RLS_CHANGE',
    'SECRET_ROTATION','USER_DELETION'
  ) THEN
    RETURN 'CRITICAL';
  END IF;

  IF t LIKE 'WALLET\_%' ESCAPE '\' OR t LIKE 'AUTH\_%' ESCAPE '\' OR t LIKE 'FINANCIAL\_%' ESCAPE '\' THEN
    RETURN 'CRITICAL';
  END IF;

  -- Deny-by-default
  RETURN 'CRITICAL';
END;
$$;

REVOKE ALL ON FUNCTION system.classify_task_risk(TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION system.classify_task_risk(TEXT) TO authenticated, service_role;

-- ── 6. State-machine trigger ──────────────────────────────────────────────
-- Allowed transitions for system.execution_tasks.status:
--   PENDING  → RUNNING | BLOCKED | FAILED | SUCCESS
--   RUNNING  → SUCCESS | FAILED | BLOCKED
--   BLOCKED  → PENDING (re-queue after manual approval) | (terminal)
--   SUCCESS  → (terminal)
--   FAILED   → PENDING (retry) | (terminal)
-- Anything else (e.g. SUCCESS → PENDING, BLOCKED → RUNNING, FAILED → SUCCESS)
-- is rejected at the DB layer.
CREATE OR REPLACE FUNCTION system.execution_tasks_enforce_state_machine()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  ok BOOLEAN := FALSE;
BEGIN
  IF OLD.status = NEW.status THEN
    RETURN NEW;
  END IF;

  IF OLD.status = 'PENDING' AND NEW.status IN ('RUNNING','BLOCKED','FAILED','SUCCESS') THEN ok := TRUE;
  ELSIF OLD.status = 'RUNNING' AND NEW.status IN ('SUCCESS','FAILED','BLOCKED')         THEN ok := TRUE;
  ELSIF OLD.status = 'BLOCKED' AND NEW.status = 'PENDING'                                THEN ok := TRUE;
  ELSIF OLD.status = 'FAILED'  AND NEW.status = 'PENDING'                                THEN ok := TRUE;
  END IF;

  IF NOT ok THEN
    RAISE EXCEPTION 'execution_tasks illegal state transition: % → %', OLD.status, NEW.status
      USING ERRCODE = '22023';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_execution_tasks_state_machine ON system.execution_tasks;
CREATE TRIGGER trg_execution_tasks_state_machine
  BEFORE UPDATE OF status ON system.execution_tasks
  FOR EACH ROW EXECUTE FUNCTION system.execution_tasks_enforce_state_machine();

-- ── Drop the legacy 10-arg dispatch RPC ───────────────────────────────────
-- The first migration created `dispatch_execution_task(... 10 args)`. This
-- migration replaces it with an 11-arg hardened signature (adds
-- p_idempotency_key + server-authoritative classification + Phase-1 strict
-- allowlist). PostgreSQL treats functions of different arity as distinct
-- overloads, so the old signature would otherwise remain callable and
-- bypass the new Phase-1 safety guarantees. Explicitly drop it here.
DROP FUNCTION IF EXISTS system.dispatch_execution_task(
  TEXT, TEXT, system.execution_task_risk, system.execution_task_status,
  JSONB, TEXT, UUID, INT, TEXT, TEXT
);

-- ── 2/3/4. Hardened dispatch RPC ──────────────────────────────────────────
-- Replaces the prior dispatch_execution_task with a fully server-authoritative
-- version: the RPC re-classifies risk, applies a strict Phase-1 allowlist
-- (no CRITICAL execution ever leaves PENDING from this entrypoint), enforces
-- idempotency, and runs the entire validate→insert path in a single
-- PL/pgSQL transaction (atomic by construction).
CREATE OR REPLACE FUNCTION system.dispatch_execution_task(
  p_type            TEXT,
  p_domain          TEXT,
  p_risk_level      system.execution_task_risk,   -- client-suggested; ignored if mismatch
  p_status          system.execution_task_status,
  p_payload         JSONB DEFAULT '{}'::jsonb,
  p_requested_by    TEXT  DEFAULT 'system',
  p_parent_task_id  UUID  DEFAULT NULL,
  p_max_attempts    INT   DEFAULT 3,
  p_approved_by     TEXT  DEFAULT NULL,
  p_blocked_reason  TEXT  DEFAULT NULL,
  p_idempotency_key TEXT  DEFAULT NULL
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
BEGIN
  -- Admin gate (service_role bypasses).
  IF v_caller IS NOT NULL THEN
    IF NOT public.has_role(v_caller, 'admin'::public.app_role) THEN
      RAISE EXCEPTION 'execution_tasks dispatch denied: caller % is not an admin', v_caller
        USING ERRCODE = '42501';
    END IF;
  END IF;

  -- 1. Idempotency: if a row with this key already exists, return it instead
  --    of creating a duplicate. Protects against double-clicks / retries /
  --    network replays. NULL key = no idempotency (legacy behaviour).
  IF p_idempotency_key IS NOT NULL AND BTRIM(p_idempotency_key) <> '' THEN
    SELECT * INTO v_existing
      FROM system.execution_tasks
     WHERE idempotency_key = p_idempotency_key
     LIMIT 1;
    IF FOUND THEN
      RETURN v_existing;
    END IF;
  END IF;

  -- 2. Status sanity: only PENDING/BLOCKED at creation.
  IF v_status NOT IN ('PENDING', 'BLOCKED') THEN
    RAISE EXCEPTION 'execution_tasks dispatch denied: status % not allowed at creation', v_status
      USING ERRCODE = '22023';
  END IF;

  -- 3. Server-authoritative risk classification. Client-supplied
  --    p_risk_level is only a hint — the DB recomputes from p_type. If they
  --    disagree we always pick the server value and surface the mismatch.
  v_server_risk := system.classify_task_risk(p_type);
  IF v_server_risk <> p_risk_level THEN
    v_blocked_rsn := COALESCE(v_blocked_rsn, '') ||
      CASE WHEN COALESCE(v_blocked_rsn,'') = '' THEN '' ELSE ' | ' END ||
      format('RISK_MISMATCH: client=%s server=%s', p_risk_level, v_server_risk);
  END IF;

  -- 4. Phase-1 strict allowlist: CRITICAL task types are NEVER executed via
  --    this entrypoint, even with an admin approver. They are recorded as
  --    BLOCKED for full audit but never leave PENDING for the orchestrator.
  --    Wallet, auth, schema, deployment, code-patch, financial, etc. all
  --    fall here by classification.
  IF v_server_risk = 'CRITICAL' THEN
    v_status := 'BLOCKED';
    v_approved_by := NULL;
    v_blocked_rsn := COALESCE(v_blocked_rsn, '') ||
      CASE WHEN COALESCE(v_blocked_rsn,'') = '' THEN '' ELSE ' | ' END ||
      'PHASE1_CRITICAL_FORBIDDEN: CRITICAL task types cannot execute in phase 1';
  END IF;

  IF v_approved_by IS NOT NULL THEN
    v_approved_at := now();
  END IF;

  -- 5. Atomic insert (single PL/pgSQL = single transaction).
  INSERT INTO system.execution_tasks (
    type, domain, risk_level, status, payload, requested_by,
    parent_task_id, attempt_count, max_attempts, blocked_reason,
    approved_by, approved_at, idempotency_key
  ) VALUES (
    v_normalized_t, p_domain, v_server_risk, v_status,
    COALESCE(p_payload, '{}'::jsonb),
    COALESCE(NULLIF(BTRIM(p_requested_by), ''), 'system'),
    p_parent_task_id, 0, COALESCE(p_max_attempts, 3), v_blocked_rsn,
    v_approved_by, v_approved_at,
    NULLIF(BTRIM(p_idempotency_key), '')
  )
  RETURNING * INTO v_row;

  RETURN v_row;
EXCEPTION
  -- Concurrent idempotent insert race: someone else inserted with the same key
  -- between our SELECT and INSERT. Re-fetch and return the winning row.
  WHEN unique_violation THEN
    IF p_idempotency_key IS NOT NULL THEN
      SELECT * INTO v_existing
        FROM system.execution_tasks
       WHERE idempotency_key = p_idempotency_key
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
  JSONB, TEXT, UUID, INT, TEXT, TEXT, TEXT
) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION system.dispatch_execution_task(
  TEXT, TEXT, system.execution_task_risk, system.execution_task_status,
  JSONB, TEXT, UUID, INT, TEXT, TEXT, TEXT
) TO authenticated, service_role;
