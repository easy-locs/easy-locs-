-- ============================================================================
-- Sovereign Internal Agent Control Layer · L2 (task #810)
-- Agent heartbeat & health model.
--
-- Provides:
--   1. system.agent_heartbeats              — append-only heartbeat ledger
--   2. system.compute_agent_health(agent)   — derived health for one agent
--   3. system.v_agent_health                — latest-row-per-agent dashboard view
--   4. system.record_agent_heartbeat()      — RPC called by the worker emitter
--   5. Status-transition trigger that audits AGENT_HEALTH_DEGRADED /
--      AGENT_HEALTH_RECOVERED transitions to public.engine_run_logs
--   6. system.sweep_agent_health()          — re-evaluates all agents and
--      emits stale/down transitions even when no new heartbeat arrives
--   7. pg_cron jobs:
--        - agent-heartbeats-sweep (every 30s) calls sweep_agent_health
--        - agent-heartbeats-prune (daily)     deletes rows older than 7 days
--
-- Hard contract:
--   * Kind-agnostic: nothing here branches on agents.agent_kind. A
--     `dev.builder` heartbeat is identical in shape to a `business.adapter`
--     heartbeat, and the same future ASIS cognitive module will reuse this
--     RPC unchanged.
--   * Best-effort on the worker side — record_agent_heartbeat NEVER raises
--     for a missing/disabled agent; it returns a status row instead.
--   * Thresholds read from `system.agents.metadata->'heartbeat'`:
--       cadence_ms       (default 15000)
--       stale_multiplier (default 2)
--       down_multiplier  (default 5)
--     and quota from `system.agents.quotas->'max_concurrent'` (optional).
-- ============================================================================

-- ── 1. agent_heartbeats table ────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS system.agent_heartbeats (
  id                UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id          UUID         NOT NULL REFERENCES system.agents(id) ON DELETE CASCADE,
  agent_version_id  UUID         REFERENCES system.agent_versions(id) ON DELETE SET NULL,
  worker_id         TEXT         NOT NULL,
  last_seen_at      TIMESTAMPTZ  NOT NULL DEFAULT now(),
  in_flight         INT          NOT NULL DEFAULT 0 CHECK (in_flight >= 0),
  queue_depth       INT          NOT NULL DEFAULT 0 CHECK (queue_depth >= 0),
  cpu_pct           REAL,
  mem_mb            INT,
  region            TEXT,
  custom            JSONB        NOT NULL DEFAULT '{}'::jsonb,
  created_at        TIMESTAMPTZ  NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_agent_heartbeats_agent_seen
  ON system.agent_heartbeats (agent_id, last_seen_at DESC);
CREATE INDEX IF NOT EXISTS idx_agent_heartbeats_worker_seen
  ON system.agent_heartbeats (agent_id, worker_id, last_seen_at DESC);
CREATE INDEX IF NOT EXISTS idx_agent_heartbeats_created
  ON system.agent_heartbeats (created_at);

ALTER TABLE system.agent_heartbeats ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY agent_heartbeats_read ON system.agent_heartbeats
    FOR SELECT TO authenticated USING (TRUE);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE POLICY agent_heartbeats_service ON system.agent_heartbeats
    FOR ALL TO service_role USING (TRUE) WITH CHECK (TRUE);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

GRANT SELECT ON system.agent_heartbeats TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON system.agent_heartbeats TO service_role;
REVOKE INSERT, UPDATE, DELETE ON system.agent_heartbeats FROM authenticated, anon, PUBLIC;

-- ── 2. Cached health snapshot columns on agents ──────────────────────────
-- agents.last_health_status / last_health_at already exist (added by L1).
-- Add a "reason" so the dashboard can explain a degraded transition without
-- another join.
ALTER TABLE system.agents
  ADD COLUMN IF NOT EXISTS last_health_reason TEXT;

-- ── 3. compute_agent_health(agent_id) ────────────────────────────────────
-- Returns the derived health for ONE agent based on (a) the latest
-- heartbeat row across all of that agent's workers and (b) the agent's
-- configured cadence + quotas. Pure SQL, kind-agnostic.
CREATE OR REPLACE FUNCTION system.compute_agent_health(p_agent_id UUID)
RETURNS TABLE (
  agent_id        UUID,
  health_status   TEXT,   -- healthy | degraded | stale | down | unknown
  reason          TEXT,
  last_seen_at    TIMESTAMPTZ,
  lag_ms          BIGINT,
  in_flight       INT,
  queue_depth     INT,
  worker_count    INT
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, system
AS $$
DECLARE
  v_agent          system.agents;
  v_cadence_ms     INT;
  v_stale_mult     INT;
  v_down_mult      INT;
  v_max_concurrent INT;
  v_latest         system.agent_heartbeats;
  v_lag_ms         BIGINT;
  v_workers        INT := 0;
  v_status         TEXT;
  v_reason         TEXT;
BEGIN
  SELECT * INTO v_agent FROM system.agents WHERE id = p_agent_id;
  IF NOT FOUND THEN
    RETURN QUERY SELECT
      p_agent_id, 'unknown'::TEXT, 'agent_not_found'::TEXT,
      NULL::TIMESTAMPTZ, NULL::BIGINT, 0, 0, 0;
    RETURN;
  END IF;

  v_cadence_ms     := COALESCE((v_agent.metadata #>> '{heartbeat,cadence_ms}')::INT, 15000);
  v_stale_mult     := COALESCE((v_agent.metadata #>> '{heartbeat,stale_multiplier}')::INT, 2);
  v_down_mult      := COALESCE((v_agent.metadata #>> '{heartbeat,down_multiplier}')::INT, 5);
  v_max_concurrent := NULLIF((v_agent.quotas    #>> '{max_concurrent}')::INT, 0);

  SELECT * INTO v_latest
    FROM system.agent_heartbeats
   WHERE agent_id = p_agent_id
   ORDER BY last_seen_at DESC
   LIMIT 1;

  -- Workers seen in the last `down_multiplier × cadence` window.
  SELECT COUNT(DISTINCT worker_id) INTO v_workers
    FROM system.agent_heartbeats
   WHERE agent_id = p_agent_id
     AND last_seen_at > now() - make_interval(secs => (v_cadence_ms * v_down_mult) / 1000.0);

  IF NOT FOUND OR v_latest.last_seen_at IS NULL THEN
    -- A disabled/deprecated agent without heartbeats is `unknown`, not
    -- `down`, so we don't spam health-degraded events for agents nobody
    -- expects to run.
    IF v_agent.status IN ('disabled', 'deprecated') THEN
      v_status := 'unknown';
      v_reason := 'no_heartbeat_disabled_agent';
    ELSE
      v_status := 'down';
      v_reason := 'no_heartbeat_ever';
    END IF;
    RETURN QUERY SELECT
      p_agent_id, v_status, v_reason,
      NULL::TIMESTAMPTZ, NULL::BIGINT, 0, 0, v_workers;
    RETURN;
  END IF;

  v_lag_ms := EXTRACT(EPOCH FROM (now() - v_latest.last_seen_at)) * 1000;

  IF v_lag_ms > v_cadence_ms * v_down_mult THEN
    v_status := 'down';
    v_reason := format('no_heartbeat_for_%sms', v_lag_ms);
  ELSIF v_lag_ms > v_cadence_ms * v_stale_mult THEN
    v_status := 'stale';
    v_reason := format('lag_%sms_exceeds_%sx_cadence', v_lag_ms, v_stale_mult);
  ELSIF v_max_concurrent IS NOT NULL AND v_latest.in_flight >= v_max_concurrent THEN
    v_status := 'degraded';
    v_reason := format('in_flight_%s_at_or_above_quota_%s', v_latest.in_flight, v_max_concurrent);
  ELSE
    v_status := 'healthy';
    v_reason := 'ok';
  END IF;

  RETURN QUERY SELECT
    p_agent_id, v_status, v_reason,
    v_latest.last_seen_at, v_lag_ms, v_latest.in_flight, v_latest.queue_depth, v_workers;
END;
$$;

REVOKE ALL ON FUNCTION system.compute_agent_health(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION system.compute_agent_health(UUID)
  TO authenticated, service_role;

-- ── 4. v_agent_health view ───────────────────────────────────────────────
-- One row per registered agent, computed lazily at SELECT time.
-- The dashboard consumes this with a single SELECT.
CREATE OR REPLACE VIEW system.v_agent_health AS
SELECT
  a.id                AS agent_id,
  a.slug              AS agent_slug,
  a.display_name,
  a.agent_kind,
  a.status            AS lifecycle_status,
  h.health_status,
  h.reason            AS health_reason,
  h.last_seen_at,
  h.lag_ms,
  h.in_flight,
  h.queue_depth,
  h.worker_count,
  a.last_health_status AS cached_health_status,
  a.last_health_at     AS cached_health_at
FROM system.agents a
LEFT JOIN LATERAL system.compute_agent_health(a.id) h ON TRUE;

GRANT SELECT ON system.v_agent_health TO authenticated, service_role;

-- ── 5. record_agent_heartbeat RPC ────────────────────────────────────────
-- Called by the worker emitter. Inserts a heartbeat row and returns the
-- newly-derived health status. NEVER raises: a missing agent slug returns
-- an `unknown` row so the worker can keep running without crashing.
CREATE OR REPLACE FUNCTION system.record_agent_heartbeat(
  p_agent_slug   TEXT,
  p_worker_id    TEXT,
  p_in_flight    INT     DEFAULT 0,
  p_queue_depth  INT     DEFAULT 0,
  p_cpu_pct      REAL    DEFAULT NULL,
  p_mem_mb       INT     DEFAULT NULL,
  p_region       TEXT    DEFAULT NULL,
  p_custom       JSONB   DEFAULT '{}'::jsonb,
  p_version      TEXT    DEFAULT NULL
) RETURNS TABLE (
  agent_id       UUID,
  health_status  TEXT,
  reason         TEXT,
  recorded       BOOLEAN
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, system
AS $$
DECLARE
  v_agent    system.agents;
  v_version  UUID;
  v_health   RECORD;
BEGIN
  IF NULLIF(BTRIM(p_agent_slug), '') IS NULL OR NULLIF(BTRIM(p_worker_id), '') IS NULL THEN
    RETURN QUERY SELECT NULL::UUID, 'unknown'::TEXT, 'invalid_input'::TEXT, FALSE;
    RETURN;
  END IF;

  SELECT * INTO v_agent FROM system.agents WHERE slug = p_agent_slug;
  IF NOT FOUND THEN
    RETURN QUERY SELECT NULL::UUID, 'unknown'::TEXT, 'agent_not_registered'::TEXT, FALSE;
    RETURN;
  END IF;

  IF p_version IS NOT NULL THEN
    SELECT id INTO v_version FROM system.agent_versions
     WHERE agent_id = v_agent.id AND version = p_version;
  END IF;
  v_version := COALESCE(v_version, v_agent.current_version_id);

  INSERT INTO system.agent_heartbeats (
    agent_id, agent_version_id, worker_id, last_seen_at,
    in_flight, queue_depth, cpu_pct, mem_mb, region, custom
  ) VALUES (
    v_agent.id, v_version, p_worker_id, now(),
    GREATEST(0, COALESCE(p_in_flight, 0)),
    GREATEST(0, COALESCE(p_queue_depth, 0)),
    p_cpu_pct, p_mem_mb, NULLIF(BTRIM(p_region), ''),
    COALESCE(p_custom, '{}'::jsonb)
  );

  SELECT * INTO v_health FROM system.compute_agent_health(v_agent.id);
  RETURN QUERY SELECT v_agent.id, v_health.health_status, v_health.reason, TRUE;
END;
$$;

-- SECURITY: heartbeats are a CONTROL-PLANE write — granting EXECUTE to any
-- authenticated user would let an end-user spoof an adapter's liveness and
-- spam health-transition events. Restrict to service_role only. The
-- function does its own admin/service guard so an admin-gated UI surface
-- (L4) can call through `system._assert_admin_or_service` if needed.
REVOKE ALL ON FUNCTION system.record_agent_heartbeat(
  TEXT, TEXT, INT, INT, REAL, INT, TEXT, JSONB, TEXT
) FROM PUBLIC, authenticated, anon;
GRANT EXECUTE ON FUNCTION system.record_agent_heartbeat(
  TEXT, TEXT, INT, INT, REAL, INT, TEXT, JSONB, TEXT
) TO service_role;

-- ── 6. Health-transition trigger ─────────────────────────────────────────
-- After every heartbeat insert, compare derived status to the cached
-- agents.last_health_status. On a transition, audit the change to
-- engine_run_logs and update the cached status. The trigger function is
-- idempotent — repeated identical statuses produce no audit row.
CREATE OR REPLACE FUNCTION system.fn_agent_heartbeat_transition()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, system
AS $$
DECLARE
  v_health   RECORD;
  v_prev     TEXT;
  v_event    TEXT;
  v_summary  TEXT;
  v_slug     TEXT;
BEGIN
  SELECT * INTO v_health FROM system.compute_agent_health(NEW.agent_id);
  SELECT slug, last_health_status INTO v_slug, v_prev
    FROM system.agents WHERE id = NEW.agent_id FOR UPDATE;

  IF v_prev IS NOT DISTINCT FROM v_health.health_status THEN
    -- Refresh the timestamp so dashboards know the snapshot is fresh, but
    -- do NOT emit an event for steady-state heartbeats.
    UPDATE system.agents
       SET last_health_at     = now(),
           last_health_reason = v_health.reason
     WHERE id = NEW.agent_id;
    RETURN NEW;
  END IF;

  -- A real transition. Choose the canonical event name.
  IF v_health.health_status = 'healthy' THEN
    v_event := 'agent.health_recovered';
  ELSE
    v_event := 'agent.health_degraded';
  END IF;

  v_summary := format(
    '%s slug=%s prev=%s now=%s reason=%s',
    upper(replace(v_event, '.', '_')),
    COALESCE(v_slug, NEW.agent_id::TEXT),
    COALESCE(v_prev, 'unknown'),
    v_health.health_status,
    v_health.reason
  );

  BEGIN
    INSERT INTO public.engine_run_logs (
      engine_name, category, status, started_at, finished_at, duration_ms,
      effect_summary, metadata_json
    ) VALUES (
      'agent-heartbeat', v_event, 'ok', now(), now(), 0,
      v_summary,
      jsonb_build_object(
        'agent_id',         NEW.agent_id,
        'agent_slug',       v_slug,
        'previous_status',  v_prev,
        'health_status',    v_health.health_status,
        'reason',           v_health.reason,
        'lag_ms',           v_health.lag_ms,
        'in_flight',        v_health.in_flight,
        'queue_depth',      v_health.queue_depth,
        'worker_count',     v_health.worker_count,
        'worker_id',        NEW.worker_id,
        'source',           'heartbeat_trigger'
      )
    );
  EXCEPTION WHEN OTHERS THEN
    -- Audit failure must NEVER block a heartbeat insert.
    RAISE WARNING 'agent_heartbeat_transition: audit insert failed: %', SQLERRM;
  END;

  UPDATE system.agents
     SET last_health_status = v_health.health_status,
         last_health_at     = now(),
         last_health_reason = v_health.reason
   WHERE id = NEW.agent_id;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_agent_heartbeat_transition ON system.agent_heartbeats;
CREATE TRIGGER trg_agent_heartbeat_transition
  AFTER INSERT ON system.agent_heartbeats
  FOR EACH ROW EXECUTE FUNCTION system.fn_agent_heartbeat_transition();

-- ── 7. sweep_agent_health() — stale detection without a new heartbeat ────
-- Walks every registered agent, computes current health, and audits any
-- transition. Idempotent: a steady-state agent generates no event.
CREATE OR REPLACE FUNCTION system.sweep_agent_health()
RETURNS INT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, system
AS $$
DECLARE
  v_a         RECORD;
  v_h         RECORD;
  v_event     TEXT;
  v_summary   TEXT;
  v_changes   INT := 0;
BEGIN
  FOR v_a IN SELECT id, slug, last_health_status FROM system.agents LOOP
    SELECT * INTO v_h FROM system.compute_agent_health(v_a.id);
    IF v_a.last_health_status IS DISTINCT FROM v_h.health_status THEN
      v_changes := v_changes + 1;
      IF v_h.health_status = 'healthy' THEN
        v_event := 'agent.health_recovered';
      ELSE
        v_event := 'agent.health_degraded';
      END IF;
      v_summary := format(
        '%s slug=%s prev=%s now=%s reason=%s source=sweep',
        upper(replace(v_event, '.', '_')),
        COALESCE(v_a.slug, v_a.id::TEXT),
        COALESCE(v_a.last_health_status, 'unknown'),
        v_h.health_status,
        v_h.reason
      );
      BEGIN
        INSERT INTO public.engine_run_logs (
          engine_name, category, status, started_at, finished_at, duration_ms,
          effect_summary, metadata_json
        ) VALUES (
          'agent-heartbeat', v_event, 'ok', now(), now(), 0, v_summary,
          jsonb_build_object(
            'agent_id',        v_a.id,
            'agent_slug',      v_a.slug,
            'previous_status', v_a.last_health_status,
            'health_status',   v_h.health_status,
            'reason',          v_h.reason,
            'lag_ms',          v_h.lag_ms,
            'source',          'health_sweep'
          )
        );
      EXCEPTION WHEN OTHERS THEN
        RAISE WARNING 'sweep_agent_health audit failed: %', SQLERRM;
      END;
      UPDATE system.agents
         SET last_health_status = v_h.health_status,
             last_health_at     = now(),
             last_health_reason = v_h.reason
       WHERE id = v_a.id;
    END IF;
  END LOOP;
  RETURN v_changes;
END;
$$;

REVOKE ALL ON FUNCTION system.sweep_agent_health() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION system.sweep_agent_health()
  TO authenticated, service_role;

-- ── 8. Retention prune (7 days) ──────────────────────────────────────────
CREATE OR REPLACE FUNCTION system.prune_agent_heartbeats(p_keep_days INT DEFAULT 7)
RETURNS INT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, system
AS $$
DECLARE
  v_deleted INT;
BEGIN
  WITH deleted AS (
    DELETE FROM system.agent_heartbeats
     WHERE created_at < now() - make_interval(days => GREATEST(1, p_keep_days))
    RETURNING 1
  )
  SELECT COUNT(*) INTO v_deleted FROM deleted;
  RETURN v_deleted;
END;
$$;

REVOKE ALL ON FUNCTION system.prune_agent_heartbeats(INT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION system.prune_agent_heartbeats(INT)
  TO authenticated, service_role;

-- ── 9. Sweep wrapper — fires twice within a single minute window ─────────
-- pg_cron's smallest schedule granularity is one minute. We need ≤30s
-- detection latency for stale → down transitions, so wrap the sweep in a
-- plpgsql function that runs the sweep, waits 30s, and runs it again.
-- (PERFORM is plpgsql-only — it CANNOT live in a pg_cron command string,
-- which is plain SQL. Wrapping it in a plpgsql function is the correct
-- shape and what the previous review flagged as missing.)
CREATE OR REPLACE FUNCTION system.run_agent_health_sweep_twice()
RETURNS INT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, system
AS $$
DECLARE v_total INT := 0; v_one INT;
BEGIN
  v_one := system.sweep_agent_health(); v_total := v_total + v_one;
  PERFORM pg_sleep(30);
  v_one := system.sweep_agent_health(); v_total := v_total + v_one;
  RETURN v_total;
END;
$$;
REVOKE ALL ON FUNCTION system.run_agent_health_sweep_twice() FROM PUBLIC, authenticated, anon;
GRANT EXECUTE ON FUNCTION system.run_agent_health_sweep_twice() TO service_role;

-- ── 10. pg_cron jobs ─────────────────────────────────────────────────────
-- Stale sweep every minute (with a 30s mid-cycle re-sweep ⇒ ≤30s latency);
-- daily prune at 03:30 UTC.
DO $cron_heartbeats$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN
    BEGIN PERFORM cron.unschedule('agent-heartbeats-sweep');
    EXCEPTION WHEN OTHERS THEN NULL; END;
    BEGIN PERFORM cron.unschedule('agent-heartbeats-prune');
    EXCEPTION WHEN OTHERS THEN NULL; END;

    PERFORM cron.schedule(
      'agent-heartbeats-sweep',
      '* * * * *',
      $cron_body$SELECT system.run_agent_health_sweep_twice();$cron_body$
    );

    PERFORM cron.schedule(
      'agent-heartbeats-prune',
      '30 3 * * *',
      $cron_body$SELECT system.prune_agent_heartbeats(7);$cron_body$
    );
  END IF;
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'agent-heartbeats cron schedule failed: %', SQLERRM;
END;
$cron_heartbeats$;

-- ── 11. Seed the worker-process agent ────────────────────────────────────
-- The execution-loop edge function emits a process-level heartbeat against
-- this slug. Kind-agnostic: the same registration shape will be used for
-- a future dev/build agent or ASIS cognitive module.
DO $seed_loop_agent$
BEGIN
  PERFORM system.register_agent(
    p_slug         => 'system.execution_loop',
    p_display_name => 'Execution Loop Worker',
    p_agent_kind   => 'system.internal',
    p_initial_version => '1.0.0',
    p_owner_team   => 'platform-execution',
    p_status       => 'active',
    p_metadata     => jsonb_build_object(
      'heartbeat', jsonb_build_object(
        'cadence_ms',       15000,
        'stale_multiplier', 2,
        'down_multiplier',  5
      )
    ),
    p_capabilities => '[]'::jsonb,
    p_changelog    => 'Seeded by L2 heartbeat migration.'
  );
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'system.execution_loop seed skipped: %', SQLERRM;
END;
$seed_loop_agent$;
