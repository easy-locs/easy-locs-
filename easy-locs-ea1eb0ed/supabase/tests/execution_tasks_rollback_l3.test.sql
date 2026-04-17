-- ============================================================================
-- Sovereign Agent Control · L3 — Rollback path SQL regression suite (#811)
--
-- Run with:   psql "$DATABASE_URL" -f supabase/tests/execution_tasks_rollback_l3.test.sql
-- ============================================================================

BEGIN;

-- ── 1. New enum labels ─────────────────────────────────────────────────────
DO $$
DECLARE v_count INT;
BEGIN
  SELECT count(*) INTO v_count
    FROM pg_enum e
    JOIN pg_type t ON t.oid = e.enumtypid
    JOIN pg_namespace n ON n.oid = t.typnamespace
   WHERE n.nspname = 'system'
     AND t.typname = 'execution_task_status'
     AND e.enumlabel IN ('rolling_back','rollback_failed');
  IF v_count <> 2 THEN
    RAISE EXCEPTION 'FAIL: expected rolling_back + rollback_failed enum labels, found %', v_count;
  END IF;
  RAISE NOTICE 'PASS: enum has rolling_back + rollback_failed';
END $$;

-- ── 2. New columns exist ───────────────────────────────────────────────────
DO $$
DECLARE v_missing TEXT[];
BEGIN
  SELECT array_agg(c) INTO v_missing
    FROM unnest(ARRAY[
      'previous_state','rollback_strategy','rollback_requested_by',
      'rollback_reason','rollback_started_at','rollback_failed_at'
    ]) AS c
   WHERE NOT EXISTS (
     SELECT 1 FROM information_schema.columns
      WHERE table_schema = 'system' AND table_name = 'execution_tasks' AND column_name = c
   );
  IF v_missing IS NOT NULL THEN
    RAISE EXCEPTION 'FAIL: missing rollback columns: %', v_missing;
  END IF;
  RAISE NOTICE 'PASS: rollback columns present';
END $$;

-- ── 3. assert_task_transition matrix ──────────────────────────────────────
DO $$
BEGIN
  IF NOT system.assert_task_transition('failed','rolling_back')           THEN RAISE EXCEPTION 'FAIL: failed→rolling_back'; END IF;
  IF NOT system.assert_task_transition('succeeded','rolling_back')        THEN RAISE EXCEPTION 'FAIL: succeeded→rolling_back'; END IF;
  IF NOT system.assert_task_transition('rolling_back','rolled_back')      THEN RAISE EXCEPTION 'FAIL: rolling_back→rolled_back'; END IF;
  IF NOT system.assert_task_transition('rolling_back','rollback_failed')  THEN RAISE EXCEPTION 'FAIL: rolling_back→rollback_failed'; END IF;
  IF NOT system.assert_task_transition('rollback_failed','rolling_back')  THEN RAISE EXCEPTION 'FAIL: rollback_failed→rolling_back (retry)'; END IF;
  IF NOT system.assert_task_transition('rollback_failed','blocked')       THEN RAISE EXCEPTION 'FAIL: rollback_failed→blocked'; END IF;

  -- Forbidden
  IF system.assert_task_transition('rolled_back','rolling_back')   THEN RAISE EXCEPTION 'FAIL: rolled_back is terminal'; END IF;
  IF system.assert_task_transition('rolling_back','running')       THEN RAISE EXCEPTION 'FAIL: rolling_back→running must be forbidden'; END IF;
  IF system.assert_task_transition('rolling_back','queued')        THEN RAISE EXCEPTION 'FAIL: rolling_back→queued must be forbidden'; END IF;
  IF system.assert_task_transition('queued','rolling_back')        THEN RAISE EXCEPTION 'FAIL: queued→rolling_back must be forbidden'; END IF;
  IF system.assert_task_transition('running','rolling_back')       THEN RAISE EXCEPTION 'FAIL: running→rolling_back must be forbidden (must transit failed first)'; END IF;
  IF system.assert_task_transition('rollback_failed','rolled_back') THEN RAISE EXCEPTION 'FAIL: rollback_failed→rolled_back must require rolling_back hop'; END IF;

  RAISE NOTICE 'PASS: rollback transition matrix';
END $$;

-- ── 4. Trigger auto-stamps rollback timestamps ────────────────────────────
DO $$
DECLARE
  v_id UUID;
  v_started TIMESTAMPTZ;
  v_rolled  TIMESTAMPTZ;
  v_failed  TIMESTAMPTZ;
BEGIN
  INSERT INTO system.execution_tasks (type, domain, risk_level, status)
  VALUES ('ANALYSIS','data','SAFE','queued')
  RETURNING id INTO v_id;
  UPDATE system.execution_tasks SET status='running' WHERE id=v_id;
  UPDATE system.execution_tasks SET status='failed' WHERE id=v_id;
  UPDATE system.execution_tasks SET status='rolling_back' WHERE id=v_id
    RETURNING rollback_started_at INTO v_started;
  IF v_started IS NULL THEN RAISE EXCEPTION 'FAIL: rollback_started_at not auto-stamped'; END IF;

  UPDATE system.execution_tasks SET status='rolled_back' WHERE id=v_id
    RETURNING rolled_back_at INTO v_rolled;
  IF v_rolled IS NULL THEN RAISE EXCEPTION 'FAIL: rolled_back_at not auto-stamped'; END IF;

  -- A second row to test rollback_failed timestamp.
  INSERT INTO system.execution_tasks (type, domain, risk_level, status)
  VALUES ('ANALYSIS','data','SAFE','queued')
  RETURNING id INTO v_id;
  UPDATE system.execution_tasks SET status='running' WHERE id=v_id;
  UPDATE system.execution_tasks SET status='failed' WHERE id=v_id;
  UPDATE system.execution_tasks SET status='rolling_back' WHERE id=v_id;
  UPDATE system.execution_tasks SET status='rollback_failed' WHERE id=v_id
    RETURNING rollback_failed_at INTO v_failed;
  IF v_failed IS NULL THEN RAISE EXCEPTION 'FAIL: rollback_failed_at not auto-stamped'; END IF;

  RAISE NOTICE 'PASS: rollback timestamps auto-stamp on transition';
END $$;

-- ── 5. request_rollback RPC ───────────────────────────────────────────────
-- The RPC now enforces the adapter contract server-side by reading
-- `system.agents.metadata->>'rollback_strategy'` and
-- `metadata->>'allow_rollback_after_success'`. We therefore stand up two
-- synthetic agents in the registry and probe both contracts.
DO $$
DECLARE
  v_id           UUID;
  v_row          system.execution_tasks;
  v_agent_manual UUID;
  v_agent_none   UUID;
BEGIN
  -- Manual-rollback-eligible agent (data, ANALYSIS).
  -- NOTE: schema requires `agent_kind` to match `^[a-z][a-z0-9_]*\.[a-z][a-z0-9_]*$`.
  INSERT INTO system.agents (
    slug, display_name, agent_kind, owner_team, status, metadata
  ) VALUES (
    'l3-test-analysis', 'L3 Test Analysis', 'business.test', 'l3-test', 'active',
    jsonb_build_object(
      'rollback_strategy', 'manual',
      'allow_rollback_after_success', false
    )
  ) RETURNING id INTO v_agent_manual;
  INSERT INTO system.agent_capabilities (agent_id, domain, task_type)
    VALUES (v_agent_manual, 'data', 'ANALYSIS');

  -- Non-rollbackable agent (data, NOROLL).
  INSERT INTO system.agents (
    slug, display_name, agent_kind, owner_team, status, metadata
  ) VALUES (
    'l3-test-noroll', 'L3 Test NoRoll', 'business.test', 'l3-test', 'active',
    jsonb_build_object('rollback_strategy', 'none')
  ) RETURNING id INTO v_agent_none;
  INSERT INTO system.agent_capabilities (agent_id, domain, task_type)
    VALUES (v_agent_none, 'data', 'NOROLL');

  -- (a) failed task → rolling_back, pre_rollback_status='failed'
  INSERT INTO system.execution_tasks (type, domain, risk_level, status)
  VALUES ('ANALYSIS','data','SAFE','failed')
  RETURNING id INTO v_id;
  v_row := system.request_rollback(v_id, 'operator-test');
  IF v_row.status <> 'rolling_back' THEN RAISE EXCEPTION 'FAIL: should land in rolling_back, got %', v_row.status; END IF;
  IF v_row.rollback_reason <> 'operator-test' THEN RAISE EXCEPTION 'FAIL: rollback_reason not stamped'; END IF;
  IF v_row.rollback_requested_by IS NULL THEN RAISE EXCEPTION 'FAIL: rollback_requested_by not stamped'; END IF;
  IF v_row.pre_rollback_status <> 'failed' THEN RAISE EXCEPTION 'FAIL: pre_rollback_status not stamped to failed, got %', v_row.pre_rollback_status; END IF;
  IF v_row.rollback_strategy <> 'manual' THEN RAISE EXCEPTION 'FAIL: rollback_strategy not mirrored from agent metadata, got %', v_row.rollback_strategy; END IF;

  -- (b) succeeded task with agent NOT opted-in → rejected
  INSERT INTO system.execution_tasks (type, domain, risk_level, status)
  VALUES ('ANALYSIS','data','SAFE','succeeded')
  RETURNING id INTO v_id;
  BEGIN
    PERFORM system.request_rollback(v_id, 'try-succeeded');
    RAISE EXCEPTION 'FAIL: succeeded task without allow_after_success should be rejected';
  EXCEPTION
    WHEN sqlstate '22023' THEN
      RAISE NOTICE 'PASS: succeeded without allow_after_success rejected';
  END;

  -- (c) flip the agent's metadata to allow_after_success=true → succeeded passes
  UPDATE system.agents
     SET metadata = jsonb_set(metadata, '{allow_rollback_after_success}', 'true'::jsonb)
   WHERE id = v_agent_manual;
  v_row := system.request_rollback(v_id, 'try-succeeded');
  IF v_row.status <> 'rolling_back' THEN RAISE EXCEPTION 'FAIL: succeeded→rolling_back via opt-in flag'; END IF;
  IF v_row.pre_rollback_status <> 'succeeded' THEN RAISE EXCEPTION 'FAIL: pre_rollback_status should be succeeded, got %', v_row.pre_rollback_status; END IF;

  -- (d) agent declares rollback_strategy='none' → rejected
  INSERT INTO system.execution_tasks (type, domain, risk_level, status)
  VALUES ('NOROLL','data','SAFE','failed')
  RETURNING id INTO v_id;
  BEGIN
    PERFORM system.request_rollback(v_id, 'try-none');
    RAISE EXCEPTION 'FAIL: rollback_strategy=none agent should reject';
  EXCEPTION
    WHEN sqlstate '22023' THEN
      RAISE NOTICE 'PASS: rollback_strategy=none rejected';
  END;

  -- (e) queued task is ineligible (status gate)
  INSERT INTO system.execution_tasks (type, domain, risk_level, status)
  VALUES ('ANALYSIS','data','SAFE','queued')
  RETURNING id INTO v_id;
  BEGIN
    PERFORM system.request_rollback(v_id, 'try-queued');
    RAISE EXCEPTION 'FAIL: queued is not rollback-eligible';
  EXCEPTION
    WHEN sqlstate '22023' THEN
      RAISE NOTICE 'PASS: queued task rejected';
  END;

  -- (f) empty reason rejected
  INSERT INTO system.execution_tasks (type, domain, risk_level, status)
  VALUES ('ANALYSIS','data','SAFE','failed')
  RETURNING id INTO v_id;
  BEGIN
    PERFORM system.request_rollback(v_id, '   ');
    RAISE EXCEPTION 'FAIL: empty reason should be rejected';
  EXCEPTION
    WHEN sqlstate '22023' THEN
      RAISE NOTICE 'PASS: empty reason rejected';
  END;

  -- (g) unregistered (domain, type) → rejected (no agent owner)
  INSERT INTO system.execution_tasks (type, domain, risk_level, status)
  VALUES ('UNKNOWN','ghost','SAFE','failed')
  RETURNING id INTO v_id;
  BEGIN
    PERFORM system.request_rollback(v_id, 'no-owner');
    RAISE EXCEPTION 'FAIL: unregistered (domain,type) should reject';
  EXCEPTION
    WHEN sqlstate '22023' THEN
      RAISE NOTICE 'PASS: unregistered (domain,type) rejected';
  END;

  RAISE NOTICE 'PASS: request_rollback RPC';
END $$;

-- ── 6. rollback_strategy CHECK constraint ─────────────────────────────────
DO $$
DECLARE v_id UUID;
BEGIN
  INSERT INTO system.execution_tasks (type, domain, risk_level, status, rollback_strategy)
  VALUES ('ANALYSIS','data','SAFE','queued','auto')
  RETURNING id INTO v_id;

  BEGIN
    UPDATE system.execution_tasks SET rollback_strategy = 'invalid' WHERE id = v_id;
    RAISE EXCEPTION 'FAIL: invalid rollback_strategy was accepted';
  EXCEPTION
    WHEN check_violation THEN
      RAISE NOTICE 'PASS: rollback_strategy CHECK rejects invalid values';
  END;
END $$;

ROLLBACK;
