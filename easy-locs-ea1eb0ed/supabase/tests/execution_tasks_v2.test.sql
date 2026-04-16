-- ============================================================================
-- Phase-2 schema execution_tasks v2 — SQL regression suite (task #750)
--
-- Run against a fresh database (after migrations are applied) to assert the
-- structural guarantees of the v2 schema. Execute with:
--     psql "$DATABASE_URL" -f supabase/tests/execution_tasks_v2.test.sql
--
-- Each block raises NOTICE on success and EXCEPTION on failure, so a clean
-- run prints PASS lines and a non-zero exit means a regression.
-- ============================================================================

BEGIN;

-- ── 1. Enum membership ─────────────────────────────────────────────────────
DO $$
DECLARE
  v_count INT;
BEGIN
  SELECT count(*) INTO v_count
    FROM pg_enum e
    JOIN pg_type t ON t.oid = e.enumtypid
    JOIN pg_namespace n ON n.oid = t.typnamespace
   WHERE n.nspname = 'system'
     AND t.typname = 'execution_task_status'
     AND e.enumlabel IN (
       'draft','pending_review','approved','rejected','queued',
       'running','succeeded','failed','blocked','rolled_back','cancelled'
     );
  IF v_count <> 11 THEN
    RAISE EXCEPTION 'FAIL: expected 11 v2 enum labels, found %', v_count;
  END IF;
  RAISE NOTICE 'PASS: enum execution_task_status has all 11 v2 labels';
END $$;

-- ── 2. New v2 columns exist ────────────────────────────────────────────────
DO $$
DECLARE
  v_missing TEXT[];
BEGIN
  SELECT array_agg(c)
    INTO v_missing
    FROM unnest(ARRAY[
      'root_task_id','correlation_id','entity_type','entity_id',
      'approval_policy','requires_approval','execution_state',
      'rejected_by','escalated_by','locked_by','lock_key',
      'validation_result','execution_result','rollback_result',
      'retry_policy','error_code','started_at','completed_at',
      'failed_at','rolled_back_at','next_retry_at'
    ]) AS c
   WHERE NOT EXISTS (
     SELECT 1 FROM information_schema.columns
      WHERE table_schema = 'system'
        AND table_name = 'execution_tasks'
        AND column_name = c
   );
  IF v_missing IS NOT NULL THEN
    RAISE EXCEPTION 'FAIL: missing v2 columns: %', v_missing;
  END IF;
  RAISE NOTICE 'PASS: all v2 columns present on system.execution_tasks';
END $$;

-- ── 3. assert_task_transition matrix ───────────────────────────────────────
DO $$
DECLARE
  v_ok BOOLEAN;
BEGIN
  -- Same-state is always allowed
  v_ok := system.assert_task_transition('queued', 'queued');
  IF NOT v_ok THEN RAISE EXCEPTION 'FAIL: same-state queued→queued should be allowed'; END IF;

  -- Happy path
  IF NOT system.assert_task_transition('queued','running')   THEN RAISE EXCEPTION 'FAIL: queued→running'; END IF;
  IF NOT system.assert_task_transition('running','succeeded') THEN RAISE EXCEPTION 'FAIL: running→succeeded'; END IF;
  IF NOT system.assert_task_transition('running','failed')    THEN RAISE EXCEPTION 'FAIL: running→failed'; END IF;
  IF NOT system.assert_task_transition('failed','queued')     THEN RAISE EXCEPTION 'FAIL: failed→queued (retry)'; END IF;
  IF NOT system.assert_task_transition('blocked','queued')    THEN RAISE EXCEPTION 'FAIL: blocked→queued'; END IF;
  IF NOT system.assert_task_transition('succeeded','rolled_back') THEN RAISE EXCEPTION 'FAIL: succeeded→rolled_back'; END IF;

  -- Forbidden
  IF system.assert_task_transition('succeeded','queued')      THEN RAISE EXCEPTION 'FAIL: succeeded→queued must be forbidden'; END IF;
  IF system.assert_task_transition('succeeded','running')     THEN RAISE EXCEPTION 'FAIL: succeeded→running must be forbidden'; END IF;
  IF system.assert_task_transition('rolled_back','queued')    THEN RAISE EXCEPTION 'FAIL: rolled_back is terminal'; END IF;
  IF system.assert_task_transition('cancelled','queued')      THEN RAISE EXCEPTION 'FAIL: cancelled is terminal'; END IF;
  IF system.assert_task_transition('queued','succeeded')      THEN RAISE EXCEPTION 'FAIL: queued→succeeded must be forbidden'; END IF;
  IF system.assert_task_transition('draft','running')         THEN RAISE EXCEPTION 'FAIL: draft→running must be forbidden'; END IF;
  IF system.assert_task_transition('pending_review','running') THEN RAISE EXCEPTION 'FAIL: pending_review→running must be forbidden'; END IF;

  RAISE NOTICE 'PASS: assert_task_transition matrix matches the v2 spec';
END $$;

-- ── 4. State-machine trigger refuses illegal updates ───────────────────────
DO $$
DECLARE
  v_id UUID;
BEGIN
  INSERT INTO system.execution_tasks (type, domain, risk_level, status)
  VALUES ('ANALYSIS', 'data', 'SAFE', 'queued')
  RETURNING id INTO v_id;

  -- Legal: queued → running
  UPDATE system.execution_tasks SET status = 'running' WHERE id = v_id;

  -- Legal: running → succeeded
  UPDATE system.execution_tasks SET status = 'succeeded' WHERE id = v_id;

  -- Illegal: succeeded → queued must raise
  BEGIN
    UPDATE system.execution_tasks SET status = 'queued' WHERE id = v_id;
    RAISE EXCEPTION 'FAIL: trigger should have refused succeeded→queued';
  EXCEPTION
    WHEN sqlstate '22023' THEN
      RAISE NOTICE 'PASS: trigger refused succeeded→queued';
  END;

  -- Cleanup
  DELETE FROM system.execution_tasks WHERE id = v_id;
END $$;

-- ── 5. Lifecycle timestamps auto-populate ──────────────────────────────────
DO $$
DECLARE
  v_id UUID;
  v_started TIMESTAMPTZ;
  v_completed TIMESTAMPTZ;
BEGIN
  INSERT INTO system.execution_tasks (type, domain, risk_level, status)
  VALUES ('ANALYSIS', 'data', 'SAFE', 'queued')
  RETURNING id INTO v_id;

  UPDATE system.execution_tasks SET status = 'running' WHERE id = v_id
    RETURNING started_at INTO v_started;
  IF v_started IS NULL THEN RAISE EXCEPTION 'FAIL: started_at not auto-stamped'; END IF;

  UPDATE system.execution_tasks SET status = 'succeeded' WHERE id = v_id
    RETURNING completed_at INTO v_completed;
  IF v_completed IS NULL THEN RAISE EXCEPTION 'FAIL: completed_at not auto-stamped'; END IF;

  DELETE FROM system.execution_tasks WHERE id = v_id;
  RAISE NOTICE 'PASS: lifecycle timestamps auto-populate on transition';
END $$;

-- ── 6. idempotency_key partial-unique (scoped to ACTIVE states) ───────────
DO $$
DECLARE
  v_a UUID;
  v_b UUID;
  v_c UUID;
BEGIN
  -- Two active rows with the same key are forbidden.
  INSERT INTO system.execution_tasks (type, domain, risk_level, status, idempotency_key)
  VALUES ('ANALYSIS', 'data', 'SAFE', 'queued', 'idem-test-1')
  RETURNING id INTO v_a;

  BEGIN
    INSERT INTO system.execution_tasks (type, domain, risk_level, status, idempotency_key)
    VALUES ('ANALYSIS', 'data', 'SAFE', 'queued', 'idem-test-1')
    RETURNING id INTO v_b;
    RAISE EXCEPTION 'FAIL: duplicate active idempotency_key was allowed';
  EXCEPTION
    WHEN unique_violation THEN
      RAISE NOTICE 'PASS: active idempotency_key uniqueness enforced';
  END;

  -- Drive v_a through to a terminal state (succeeded), then re-using the
  -- same key for a fresh dispatch must be allowed (replay / re-run).
  UPDATE system.execution_tasks SET status = 'running'   WHERE id = v_a;
  UPDATE system.execution_tasks SET status = 'succeeded' WHERE id = v_a;

  INSERT INTO system.execution_tasks (type, domain, risk_level, status, idempotency_key)
  VALUES ('ANALYSIS', 'data', 'SAFE', 'queued', 'idem-test-1')
  RETURNING id INTO v_c;
  RAISE NOTICE 'PASS: idempotency_key reusable once prior task is terminal';

  -- NULL idempotency_key allows multiple rows.
  INSERT INTO system.execution_tasks (type, domain, risk_level, status, idempotency_key)
  VALUES ('ANALYSIS', 'data', 'SAFE', 'queued', NULL);
  INSERT INTO system.execution_tasks (type, domain, risk_level, status, idempotency_key)
  VALUES ('ANALYSIS', 'data', 'SAFE', 'queued', NULL);
  RAISE NOTICE 'PASS: NULL idempotency_key permits multiple rows';

  DELETE FROM system.execution_tasks
    WHERE id IN (v_a, v_c) OR idempotency_key IS NULL;
END $$;

-- ── 7. dispatch RPC persists v2 fields and enforces CRITICAL→blocked ──────
DO $$
DECLARE
  v_row system.execution_tasks;
BEGIN
  -- SAFE task with v2 fields persists everything
  v_row := system.dispatch_execution_task(
    p_type             := 'ANALYSIS',
    p_domain           := 'data',
    p_risk_level       := 'SAFE',
    p_status           := 'queued',
    p_payload          := '{"x":1}'::jsonb,
    p_correlation_id   := 'corr-abc',
    p_entity_type      := 'listing',
    p_entity_id        := 'listing-1',
    p_approval_policy  := 'single_admin',
    p_requires_approval := FALSE,
    p_retry_policy     := '{"max":5}'::jsonb
  );
  IF v_row.correlation_id   IS DISTINCT FROM 'corr-abc'   THEN RAISE EXCEPTION 'FAIL: correlation_id not persisted'; END IF;
  IF v_row.entity_type      IS DISTINCT FROM 'listing'    THEN RAISE EXCEPTION 'FAIL: entity_type not persisted'; END IF;
  IF v_row.entity_id        IS DISTINCT FROM 'listing-1'  THEN RAISE EXCEPTION 'FAIL: entity_id not persisted'; END IF;
  IF v_row.approval_policy  IS DISTINCT FROM 'single_admin' THEN RAISE EXCEPTION 'FAIL: approval_policy not persisted'; END IF;
  IF v_row.retry_policy     IS NULL THEN RAISE EXCEPTION 'FAIL: retry_policy not persisted'; END IF;
  IF v_row.status           <> 'queued' THEN RAISE EXCEPTION 'FAIL: SAFE/no-approval should be queued'; END IF;
  DELETE FROM system.execution_tasks WHERE id = v_row.id;

  -- requires_approval=true forces pending_review
  v_row := system.dispatch_execution_task(
    p_type := 'ANALYSIS', p_domain := 'data',
    p_risk_level := 'SAFE', p_status := 'queued',
    p_requires_approval := TRUE
  );
  IF v_row.status <> 'pending_review' THEN
    RAISE EXCEPTION 'FAIL: requires_approval=true should land in pending_review, got %', v_row.status;
  END IF;
  DELETE FROM system.execution_tasks WHERE id = v_row.id;

  -- CRITICAL is always forced to blocked
  v_row := system.dispatch_execution_task(
    p_type := 'SCHEMA_MIGRATION', p_domain := 'data',
    p_risk_level := 'CRITICAL', p_status := 'queued',
    p_approved_by := 'admin@example.com'
  );
  IF v_row.status <> 'blocked' THEN
    RAISE EXCEPTION 'FAIL: CRITICAL must be forced to blocked, got %', v_row.status;
  END IF;
  IF v_row.blocked_reason NOT LIKE '%PHASE1_CRITICAL_FORBIDDEN%' THEN
    RAISE EXCEPTION 'FAIL: blocked_reason must mention PHASE1_CRITICAL_FORBIDDEN';
  END IF;
  DELETE FROM system.execution_tasks WHERE id = v_row.id;

  RAISE NOTICE 'PASS: dispatch RPC persists v2 fields and enforces CRITICAL→blocked';
END $$;

ROLLBACK;
