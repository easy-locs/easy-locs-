-- ============================================================================
-- Agent System Hardening — Watchdog + Anti-Deadlock (task #1016)
--
-- The agent task queue recently deadlocked because an approved task depended
-- on a never-approved (Draft) task, leaving the cockpit stuck on
-- "Waiting for tasks to complete…" with no automatic recovery.
--
-- This migration installs a watchdog layer and structural guards so the agent
-- system can never silently hang again:
--   1. Every row in `system.execution_tasks` has an effective timeout
--      (per-task override or system default) and an explicit deadline.
--   2. A scheduled watchdog (the `agent-watchdog` edge function) calls
--      `system.run_agent_watchdog()`, which:
--        - flags running tasks past their deadline / stale heartbeat as
--          `stalled` (sets `stalled_at`, logs an incident).
--        - auto-fails tasks that remain stalled past a second threshold,
--          releasing their dependents.
--        - auto-releases dependency edges whose upstream task has reached a
--          terminal state (succeeded / failed / cancelled / rolled_back).
--   3. The system refuses to create a dependency whose target is not in an
--      approved/active/completed state (never PROPOSED/Draft, never
--      CANCELLED/missing). Rejections are written to `agent_incident_log`.
--   4. Operator overrides (extend deadline, force-release a dependency edge,
--      acknowledge an incident) are first-class RPCs that all write to
--      `agent_incident_log` with the operator identity.
--   5. A simple health check exposes the watchdog's last successful run so
--      the cockpit can alert when monitoring itself is degraded.
--
-- This migration is purely additive. It does not modify the v2 lifecycle
-- enum, the canonical transition matrix, or the dispatch RPC surface.
-- ============================================================================

-- ── 1. Watchdog system settings (single-row table) ──────────────────────────
CREATE TABLE IF NOT EXISTS system.agent_watchdog_settings (
  id                              BOOLEAN PRIMARY KEY DEFAULT TRUE
                                  CHECK (id = TRUE),
  default_timeout_seconds         INTEGER NOT NULL DEFAULT 600,
  staleness_threshold_seconds     INTEGER NOT NULL DEFAULT 300,
  autofail_after_stall_seconds    INTEGER NOT NULL DEFAULT 600,
  watchdog_max_silence_seconds    INTEGER NOT NULL DEFAULT 300,
  last_run_at                     TIMESTAMPTZ,
  last_run_summary                JSONB,
  updated_at                      TIMESTAMPTZ NOT NULL DEFAULT now()
);

INSERT INTO system.agent_watchdog_settings(id) VALUES (TRUE)
  ON CONFLICT (id) DO NOTHING;

-- ── 2. Watchdog columns on execution_tasks ──────────────────────────────────
ALTER TABLE system.execution_tasks
  ADD COLUMN IF NOT EXISTS timeout_seconds   INTEGER,
  ADD COLUMN IF NOT EXISTS deadline_at       TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS last_heartbeat_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS stalled_at        TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_execution_tasks_watchdog_running
  ON system.execution_tasks (status, deadline_at)
  WHERE status = 'running';

CREATE INDEX IF NOT EXISTS idx_execution_tasks_watchdog_stalled
  ON system.execution_tasks (stalled_at)
  WHERE stalled_at IS NOT NULL;

-- Backfill: any active task without a deadline gets the system default.
DO $$
DECLARE
  v_default INT;
BEGIN
  SELECT default_timeout_seconds INTO v_default
    FROM system.agent_watchdog_settings WHERE id IS TRUE;
  v_default := COALESCE(v_default, 600);

  UPDATE system.execution_tasks
     SET timeout_seconds = v_default,
         deadline_at     = COALESCE(started_at, created_at, now())
                           + (v_default || ' seconds')::interval
   WHERE deadline_at IS NULL
     AND status IN ('approved','queued','running');
END $$;

-- ── 3. BEFORE UPDATE trigger: stamp deadline on entry to `running` ──────────
-- Named with a `z_` prefix so it fires AFTER the existing
-- `trg_execution_tasks_state_machine` trigger (Postgres orders BEFORE
-- triggers alphabetically by name). That trigger sets `started_at`; we
-- read it here.
CREATE OR REPLACE FUNCTION system.execution_tasks_set_deadline()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  v_default INTEGER;
  v_timeout INTEGER;
BEGIN
  IF NEW.status = 'running' AND OLD.status IS DISTINCT FROM NEW.status THEN
    SELECT default_timeout_seconds INTO v_default
      FROM system.agent_watchdog_settings WHERE id IS TRUE;
    v_timeout := COALESCE(NEW.timeout_seconds, v_default, 600);
    NEW.timeout_seconds   := v_timeout;
    NEW.deadline_at       := COALESCE(NEW.started_at, now())
                             + (v_timeout || ' seconds')::interval;
    NEW.last_heartbeat_at := COALESCE(NEW.last_heartbeat_at, now());
    NEW.stalled_at        := NULL;
  END IF;

  -- When the task leaves `running` for any terminal/intermediate state,
  -- clear the stall flag so re-runs start clean.
  IF OLD.status = 'running' AND NEW.status <> 'running' THEN
    NEW.stalled_at := NULL;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_z_execution_tasks_set_deadline ON system.execution_tasks;
CREATE TRIGGER trg_z_execution_tasks_set_deadline
  BEFORE UPDATE ON system.execution_tasks
  FOR EACH ROW EXECUTE FUNCTION system.execution_tasks_set_deadline();

-- ── 4. Dependency edges (task → blocking task) ──────────────────────────────
-- This is a separate edge table rather than an array column on
-- `execution_tasks` so the watchdog can resolve dependents in a single
-- indexed query and so each rejection / release has its own audit row.
CREATE TABLE IF NOT EXISTS system.execution_task_dependencies (
  task_id            UUID NOT NULL
                     REFERENCES system.execution_tasks(id) ON DELETE CASCADE,
  depends_on_task_id UUID NOT NULL
                     REFERENCES system.execution_tasks(id) ON DELETE RESTRICT,
  created_at         TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by         TEXT NOT NULL DEFAULT 'system',
  released_at        TIMESTAMPTZ,
  released_by        TEXT,
  release_reason     TEXT,
  PRIMARY KEY (task_id, depends_on_task_id),
  CHECK (task_id <> depends_on_task_id)
);

CREATE INDEX IF NOT EXISTS idx_etd_active_blocker
  ON system.execution_task_dependencies(depends_on_task_id)
  WHERE released_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_etd_active_task
  ON system.execution_task_dependencies(task_id)
  WHERE released_at IS NULL;

-- ── 5. Incident log (append-only) ───────────────────────────────────────────
-- Named `agent_incident_log` to avoid clashing with `sentinel.incident_log`
-- and `army.incident_log`, which serve different layers.
CREATE TABLE IF NOT EXISTS system.agent_incident_log (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_ref         UUID REFERENCES system.execution_tasks(id) ON DELETE SET NULL,
  kind             TEXT NOT NULL,
  reason_code      TEXT NOT NULL,
  previous_state   TEXT,
  new_state        TEXT,
  payload          JSONB NOT NULL DEFAULT '{}'::jsonb,
  actor            TEXT NOT NULL DEFAULT 'watchdog',
  acknowledged_at  TIMESTAMPTZ,
  acknowledged_by  TEXT,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_agent_incident_log_task
  ON system.agent_incident_log(task_ref);
CREATE INDEX IF NOT EXISTS idx_agent_incident_log_kind
  ON system.agent_incident_log(kind, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_agent_incident_log_open
  ON system.agent_incident_log(created_at DESC)
  WHERE acknowledged_at IS NULL;

ALTER TABLE system.agent_incident_log ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY agent_incident_log_admin_read ON system.agent_incident_log
    FOR SELECT TO authenticated
    USING (public.has_role(auth.uid(), 'admin'::public.app_role));
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ── 6. Heartbeat RPC (callable by the orchestrator / agents) ────────────────
CREATE OR REPLACE FUNCTION system.execution_task_heartbeat(p_task_id UUID)
RETURNS TIMESTAMPTZ
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, system
AS $$
DECLARE
  v_now TIMESTAMPTZ := now();
BEGIN
  UPDATE system.execution_tasks
     SET last_heartbeat_at = v_now,
         stalled_at        = NULL
   WHERE id = p_task_id
     AND status = 'running';
  RETURN v_now;
END;
$$;

REVOKE ALL ON FUNCTION system.execution_task_heartbeat(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION system.execution_task_heartbeat(UUID)
  TO authenticated, service_role;

-- ── 7. Dependency-guard RPCs ────────────────────────────────────────────────
-- The states that may appear as a *blocker*:
--   approved / queued / running / succeeded
-- Anything else (draft, pending_review, rejected, blocked, failed,
-- rolled_back, cancelled, missing) is rejected as a structural deadlock risk.
CREATE OR REPLACE FUNCTION system.validate_task_dependency(p_depends_on UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, system
AS $$
DECLARE
  v_status system.execution_task_status;
BEGIN
  IF p_depends_on IS NULL THEN
    RETURN jsonb_build_object('ok', FALSE, 'reason_code', 'DEPENDENCY_NULL');
  END IF;

  SELECT status INTO v_status
    FROM system.execution_tasks WHERE id = p_depends_on;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', FALSE,
      'reason_code', 'DEPENDENCY_NOT_FOUND',
      'depends_on', p_depends_on);
  END IF;

  IF v_status NOT IN ('approved','queued','running','succeeded') THEN
    RETURN jsonb_build_object('ok', FALSE,
      'reason_code', 'DEPENDENCY_NOT_APPROVED',
      'depends_on', p_depends_on,
      'depends_on_status', v_status);
  END IF;

  RETURN jsonb_build_object('ok', TRUE,
    'depends_on', p_depends_on,
    'depends_on_status', v_status);
END;
$$;

REVOKE ALL ON FUNCTION system.validate_task_dependency(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION system.validate_task_dependency(UUID)
  TO authenticated, service_role;

CREATE OR REPLACE FUNCTION system.add_task_dependency(
  p_task_id    UUID,
  p_depends_on UUID,
  p_actor      TEXT DEFAULT 'system'
) RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, system
AS $$
DECLARE
  v_check JSONB;
BEGIN
  IF p_task_id = p_depends_on THEN
    INSERT INTO system.agent_incident_log
      (task_ref, kind, reason_code, actor, payload)
    VALUES
      (p_task_id, 'dependency_rejected', 'DEPENDENCY_SELF_REFERENCE',
       p_actor, jsonb_build_object('depends_on', p_depends_on));
    RAISE EXCEPTION 'task cannot depend on itself' USING ERRCODE = '22023';
  END IF;

  v_check := system.validate_task_dependency(p_depends_on);

  IF NOT (v_check->>'ok')::boolean THEN
    INSERT INTO system.agent_incident_log
      (task_ref, kind, reason_code, previous_state, actor, payload)
    VALUES
      (p_task_id, 'dependency_rejected',
       v_check->>'reason_code', v_check->>'depends_on_status',
       p_actor,
       jsonb_build_object('depends_on', p_depends_on, 'check', v_check));
    RAISE EXCEPTION
      'dependency on % rejected: %', p_depends_on, v_check->>'reason_code'
      USING ERRCODE = '22023';
  END IF;

  INSERT INTO system.execution_task_dependencies
    (task_id, depends_on_task_id, created_by)
  VALUES (p_task_id, p_depends_on, p_actor)
  ON CONFLICT (task_id, depends_on_task_id) DO NOTHING;

  RETURN jsonb_build_object('ok', TRUE,
    'task_id', p_task_id, 'depends_on', p_depends_on);
END;
$$;

REVOKE ALL ON FUNCTION system.add_task_dependency(UUID, UUID, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION system.add_task_dependency(UUID, UUID, TEXT)
  TO authenticated, service_role;

-- ── 8. Watchdog scan ────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION system.run_agent_watchdog()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, system
AS $$
DECLARE
  v_settings           system.agent_watchdog_settings;
  v_stalled_count      INT := 0;
  v_autofailed_count   INT := 0;
  v_unblocked_count    INT := 0;
  v_dep_failed_count   INT := 0;
  v_now                TIMESTAMPTZ := now();
  r                    RECORD;
  v_summary            JSONB;
BEGIN
  SELECT * INTO v_settings
    FROM system.agent_watchdog_settings WHERE id IS TRUE FOR UPDATE;
  IF NOT FOUND THEN
    INSERT INTO system.agent_watchdog_settings(id) VALUES (TRUE)
      RETURNING * INTO v_settings;
  END IF;

  -- 1) Stall detection: running tasks past deadline OR with stale heartbeat.
  FOR r IN
    SELECT id, deadline_at, last_heartbeat_at
      FROM system.execution_tasks
     WHERE status = 'running'
       AND stalled_at IS NULL
       AND (
         (deadline_at IS NOT NULL AND deadline_at < v_now)
         OR (
           last_heartbeat_at IS NOT NULL
           AND last_heartbeat_at <
               v_now - (v_settings.staleness_threshold_seconds || ' seconds')::interval
         )
       )
  LOOP
    UPDATE system.execution_tasks
       SET stalled_at = v_now
     WHERE id = r.id;

    INSERT INTO system.agent_incident_log
      (task_ref, kind, reason_code, previous_state, new_state, payload)
    VALUES
      (r.id, 'stall_detected',
       CASE
         WHEN r.deadline_at IS NOT NULL AND r.deadline_at < v_now
           THEN 'DEADLINE_EXCEEDED'
         ELSE 'HEARTBEAT_STALE'
       END,
       'running', 'running',
       jsonb_build_object(
         'deadline_at', r.deadline_at,
         'last_heartbeat_at', r.last_heartbeat_at,
         'observed_at', v_now));

    v_stalled_count := v_stalled_count + 1;
  END LOOP;

  -- 2) Auto-fail: tasks stalled longer than the autofail threshold.
  FOR r IN
    SELECT id, stalled_at FROM system.execution_tasks
     WHERE status = 'running'
       AND stalled_at IS NOT NULL
       AND stalled_at <
           v_now - (v_settings.autofail_after_stall_seconds || ' seconds')::interval
  LOOP
    BEGIN
      UPDATE system.execution_tasks
         SET status         = 'failed',
             failed_at      = v_now,
             error_code     = COALESCE(error_code, 'WATCHDOG_AUTOFAIL'),
             blocked_reason = COALESCE(
               blocked_reason,
               'auto-failed by watchdog after stall')
       WHERE id = r.id;

      INSERT INTO system.agent_incident_log
        (task_ref, kind, reason_code, previous_state, new_state, payload)
      VALUES
        (r.id, 'autofail', 'STALLED_PAST_THRESHOLD',
         'running', 'failed',
         jsonb_build_object(
           'stalled_at', r.stalled_at,
           'autofail_threshold_seconds',
             v_settings.autofail_after_stall_seconds,
           'observed_at', v_now));

      v_autofailed_count := v_autofailed_count + 1;
    EXCEPTION WHEN OTHERS THEN
      INSERT INTO system.agent_incident_log
        (task_ref, kind, reason_code, payload)
      VALUES
        (r.id, 'autofail_failed', 'TRANSITION_REJECTED',
         jsonb_build_object('error', SQLERRM));
      v_dep_failed_count := v_dep_failed_count + 1;
    END;
  END LOOP;

  -- 3) Auto-release dependency edges whose blocker is terminally resolved.
  WITH released AS (
    UPDATE system.execution_task_dependencies d
       SET released_at    = v_now,
           released_by    = 'watchdog',
           release_reason = 'upstream_resolved:' || et.status::text
      FROM system.execution_tasks et
     WHERE d.depends_on_task_id = et.id
       AND d.released_at IS NULL
       AND et.status IN
           ('succeeded','failed','cancelled','rolled_back','rejected')
    RETURNING d.task_id, d.depends_on_task_id, et.status AS upstream_status
  )
  SELECT COUNT(*) INTO v_unblocked_count FROM released;

  -- 4) Persist last-run summary for the cockpit health view.
  v_summary := jsonb_build_object(
    'stalled_count',     v_stalled_count,
    'autofailed_count',  v_autofailed_count,
    'unblocked_count',   v_unblocked_count,
    'dep_failed_count',  v_dep_failed_count,
    'ran_at',            v_now
  );

  UPDATE system.agent_watchdog_settings
     SET last_run_at      = v_now,
         last_run_summary = v_summary,
         updated_at       = v_now
   WHERE id IS TRUE;

  RETURN v_summary || jsonb_build_object('ok', TRUE);
END;
$$;

REVOKE ALL ON FUNCTION system.run_agent_watchdog() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION system.run_agent_watchdog()
  TO service_role;

-- ── 9. Watchdog health ──────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION system.agent_watchdog_health()
RETURNS JSONB
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, system
AS $$
DECLARE
  v_settings system.agent_watchdog_settings;
  v_silence  INTEGER;
  v_open_incidents INTEGER;
BEGIN
  SELECT * INTO v_settings FROM system.agent_watchdog_settings WHERE id IS TRUE;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('healthy', FALSE, 'reason', 'NO_SETTINGS');
  END IF;

  IF v_settings.last_run_at IS NULL THEN
    RETURN jsonb_build_object('healthy', FALSE, 'reason', 'NEVER_RAN');
  END IF;

  v_silence := EXTRACT(EPOCH FROM (now() - v_settings.last_run_at))::INT;

  SELECT COUNT(*) INTO v_open_incidents
    FROM system.agent_incident_log
   WHERE acknowledged_at IS NULL
     AND created_at > now() - INTERVAL '24 hours';

  RETURN jsonb_build_object(
    'healthy', v_silence <= v_settings.watchdog_max_silence_seconds,
    'last_run_at', v_settings.last_run_at,
    'silence_seconds', v_silence,
    'max_silence_seconds', v_settings.watchdog_max_silence_seconds,
    'last_run_summary', v_settings.last_run_summary,
    'open_incidents_24h', v_open_incidents
  );
END;
$$;

REVOKE ALL ON FUNCTION system.agent_watchdog_health() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION system.agent_watchdog_health()
  TO authenticated, service_role;

-- ── 10. Operator overrides ──────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION system.extend_task_deadline(
  p_task_id       UUID,
  p_extra_seconds INTEGER,
  p_actor         TEXT DEFAULT 'operator'
) RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, system
AS $$
DECLARE
  v_old TIMESTAMPTZ;
  v_new TIMESTAMPTZ;
BEGIN
  IF p_extra_seconds IS NULL OR p_extra_seconds <= 0 THEN
    RAISE EXCEPTION 'p_extra_seconds must be > 0' USING ERRCODE = '22023';
  END IF;

  SELECT deadline_at INTO v_old
    FROM system.execution_tasks WHERE id = p_task_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'task % not found', p_task_id USING ERRCODE = '22023';
  END IF;

  v_new := COALESCE(v_old, now()) + (p_extra_seconds || ' seconds')::interval;

  UPDATE system.execution_tasks
     SET deadline_at = v_new,
         stalled_at  = NULL
   WHERE id = p_task_id;

  INSERT INTO system.agent_incident_log
    (task_ref, kind, reason_code, actor, payload)
  VALUES
    (p_task_id, 'manual_extend_deadline', 'OPERATOR_EXTEND', p_actor,
     jsonb_build_object(
       'old_deadline_at', v_old,
       'new_deadline_at', v_new,
       'extra_seconds', p_extra_seconds));

  RETURN jsonb_build_object('ok', TRUE,
    'task_id', p_task_id,
    'new_deadline_at', v_new);
END;
$$;

REVOKE ALL ON FUNCTION system.extend_task_deadline(UUID, INTEGER, TEXT)
  FROM PUBLIC;
GRANT EXECUTE ON FUNCTION system.extend_task_deadline(UUID, INTEGER, TEXT)
  TO service_role, authenticated;

CREATE OR REPLACE FUNCTION system.force_release_dependency(
  p_task_id    UUID,
  p_depends_on UUID,
  p_actor      TEXT,
  p_reason     TEXT
) RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, system
AS $$
DECLARE
  v_count INT;
BEGIN
  IF p_actor IS NULL OR BTRIM(p_actor) = '' THEN
    RAISE EXCEPTION 'actor required' USING ERRCODE = '22023';
  END IF;
  IF p_reason IS NULL OR BTRIM(p_reason) = '' THEN
    RAISE EXCEPTION 'reason required' USING ERRCODE = '22023';
  END IF;

  UPDATE system.execution_task_dependencies
     SET released_at    = now(),
         released_by    = p_actor,
         release_reason = 'manual:' || p_reason
   WHERE task_id = p_task_id
     AND depends_on_task_id = p_depends_on
     AND released_at IS NULL;

  GET DIAGNOSTICS v_count = ROW_COUNT;

  INSERT INTO system.agent_incident_log
    (task_ref, kind, reason_code, actor, payload)
  VALUES
    (p_task_id, 'force_release_dependency', 'OPERATOR_RELEASE', p_actor,
     jsonb_build_object(
       'depends_on', p_depends_on,
       'reason', p_reason,
       'rows_released', v_count));

  RETURN jsonb_build_object('ok', TRUE, 'rows_released', v_count);
END;
$$;

REVOKE ALL ON FUNCTION system.force_release_dependency(UUID, UUID, TEXT, TEXT)
  FROM PUBLIC;
GRANT EXECUTE ON FUNCTION system.force_release_dependency(UUID, UUID, TEXT, TEXT)
  TO service_role, authenticated;

CREATE OR REPLACE FUNCTION system.acknowledge_incident(
  p_incident_id UUID,
  p_actor       TEXT
) RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, system
AS $$
DECLARE
  v_count INT;
BEGIN
  IF p_actor IS NULL OR BTRIM(p_actor) = '' THEN
    RAISE EXCEPTION 'actor required' USING ERRCODE = '22023';
  END IF;

  UPDATE system.agent_incident_log
     SET acknowledged_at = now(),
         acknowledged_by = p_actor
   WHERE id = p_incident_id
     AND acknowledged_at IS NULL;

  GET DIAGNOSTICS v_count = ROW_COUNT;

  IF v_count = 0 THEN
    RETURN jsonb_build_object('ok', FALSE,
      'reason', 'INCIDENT_MISSING_OR_ACKED',
      'incident_id', p_incident_id);
  END IF;

  -- Log the ack itself as its own audit entry, separate from the
  -- incident row that was acknowledged.
  INSERT INTO system.agent_incident_log
    (task_ref, kind, reason_code, actor, payload)
  SELECT task_ref, 'acknowledge_incident', 'OPERATOR_ACK', p_actor,
         jsonb_build_object('acknowledged_incident_id', p_incident_id)
    FROM system.agent_incident_log WHERE id = p_incident_id;

  RETURN jsonb_build_object('ok', TRUE, 'incident_id', p_incident_id);
END;
$$;

REVOKE ALL ON FUNCTION system.acknowledge_incident(UUID, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION system.acknowledge_incident(UUID, TEXT)
  TO service_role, authenticated;
