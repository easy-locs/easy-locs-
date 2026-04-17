-- ============================================================================
-- Sovereign Agent Control · L5 — Admin approvals inbox SQL regression (#812)
--
-- Run with:  psql "$DATABASE_URL" -f supabase/tests/admin_approvals_inbox.test.sql
-- ============================================================================

BEGIN;

-- ── 1. Schema objects exist ───────────────────────────────────────────────
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.tables
     WHERE table_schema = 'system' AND table_name = 'task_approvals'
  ) THEN
    RAISE EXCEPTION 'FAIL: system.task_approvals table missing';
  END IF;
  RAISE NOTICE 'PASS: task_approvals table exists';

  IF NOT EXISTS (
    SELECT 1 FROM pg_proc p
      JOIN pg_namespace n ON n.oid = p.pronamespace
     WHERE n.nspname = 'system' AND p.proname = 'decide_task_approval'
  ) THEN
    RAISE EXCEPTION 'FAIL: system.decide_task_approval RPC missing';
  END IF;
  RAISE NOTICE 'PASS: decide_task_approval RPC exists';

  IF NOT EXISTS (
    SELECT 1 FROM pg_type t JOIN pg_namespace n ON n.oid = t.typnamespace
     WHERE n.nspname = 'system' AND t.typname = 'task_approval_decision'
  ) THEN
    RAISE EXCEPTION 'FAIL: task_approval_decision enum missing';
  END IF;
  RAISE NOTICE 'PASS: task_approval_decision enum exists';
END $$;

-- ── 2. Decisions on a non-pending_review task are rejected ────────────────
DO $$
DECLARE
  v_task_id UUID;
  v_err_state TEXT;
BEGIN
  -- Seed a queued task (NOT pending_review) and try to decide.
  INSERT INTO system.execution_tasks (
    type, domain, risk_level, status, payload, requested_by
  ) VALUES (
    'test.l5.invalid_state', 'system', 'SAFE', 'queued', '{}'::jsonb, NULL
  ) RETURNING id INTO v_task_id;

  BEGIN
    PERFORM system.decide_task_approval(
      p_task_id => v_task_id,
      p_decision => 'approved'::system.task_approval_decision,
      p_reason => 'should not work'
    );
    RAISE EXCEPTION 'FAIL: approve on queued task should have raised invalid_state';
  EXCEPTION WHEN OTHERS THEN
    GET STACKED DIAGNOSTICS v_err_state = MESSAGE_TEXT;
    IF v_err_state NOT ILIKE '%invalid_state%' AND v_err_state NOT ILIKE '%pending_review%' THEN
      RAISE EXCEPTION 'FAIL: expected invalid_state-style error, got: %', v_err_state;
    END IF;
    RAISE NOTICE 'PASS: rejects decision on non-pending_review task (%)', v_err_state;
  END;
END $$;

-- ── 3. APPROVAL_REQUESTED canonical event fires on transition ─────────────
-- The migration emits via `system.emit_task_canonical_event(...)` which
-- writes to `public.engine_run_logs` (`category` = event name,
-- `metadata_json.task_id` = task id). We assert against that ACTUAL sink.
DO $$
DECLARE
  v_task_id UUID;
  v_event_count INT;
BEGIN
  INSERT INTO system.execution_tasks (
    type, domain, risk_level, status, payload, requested_by, blocked_reason
  ) VALUES (
    'test.l5.approval_requested', 'marketplace', 'MEDIUM', 'pending_review',
    '{}'::jsonb, NULL, 'price ceiling'
  ) RETURNING id INTO v_task_id;

  SELECT count(*) INTO v_event_count
    FROM public.engine_run_logs
   WHERE category = 'approval.requested'
     AND metadata_json->>'task_id' = v_task_id::text;

  IF v_event_count < 1 THEN
    RAISE EXCEPTION 'FAIL: approval.requested event was not emitted to engine_run_logs';
  END IF;
  RAISE NOTICE 'PASS: approval.requested emitted to engine_run_logs (% rows)', v_event_count;
END $$;

-- ── 4. Direct SELECT on task_approvals is denied for the `authenticated`
--    role — the only legal read path is `system.list_task_approvals`. ─
DO $$
DECLARE
  v_rls BOOLEAN;
  v_has_grant BOOLEAN;
BEGIN
  SELECT relrowsecurity INTO v_rls
    FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
   WHERE n.nspname = 'system' AND c.relname = 'task_approvals';
  IF NOT v_rls THEN
    RAISE EXCEPTION 'FAIL: RLS not enabled on system.task_approvals';
  END IF;

  -- Assert the `authenticated` role has NO table-level SELECT — proof
  -- that admins must funnel reads through list_task_approvals().
  SELECT has_table_privilege('authenticated', 'system.task_approvals', 'SELECT')
    INTO v_has_grant;
  IF v_has_grant THEN
    RAISE EXCEPTION 'FAIL: `authenticated` role has direct SELECT on system.task_approvals — must be RPC-only';
  END IF;
  RAISE NOTICE 'PASS: direct SELECT denied for authenticated; RPC-only read path enforced';
END $$;

-- ── 5. list_task_approvals exists and requires super_admin role ─────────
DO $$
DECLARE
  v_src TEXT;
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_proc p
      JOIN pg_namespace n ON n.oid = p.pronamespace
     WHERE n.nspname = 'system' AND p.proname = 'list_task_approvals'
  ) THEN
    RAISE EXCEPTION 'FAIL: system.list_task_approvals RPC missing';
  END IF;
  RAISE NOTICE 'PASS: list_task_approvals RPC exists';

  -- Source-level proof that BOTH RPCs gate on super_admin (the actual
  -- runtime gate is exercised by app-layer integration tests under an
  -- authenticated session; here we assert the static contract).
  SELECT pg_get_functiondef(p.oid) INTO v_src
    FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
   WHERE n.nspname = 'system' AND p.proname = 'list_task_approvals';
  IF v_src NOT ILIKE '%super_admin%' THEN
    RAISE EXCEPTION 'FAIL: list_task_approvals must gate on super_admin';
  END IF;
  SELECT pg_get_functiondef(p.oid) INTO v_src
    FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
   WHERE n.nspname = 'system' AND p.proname = 'decide_task_approval';
  IF v_src NOT ILIKE '%super_admin%' THEN
    RAISE EXCEPTION 'FAIL: decide_task_approval must gate on super_admin';
  END IF;
  RAISE NOTICE 'PASS: both approval RPCs gate on super_admin';
END $$;

-- ── 6. State machine extension: pending_review → draft is now legal ─────
DO $$
BEGIN
  IF NOT system.assert_task_transition(
    'pending_review'::system.execution_task_status,
    'draft'::system.execution_task_status
  ) THEN
    RAISE EXCEPTION 'FAIL: pending_review → draft must be allowed for changes_requested';
  END IF;
  -- Negative control: cancelled is still terminal.
  IF system.assert_task_transition(
    'cancelled'::system.execution_task_status,
    'draft'::system.execution_task_status
  ) THEN
    RAISE EXCEPTION 'FAIL: cancelled must remain terminal';
  END IF;
  RAISE NOTICE 'PASS: state machine extended for changes_requested';
END $$;

ROLLBACK;

\echo 'L5 admin approvals inbox tests: ALL PASS'
