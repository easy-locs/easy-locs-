-- ============================================================================
-- Server Brain Infrastructure — Cerveau Central Serveur
-- Tables for 24/7 autonomous Omega, Sentinel, and Command Center operation
-- ============================================================================

-- ── server_events — Central server-side event bus ────────────────────────────
CREATE TABLE IF NOT EXISTS server_events (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type    text NOT NULL,
  payload       jsonb NOT NULL DEFAULT '{}',
  source_engine text NOT NULL,
  status        text NOT NULL DEFAULT 'pending'
                  CHECK (status IN ('pending','processing','processed','failed','expired')),
  level         text NOT NULL DEFAULT 'info'
                  CHECK (level IN ('debug','info','warn','error','critical')),
  created_at    timestamptz NOT NULL DEFAULT now(),
  processed_at  timestamptz,
  expires_at    timestamptz DEFAULT (now() + interval '24 hours')
);

CREATE INDEX IF NOT EXISTS idx_server_events_type ON server_events (event_type);
CREATE INDEX IF NOT EXISTS idx_server_events_source ON server_events (source_engine);
CREATE INDEX IF NOT EXISTS idx_server_events_status ON server_events (status);
CREATE INDEX IF NOT EXISTS idx_server_events_created ON server_events (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_server_events_level ON server_events (level) WHERE level IN ('error','critical');

-- ── omega_decisions — Persistent Omega intelligence decision log ─────────────
CREATE TABLE IF NOT EXISTS omega_decisions (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  decision_type   text NOT NULL,
  target_type     text,
  target_id       text,
  verdict         text NOT NULL DEFAULT 'PENDING'
                    CHECK (verdict IN ('PASS','PASS_WITH_WARNINGS','DEGRADED','BLOCKED','MONITOR_CLOSELY','PENDING')),
  global_score    integer NOT NULL DEFAULT 0,
  sub_scores      jsonb NOT NULL DEFAULT '{}',
  critical_blockers text[] DEFAULT '{}',
  warnings        text[] DEFAULT '{}',
  next_actions    text[] DEFAULT '{}',
  engine_statuses jsonb NOT NULL DEFAULT '{}',
  report_payload  jsonb NOT NULL DEFAULT '{}',
  created_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_omega_decisions_type ON omega_decisions (decision_type);
CREATE INDEX IF NOT EXISTS idx_omega_decisions_created ON omega_decisions (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_omega_decisions_verdict ON omega_decisions (verdict);

-- ── agent_heartbeats — Track server agent liveness ──────────────────────────
CREATE TABLE IF NOT EXISTS agent_heartbeats (
  agent_name    text PRIMARY KEY,
  last_beat_at  timestamptz NOT NULL DEFAULT now(),
  status        text NOT NULL DEFAULT 'alive'
                  CHECK (status IN ('alive','stale','dead','restarting')),
  restart_count integer NOT NULL DEFAULT 0,
  metadata      jsonb NOT NULL DEFAULT '{}',
  updated_at    timestamptz NOT NULL DEFAULT now()
);

-- ── agent_circuit_breakers — Per-engine circuit breaker state ────────────────
CREATE TABLE IF NOT EXISTS agent_circuit_breakers (
  engine_name         text PRIMARY KEY,
  state               text NOT NULL DEFAULT 'closed'
                        CHECK (state IN ('closed','open','half_open')),
  consecutive_failures integer NOT NULL DEFAULT 0,
  last_failure_at     timestamptz,
  last_success_at     timestamptz,
  quarantined_at      timestamptz,
  quarantine_reason   text,
  updated_at          timestamptz NOT NULL DEFAULT now()
);

-- ── emit_server_event() — Publish events into the server bus ────────────────
CREATE OR REPLACE FUNCTION emit_server_event(
  p_event_type    text,
  p_payload       jsonb DEFAULT '{}',
  p_source_engine text DEFAULT 'system',
  p_level         text DEFAULT 'info'
) RETURNS uuid AS $$
DECLARE
  v_id uuid;
BEGIN
  INSERT INTO server_events (event_type, payload, source_engine, level)
  VALUES (p_event_type, p_payload, p_source_engine, p_level)
  RETURNING id INTO v_id;

  PERFORM pg_notify('server_events', json_build_object(
    'id', v_id,
    'event_type', p_event_type,
    'source_engine', p_source_engine,
    'level', p_level
  )::text);

  RETURN v_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ── update_agent_heartbeat() — Upsert heartbeat for an agent ────────────────
CREATE OR REPLACE FUNCTION update_agent_heartbeat(
  p_agent_name text,
  p_metadata   jsonb DEFAULT '{}'
) RETURNS void AS $$
BEGIN
  INSERT INTO agent_heartbeats (agent_name, last_beat_at, status, restart_count, metadata, updated_at)
  VALUES (p_agent_name, now(), 'alive', 0, p_metadata, now())
  ON CONFLICT (agent_name) DO UPDATE SET
    last_beat_at = now(),
    status = 'alive',
    restart_count = 0,
    metadata = p_metadata,
    updated_at = now();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ── record_circuit_breaker_failure() — Increment failure count ──────────────
CREATE OR REPLACE FUNCTION record_circuit_breaker_failure(
  p_engine_name text,
  p_reason      text DEFAULT NULL
) RETURNS text AS $$
DECLARE
  v_failures integer;
  v_state    text;
BEGIN
  INSERT INTO agent_circuit_breakers (engine_name, consecutive_failures, last_failure_at, updated_at)
  VALUES (p_engine_name, 1, now(), now())
  ON CONFLICT (engine_name) DO UPDATE SET
    consecutive_failures = agent_circuit_breakers.consecutive_failures + 1,
    last_failure_at = now(),
    updated_at = now()
  RETURNING consecutive_failures, state INTO v_failures, v_state;

  IF v_failures >= 3 AND v_state = 'closed' THEN
    UPDATE agent_circuit_breakers
    SET state = 'open',
        quarantined_at = now(),
        quarantine_reason = COALESCE(p_reason, 'Auto-quarantine after 3 consecutive failures')
    WHERE engine_name = p_engine_name;
    RETURN 'open';
  END IF;

  RETURN v_state;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ── record_circuit_breaker_success() — Reset failure count ──────────────────
CREATE OR REPLACE FUNCTION record_circuit_breaker_success(
  p_engine_name text
) RETURNS void AS $$
BEGIN
  INSERT INTO agent_circuit_breakers (engine_name, consecutive_failures, last_success_at, state, updated_at)
  VALUES (p_engine_name, 0, now(), 'closed', now())
  ON CONFLICT (engine_name) DO UPDATE SET
    consecutive_failures = 0,
    last_success_at = now(),
    state = 'closed',
    quarantined_at = NULL,
    quarantine_reason = NULL,
    updated_at = now();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ── cleanup_old_server_events() — Purge expired events ──────────────────────
CREATE OR REPLACE FUNCTION cleanup_old_server_events() RETURNS integer AS $$
DECLARE
  v_count integer;
BEGIN
  DELETE FROM server_events
  WHERE expires_at < now()
     OR (created_at < now() - interval '7 days' AND status = 'processed');
  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ── RLS ─────────────────────────────────────────────────────────────────────
ALTER TABLE server_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE omega_decisions ENABLE ROW LEVEL SECURITY;
ALTER TABLE agent_heartbeats ENABLE ROW LEVEL SECURITY;
ALTER TABLE agent_circuit_breakers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "server_events_service" ON server_events FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "server_events_authenticated_read" ON server_events FOR SELECT TO authenticated USING (true);

CREATE POLICY "omega_decisions_service" ON omega_decisions FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "omega_decisions_authenticated_read" ON omega_decisions FOR SELECT TO authenticated USING (true);

CREATE POLICY "agent_heartbeats_service" ON agent_heartbeats FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "agent_heartbeats_admin_read" ON agent_heartbeats FOR SELECT USING (public.is_admin(auth.uid()));

CREATE POLICY "agent_cb_service" ON agent_circuit_breakers FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "agent_cb_admin_read" ON agent_circuit_breakers FOR SELECT USING (public.is_admin(auth.uid()));

-- ── Enable Supabase Realtime on server_events and omega_decisions ────────────
DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE server_events;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE omega_decisions;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ── Register new autonomy systems ──────────────────────────────────────────
INSERT INTO autonomy_system_status (system_name, display_name) VALUES
  ('omega_server_loop', 'Omega Server Intelligence Loop'),
  ('sentinel_server_guards', 'Sentinel Server Guards'),
  ('command_center_api', 'Command Center API'),
  ('agent_watchdog', 'Agent Watchdog Monitor')
ON CONFLICT (system_name) DO NOTHING;

-- ── Privilege lockdown ─────────────────────────────────────────────────────
REVOKE EXECUTE ON FUNCTION emit_server_event FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION update_agent_heartbeat FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION record_circuit_breaker_failure FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION record_circuit_breaker_success FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION cleanup_old_server_events FROM PUBLIC, anon, authenticated;

GRANT EXECUTE ON FUNCTION emit_server_event TO service_role;
GRANT EXECUTE ON FUNCTION update_agent_heartbeat TO service_role;
GRANT EXECUTE ON FUNCTION record_circuit_breaker_failure TO service_role;
GRANT EXECUTE ON FUNCTION record_circuit_breaker_success TO service_role;
GRANT EXECUTE ON FUNCTION cleanup_old_server_events TO service_role;

-- ── pg_cron schedule for server brain maintenance ──────────────────────────
-- NOTE: omega-server-loop and sentinel-server-guards are dispatched by the
-- autonomous-cron-dispatcher Edge Function (every 5 min) to avoid duplicate
-- scheduling. Only maintenance jobs that don't need HTTP are scheduled here.
DO $outer$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN
    PERFORM cron.schedule('server-events-cleanup', '0 * * * *',
      $cron$SELECT cleanup_old_server_events()$cron$
    );
  END IF;
END $outer$;
