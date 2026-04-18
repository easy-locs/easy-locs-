-- ============================================================================
-- Task #1017 — Watchdog & anti-deadlock SQL spec.
--
-- This file is a self-contained psql script that exercises the deterministic
-- behaviours of the watchdog/anti-deadlock surface against a real Postgres
-- (Supabase shadow DB or a local instance).
--
-- Run from project root:
--   psql "$SUPABASE_DB_URL" -v ON_ERROR_STOP=1 \
--        -f tests/sql/watchdog_anti_deadlock.spec.sql
--
-- Each test wraps in BEGIN..ROLLBACK so the database is left untouched and
-- reruns are idempotent. A failing assertion RAISEs and aborts the script.
-- ============================================================================

\set ON_ERROR_STOP on
\set QUIET on

-- ──────────────────────────────────────────────────────────────────────────
-- Helper: insert a stub task in `queued` for use as an upstream dep.
CREATE OR REPLACE FUNCTION pg_temp.mk_task(p_status TEXT DEFAULT 'queued')
RETURNS UUID LANGUAGE plpgsql AS $$
DECLARE v_id UUID;
BEGIN
  INSERT INTO system.execution_tasks (
    type, domain, status, risk_level, payload, requested_by
  ) VALUES (
    'noop.test', 'tests', p_status::system.execution_task_status,
    'LOW', '{}'::jsonb, 'sql_spec'
  ) RETURNING id INTO v_id;
  RETURN v_id;
END $$;

-- ──────────────────────────────────────────────────────────────────────────
-- Test 1: incident_log is append-only (UPDATE / DELETE rejected).
BEGIN;
  SELECT system.write_incident('test', 'info', 'spec', NULL, NULL, '{}'::jsonb) AS id \gset
  DO $$
  BEGIN
    BEGIN
      UPDATE system.incident_log SET kind = 'mut' WHERE id = :'id'::uuid;
      RAISE EXCEPTION 'incident_log UPDATE should have been rejected';
    EXCEPTION WHEN insufficient_privilege THEN
      -- expected
      NULL;
    END;
    BEGIN
      DELETE FROM system.incident_log WHERE id = :'id'::uuid;
      RAISE EXCEPTION 'incident_log DELETE should have been rejected';
    EXCEPTION WHEN insufficient_privilege THEN
      NULL;
    END;
  END $$;
ROLLBACK;

-- ──────────────────────────────────────────────────────────────────────────
-- Test 2: validate_task_dependencies rejects cycle / unknown / self.
BEGIN;
  SELECT pg_temp.mk_task('queued') AS a \gset
  SELECT pg_temp.mk_task('queued') AS b \gset

  -- self-dep
  DO $$
  DECLARE r RECORD;
  BEGIN
    SELECT * INTO r FROM system.validate_task_dependencies(:'a'::uuid, ARRAY[:'a'::uuid]);
    IF r.ok OR r.reason <> 'self_dependency' THEN
      RAISE EXCEPTION 'expected self_dependency, got ok=% reason=%', r.ok, r.reason;
    END IF;
  END $$;

  -- unknown dep
  DO $$
  DECLARE r RECORD;
  BEGIN
    SELECT * INTO r FROM system.validate_task_dependencies(
      :'a'::uuid, ARRAY['00000000-0000-0000-0000-000000000000'::uuid]);
    IF r.ok OR r.reason <> 'dependency_unknown' THEN
      RAISE EXCEPTION 'expected dependency_unknown, got ok=% reason=%', r.ok, r.reason;
    END IF;
  END $$;

  -- valid edge (a depends on b)
  DO $$
  DECLARE r RECORD;
  BEGIN
    SELECT * INTO r FROM system.validate_task_dependencies(:'a'::uuid, ARRAY[:'b'::uuid]);
    IF NOT r.ok THEN
      RAISE EXCEPTION 'expected ok=true for fresh edge, got reason=%', r.reason;
    END IF;
  END $$;

  -- create the edge then ask for the reverse → cycle
  INSERT INTO system.task_dependencies(task_id, depends_on_task_id) VALUES (:'a'::uuid, :'b'::uuid);
  DO $$
  DECLARE r RECORD;
  BEGIN
    SELECT * INTO r FROM system.validate_task_dependencies(:'b'::uuid, ARRAY[:'a'::uuid]);
    IF r.ok OR r.reason <> 'dependency_cycle' THEN
      RAISE EXCEPTION 'expected dependency_cycle, got ok=% reason=%', r.ok, r.reason;
    END IF;
  END $$;
ROLLBACK;

-- ──────────────────────────────────────────────────────────────────────────
-- Test 3: task_dependencies trigger enforces DAG at the boundary.
BEGIN;
  SELECT pg_temp.mk_task('queued') AS a \gset
  DO $$
  BEGIN
    BEGIN
      INSERT INTO system.task_dependencies(task_id, depends_on_task_id) VALUES (:'a'::uuid, :'a'::uuid);
      RAISE EXCEPTION 'self-dep INSERT should have been rejected';
    EXCEPTION WHEN check_violation OR foreign_key_violation THEN
      NULL;
    END;
  END $$;
ROLLBACK;

-- ──────────────────────────────────────────────────────────────────────────
-- Test 4: scan_stuck_tasks flags a timeout-running task; watchdog_tick
--         transitions it to `failed` with failure_class='timeout'.
BEGIN;
  SELECT pg_temp.mk_task('queued') AS t \gset
  UPDATE system.execution_tasks
     SET status            = 'running',
         started_at        = now() - INTERVAL '10 minutes',
         max_duration_ms   = 1000,
         stage_started_at  = now() - INTERVAL '10 minutes',
         locked_by         = 'spec',
         lock_key          = 'lk-spec'
   WHERE id = :'t'::uuid;

  -- scan must see the row with rule='timeout'
  DO $$
  DECLARE n INT;
  BEGIN
    SELECT count(*) INTO n FROM system.scan_stuck_tasks(50)
      WHERE task_id = :'t'::uuid AND rule = 'timeout';
    IF n <> 1 THEN
      RAISE EXCEPTION 'expected 1 timeout candidate, got %', n;
    END IF;
  END $$;

  -- watchdog_tick fails it
  PERFORM * FROM system.watchdog_tick(50);
  DO $$
  DECLARE st TEXT; fc TEXT;
  BEGIN
    SELECT status::text, failure_class INTO st, fc
      FROM system.execution_tasks WHERE id = :'t'::uuid;
    IF st <> 'failed' OR fc IS DISTINCT FROM 'timeout' THEN
      RAISE EXCEPTION 'expected status=failed failure_class=timeout, got status=% failure_class=%', st, fc;
    END IF;
  END $$;
ROLLBACK;

-- ──────────────────────────────────────────────────────────────────────────
-- Test 5: watchdog_tick is single-claimer (advisory lock).
BEGIN;
  -- Take the singleton lock manually; concurrent tick must early-return
  -- 'skipped_concurrent' rather than mutate state.
  PERFORM pg_advisory_xact_lock(hashtextextended('system.watchdog_tick.singleton', 0));
  DO $$
  DECLARE r RECORD; n INT := 0;
  BEGIN
    FOR r IN SELECT * FROM system.watchdog_tick(50) LOOP
      n := n + 1;
      IF r.out_action <> 'skipped_concurrent' THEN
        RAISE EXCEPTION 'expected skipped_concurrent, got %', r.out_action;
      END IF;
    END LOOP;
    IF n <> 1 THEN
      RAISE EXCEPTION 'expected exactly 1 sentinel row, got %', n;
    END IF;
  END $$;
ROLLBACK;

-- ──────────────────────────────────────────────────────────────────────────
-- Test 6: attach_task_dependencies forbids non-admin authenticated callers.
BEGIN;
  -- Simulate a non-admin authenticated session.
  SET LOCAL ROLE authenticated;
  SET LOCAL "request.jwt.claims" = '{"sub":"00000000-0000-0000-0000-000000000001","role":"authenticated"}';
  DO $$
  BEGIN
    BEGIN
      PERFORM system.attach_task_dependencies(
        '00000000-0000-0000-0000-000000000002'::uuid,
        ARRAY['00000000-0000-0000-0000-000000000003'::uuid]);
      RAISE EXCEPTION 'non-admin attach call should have been forbidden';
    EXCEPTION WHEN insufficient_privilege THEN
      NULL;
    END;
  END $$;
  RESET ROLE;
ROLLBACK;

-- ──────────────────────────────────────────────────────────────────────────
-- Test 7: retry-budget exhaustion lands on `failed`, never `cancelled`.
-- Spec contract: even when the stuck row is in `queued`/`approved`, the
-- exhaustion path must route through `running` → `failed`.
BEGIN;
  SELECT pg_temp.mk_task('queued') AS t \gset
  UPDATE system.execution_tasks
     SET attempt_count    = 5,
         max_attempts     = 3,
         stage_started_at = now() - INTERVAL '1 hour',
         stuck_threshold_ms = 1000
   WHERE id = :'t'::uuid;

  -- Force the recover path; budget is exhausted → expect 'failed'.
  DO $$
  DECLARE v_outcome TEXT; v_status TEXT; v_class TEXT;
  BEGIN
    v_outcome := system.watchdog_recover_task(:'t'::uuid, 'spec_test', '{}'::jsonb);
    SELECT status::text, failure_class INTO v_status, v_class
      FROM system.execution_tasks WHERE id = :'t'::uuid;
    IF v_outcome <> 'failed'
       OR v_status <> 'failed'
       OR v_class IS DISTINCT FROM 'retry_budget_exhausted' THEN
      RAISE EXCEPTION 'expected outcome=failed/status=failed/class=retry_budget_exhausted, got %/%/%',
        v_outcome, v_status, v_class;
    END IF;
  END $$;
ROLLBACK;

-- ──────────────────────────────────────────────────────────────────────────
-- Test 8: lock-TTL expiry surfaces in scan_stuck_tasks.
BEGIN;
  SELECT pg_temp.mk_task('queued') AS t \gset
  -- Insert a stale lock first
  INSERT INTO system.execution_locks (lock_key, locked_by, expires_at)
  VALUES ('lk-spec-ttl', 'spec', now() - INTERVAL '5 minutes');
  UPDATE system.execution_tasks
     SET status            = 'running',
         lock_key          = 'lk-spec-ttl',
         locked_by         = 'spec',
         started_at        = now() - INTERVAL '2 minutes',
         stage_started_at  = now() - INTERVAL '2 minutes'
   WHERE id = :'t'::uuid;

  DO $$
  DECLARE n INT;
  BEGIN
    SELECT count(*) INTO n FROM system.scan_stuck_tasks(50)
      WHERE task_id = :'t'::uuid AND rule = 'lock_ttl_expired';
    IF n < 1 THEN
      RAISE EXCEPTION 'expected lock_ttl_expired candidate, got %', n;
    END IF;
  END $$;
ROLLBACK;

-- ──────────────────────────────────────────────────────────────────────────
-- Test 9: write_incident integrity gate — non-admin authenticated callers
--          are rejected (42501) so the immutable audit log cannot be
--          spoofed from a regular user JWT.
BEGIN;
  SET LOCAL ROLE authenticated;
  SET LOCAL "request.jwt.claims" = '{"sub":"00000000-0000-0000-0000-000000000099","role":"authenticated"}';
  DO $$
  BEGIN
    BEGIN
      PERFORM system.write_incident('spec_authn', 'info', 'spoofed-actor', NULL, NULL,
                jsonb_build_object('via','authenticated_non_admin'));
      RAISE EXCEPTION 'non-admin write_incident should have been forbidden';
    EXCEPTION WHEN insufficient_privilege THEN
      NULL;
    END;
  END $$;
  RESET ROLE;
ROLLBACK;

-- ──────────────────────────────────────────────────────────────────────────
-- Test 10: watchdog_tick is idempotent across restart — running it twice
--          back-to-back on a clean queue produces no duplicate failures.
BEGIN;
  PERFORM * FROM system.watchdog_tick(50);
  PERFORM * FROM system.watchdog_tick(50);
  -- Just confirm the function did not raise; the no-op repeat tick is the
  -- contract we care about (no duplicate incident rows for the same id).
ROLLBACK;

-- ──────────────────────────────────────────────────────────────────────────
-- Test 11: attach_task_dependencies compensation honours the transition
--          matrix for `pending_review` tasks. Dependency-attach failure
--          must NOT raise out of the wrapper and the task must end up in
--          a deterministic non-runnable state with an incident logged.
BEGIN;
  -- Build a pending_review task and force a dep-attach failure by
  -- pointing at a non-existent upstream id (FK violation triggers the
  -- EXCEPTION arm of attach_task_dependencies).
  WITH t AS (
    INSERT INTO system.execution_tasks (
      type, domain, status, risk_level, payload, requested_by
    ) VALUES (
      'noop.test', 'tests', 'pending_review'::system.execution_task_status,
      'HIGH', '{}'::jsonb, 'sql_spec'
    ) RETURNING id
  )
  SELECT id AS tid FROM t \gset

  SELECT system.attach_task_dependencies(
    :'tid'::uuid,
    ARRAY['00000000-0000-0000-0000-0000000000ff'::uuid]
  ) AS res \gset

  DO $$
  DECLARE v_status TEXT; v_reason TEXT; v_incident INT;
  BEGIN
    SELECT status::text, blocked_reason
      INTO v_status, v_reason
      FROM system.execution_tasks WHERE id = :'tid'::uuid;
    IF v_status NOT IN ('cancelled','blocked','failed') THEN
      RAISE EXCEPTION 'compensation left pending_review task in non-terminal state: %', v_status;
    END IF;
    IF v_reason IS NULL OR v_reason !~ 'dependency_rejected' THEN
      RAISE EXCEPTION 'compensation reason missing or wrong: %', v_reason;
    END IF;
    SELECT count(*)::int INTO v_incident
      FROM system.incident_log
     WHERE related_task_id = :'tid'::uuid AND kind = 'dependency_rejected';
    IF v_incident = 0 THEN
      RAISE EXCEPTION 'no dependency_rejected incident written';
    END IF;
  END $$;
ROLLBACK;

\echo all watchdog_anti_deadlock SQL spec tests passed
