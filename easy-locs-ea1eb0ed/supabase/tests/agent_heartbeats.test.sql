-- ============================================================================
-- L2 — Agent Heartbeat & Health Model — SQL regression suite (task #810)
--
-- Run against a fresh DB (after migrations are applied):
--     psql "$DATABASE_URL" -f supabase/tests/agent_heartbeats.test.sql
--
-- Each block raises NOTICE on success and EXCEPTION on failure. A clean run
-- prints PASS lines; a non-zero exit means a regression.
-- ============================================================================

BEGIN;

-- ── Setup: a fresh test agent with explicit thresholds + quota ──────────────
DO $$
DECLARE
  v_agent system.agents;
BEGIN
  SELECT * INTO v_agent
    FROM system.register_agent(
      p_slug         => 'test.heartbeat.agent',
      p_display_name => 'Heartbeat Test Agent',
      p_agent_kind   => 'business.adapter',
      p_initial_version => '1.0.0',
      p_metadata     => jsonb_build_object(
        'heartbeat', jsonb_build_object(
          'cadence_ms',       1000,    -- 1s cadence so test clock is fast
          'stale_multiplier', 2,       -- stale after 2s
          'down_multiplier',  5        -- down  after 5s
        )
      ),
      p_quotas       => jsonb_build_object('max_concurrent', 3),
      p_capabilities => '[]'::jsonb
    );
  IF v_agent.id IS NULL THEN
    RAISE EXCEPTION 'FAIL: could not register test agent';
  END IF;
  RAISE NOTICE 'PASS: test agent registered';
END $$;

-- ── 1. Fresh heartbeat → healthy ────────────────────────────────────────────
DO $$
DECLARE v_h RECORD; v_aid UUID;
BEGIN
  SELECT id INTO v_aid FROM system.agents WHERE slug = 'test.heartbeat.agent';
  PERFORM system.record_agent_heartbeat(
    p_agent_slug => 'test.heartbeat.agent',
    p_worker_id  => 'w-1',
    p_in_flight  => 0,
    p_queue_depth=> 0
  );
  SELECT * INTO v_h FROM system.compute_agent_health(v_aid);
  IF v_h.health_status <> 'healthy' THEN
    RAISE EXCEPTION 'FAIL: fresh heartbeat → expected healthy, got % (reason=%)',
      v_h.health_status, v_h.reason;
  END IF;
  RAISE NOTICE 'PASS: fresh heartbeat → healthy';
END $$;

-- ── 2. Quota saturation → degraded ──────────────────────────────────────────
DO $$
DECLARE v_h RECORD; v_aid UUID;
BEGIN
  SELECT id INTO v_aid FROM system.agents WHERE slug = 'test.heartbeat.agent';
  PERFORM system.record_agent_heartbeat(
    p_agent_slug => 'test.heartbeat.agent',
    p_worker_id  => 'w-1',
    p_in_flight  => 3,    -- equals max_concurrent=3
    p_queue_depth=> 0
  );
  SELECT * INTO v_h FROM system.compute_agent_health(v_aid);
  IF v_h.health_status <> 'degraded' THEN
    RAISE EXCEPTION 'FAIL: in_flight=quota → expected degraded, got % (reason=%)',
      v_h.health_status, v_h.reason;
  END IF;
  RAISE NOTICE 'PASS: in_flight=quota → degraded';
END $$;

-- ── 3. Backdated old heartbeat → stale, then → down ─────────────────────────
DO $$
DECLARE v_h RECORD; v_aid UUID;
BEGIN
  SELECT id INTO v_aid FROM system.agents WHERE slug = 'test.heartbeat.agent';

  -- Simulate a heartbeat 3s old: cadence=1s → 3× cadence > stale_multiplier=2
  -- but < down_multiplier=5  ⇒ stale.
  DELETE FROM system.agent_heartbeats WHERE agent_id = v_aid;
  INSERT INTO system.agent_heartbeats (agent_id, worker_id, last_seen_at, in_flight, queue_depth)
    VALUES (v_aid, 'w-1', now() - INTERVAL '3 seconds', 0, 0);
  SELECT * INTO v_h FROM system.compute_agent_health(v_aid);
  IF v_h.health_status <> 'stale' THEN
    RAISE EXCEPTION 'FAIL: 3s-old heartbeat → expected stale, got % (lag=%, reason=%)',
      v_h.health_status, v_h.lag_ms, v_h.reason;
  END IF;
  RAISE NOTICE 'PASS: 3s-old heartbeat → stale';

  -- Now 10s old → 10× cadence ⇒ down.
  DELETE FROM system.agent_heartbeats WHERE agent_id = v_aid;
  INSERT INTO system.agent_heartbeats (agent_id, worker_id, last_seen_at, in_flight, queue_depth)
    VALUES (v_aid, 'w-1', now() - INTERVAL '10 seconds', 0, 0);
  SELECT * INTO v_h FROM system.compute_agent_health(v_aid);
  IF v_h.health_status <> 'down' THEN
    RAISE EXCEPTION 'FAIL: 10s-old heartbeat → expected down, got % (lag=%, reason=%)',
      v_h.health_status, v_h.lag_ms, v_h.reason;
  END IF;
  RAISE NOTICE 'PASS: 10s-old heartbeat → down';
END $$;

-- ── 4. No heartbeat ever for an active agent → down ─────────────────────────
DO $$
DECLARE v_h RECORD; v_aid UUID;
BEGIN
  PERFORM system.register_agent(
    p_slug         => 'test.heartbeat.never',
    p_display_name => 'Never Beats',
    p_agent_kind   => 'business.adapter',
    p_metadata     => jsonb_build_object(
      'heartbeat', jsonb_build_object('cadence_ms', 1000)
    )
  );
  SELECT id INTO v_aid FROM system.agents WHERE slug = 'test.heartbeat.never';
  SELECT * INTO v_h FROM system.compute_agent_health(v_aid);
  IF v_h.health_status <> 'down' THEN
    RAISE EXCEPTION 'FAIL: no-heartbeat active agent → expected down, got %', v_h.health_status;
  END IF;
  RAISE NOTICE 'PASS: no-heartbeat active agent → down';
END $$;

-- ── 5. Disabled agent without heartbeat → unknown (NOT down) ────────────────
DO $$
DECLARE v_h RECORD; v_aid UUID;
BEGIN
  PERFORM system.set_agent_status('test.heartbeat.never', 'disabled', NULL);
  SELECT id INTO v_aid FROM system.agents WHERE slug = 'test.heartbeat.never';
  SELECT * INTO v_h FROM system.compute_agent_health(v_aid);
  IF v_h.health_status <> 'unknown' THEN
    RAISE EXCEPTION 'FAIL: disabled+no-heartbeat → expected unknown, got %', v_h.health_status;
  END IF;
  RAISE NOTICE 'PASS: disabled+no-heartbeat → unknown';
END $$;

-- ── 6. Health-transition trigger writes engine_run_logs row ─────────────────
DO $$
DECLARE v_aid UUID; v_count_before INT; v_count_after INT;
BEGIN
  SELECT id INTO v_aid FROM system.agents WHERE slug = 'test.heartbeat.agent';

  -- Force prior cached status to healthy.
  UPDATE system.agents SET last_health_status = 'healthy' WHERE id = v_aid;
  DELETE FROM system.agent_heartbeats WHERE agent_id = v_aid;

  SELECT COUNT(*) INTO v_count_before FROM public.engine_run_logs
    WHERE engine_name = 'agent-heartbeat'
      AND category = 'agent.health_degraded'
      AND (metadata_json->>'agent_id')::UUID = v_aid;

  -- Insert a stale heartbeat: trigger should detect transition healthy → stale
  -- and write an agent.health_degraded audit row.
  INSERT INTO system.agent_heartbeats (agent_id, worker_id, last_seen_at, in_flight, queue_depth)
    VALUES (v_aid, 'w-2', now() - INTERVAL '4 seconds', 0, 0);

  SELECT COUNT(*) INTO v_count_after FROM public.engine_run_logs
    WHERE engine_name = 'agent-heartbeat'
      AND category = 'agent.health_degraded'
      AND (metadata_json->>'agent_id')::UUID = v_aid;

  IF v_count_after <> v_count_before + 1 THEN
    RAISE EXCEPTION 'FAIL: expected 1 new agent.health_degraded audit row, before=% after=%',
      v_count_before, v_count_after;
  END IF;
  RAISE NOTICE 'PASS: transition trigger emitted agent.health_degraded';
END $$;

-- ── 7. Recovery transition emits agent.health_recovered ─────────────────────
DO $$
DECLARE v_aid UUID; v_count_before INT; v_count_after INT;
BEGIN
  SELECT id INTO v_aid FROM system.agents WHERE slug = 'test.heartbeat.agent';

  SELECT COUNT(*) INTO v_count_before FROM public.engine_run_logs
    WHERE engine_name = 'agent-heartbeat'
      AND category = 'agent.health_recovered'
      AND (metadata_json->>'agent_id')::UUID = v_aid;

  -- Fresh heartbeat → derived = healthy. Cached is currently 'stale' from
  -- the previous block, so the trigger should write a recovered audit row.
  INSERT INTO system.agent_heartbeats (agent_id, worker_id, last_seen_at, in_flight, queue_depth)
    VALUES (v_aid, 'w-2', now(), 0, 0);

  SELECT COUNT(*) INTO v_count_after FROM public.engine_run_logs
    WHERE engine_name = 'agent-heartbeat'
      AND category = 'agent.health_recovered'
      AND (metadata_json->>'agent_id')::UUID = v_aid;

  IF v_count_after <> v_count_before + 1 THEN
    RAISE EXCEPTION 'FAIL: expected 1 new agent.health_recovered audit row, before=% after=%',
      v_count_before, v_count_after;
  END IF;
  RAISE NOTICE 'PASS: transition trigger emitted agent.health_recovered';
END $$;

-- ── 8. sweep_agent_health() emits a transition for a stale agent ───────────
DO $$
DECLARE v_aid UUID; v_changes INT; v_count_before INT; v_count_after INT;
BEGIN
  SELECT id INTO v_aid FROM system.agents WHERE slug = 'test.heartbeat.agent';

  -- Backdate the latest heartbeat past `down_multiplier × cadence` so the
  -- next sweep finds the agent in `down` and audits the change.
  UPDATE system.agent_heartbeats
     SET last_seen_at = now() - INTERVAL '20 seconds'
   WHERE agent_id = v_aid;
  -- Reset cached status so the sweep observes a real transition.
  UPDATE system.agents SET last_health_status = 'healthy' WHERE id = v_aid;

  SELECT COUNT(*) INTO v_count_before FROM public.engine_run_logs
    WHERE engine_name = 'agent-heartbeat'
      AND category    = 'agent.health_degraded'
      AND metadata_json->>'source' = 'health_sweep'
      AND (metadata_json->>'agent_id')::UUID = v_aid;

  v_changes := system.sweep_agent_health();
  IF v_changes < 1 THEN
    RAISE EXCEPTION 'FAIL: sweep_agent_health returned 0 changes, expected ≥1';
  END IF;

  SELECT COUNT(*) INTO v_count_after FROM public.engine_run_logs
    WHERE engine_name = 'agent-heartbeat'
      AND category    = 'agent.health_degraded'
      AND metadata_json->>'source' = 'health_sweep'
      AND (metadata_json->>'agent_id')::UUID = v_aid;

  IF v_count_after <> v_count_before + 1 THEN
    RAISE EXCEPTION 'FAIL: sweep did not emit health_degraded audit (before=%, after=%)',
      v_count_before, v_count_after;
  END IF;
  RAISE NOTICE 'PASS: sweep_agent_health emitted transition audit';
END $$;

-- ── 9. record_agent_heartbeat with unknown slug → recorded=false, no throw ─
DO $$
DECLARE v_row RECORD;
BEGIN
  SELECT * INTO v_row FROM system.record_agent_heartbeat(
    p_agent_slug => 'no.such.agent',
    p_worker_id  => 'w-x'
  );
  IF v_row.recorded <> FALSE OR v_row.reason <> 'agent_not_registered' THEN
    RAISE EXCEPTION 'FAIL: unknown slug should return (recorded=false, reason=agent_not_registered), got (%, %)',
      v_row.recorded, v_row.reason;
  END IF;
  RAISE NOTICE 'PASS: unknown slug → (recorded=false, agent_not_registered)';
END $$;

-- ── 10. v_agent_health view is queryable and includes the test agent ───────
DO $$
DECLARE v_n INT;
BEGIN
  SELECT COUNT(*) INTO v_n FROM system.v_agent_health
    WHERE agent_slug = 'test.heartbeat.agent';
  IF v_n <> 1 THEN
    RAISE EXCEPTION 'FAIL: v_agent_health row count for test agent = % (want 1)', v_n;
  END IF;
  RAISE NOTICE 'PASS: v_agent_health exposes the test agent';
END $$;

-- ── 11. record_agent_heartbeat is NOT executable by `authenticated` ─────────
-- Hard security invariant: heartbeats are a control-plane write. Granting
-- EXECUTE to `authenticated` would let any logged-in end user spoof an
-- adapter's liveness and spam audit events.
DO $$
DECLARE v_grants INT;
BEGIN
  SELECT COUNT(*) INTO v_grants
    FROM information_schema.routine_privileges
   WHERE routine_schema = 'system'
     AND routine_name   = 'record_agent_heartbeat'
     AND grantee        = 'authenticated';
  IF v_grants <> 0 THEN
    RAISE EXCEPTION 'FAIL: record_agent_heartbeat is granted to authenticated (security regression)';
  END IF;
  RAISE NOTICE 'PASS: record_agent_heartbeat is service_role-only';
END $$;

ROLLBACK;
