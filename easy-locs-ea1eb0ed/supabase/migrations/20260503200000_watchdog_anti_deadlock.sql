-- ════════════════════════════════════════════════════════════════════════
--  Task #1017 — Watchdog + Anti-Deadlock Layer
-- ════════════════════════════════════════════════════════════════════════
--  Adds permanent end-to-end timeout enforcement, stuck-task detection,
--  dependency safety + cycle detection at dispatch, and an immutable
--  incident log surfaced on a dedicated admin page.
--
--  Authoritative SQL surface — keep `system.execution_tasks`, the dispatch
--  RPC, and the orchestrator state machine in lock-step with the changes
--  introduced here. Nothing here weakens any pre-existing approval, scope-
--  locking, idempotency, or audit guarantee.
-- ════════════════════════════════════════════════════════════════════════

BEGIN;

-- ── 1. Per-task timeout contract ─────────────────────────────────────────
ALTER TABLE system.execution_tasks
  ADD COLUMN IF NOT EXISTS max_duration_ms      INTEGER,
  ADD COLUMN IF NOT EXISTS stage_started_at     TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS last_heartbeat_at    TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS stuck_threshold_ms   INTEGER,
  ADD COLUMN IF NOT EXISTS failure_class        TEXT,
  ADD COLUMN IF NOT EXISTS watchdog_intervened  BOOLEAN NOT NULL DEFAULT FALSE;

COMMENT ON COLUMN system.execution_tasks.max_duration_ms IS
  'End-to-end maximum duration (ms). When elapsed since started_at, the watchdog auto-fails the task with failure_class=timeout.';
COMMENT ON COLUMN system.execution_tasks.stage_started_at IS
  'Wall-clock timestamp when the current lifecycle stage was entered. Used by the watchdog to detect stuck stages.';
COMMENT ON COLUMN system.execution_tasks.last_heartbeat_at IS
  'Wall-clock timestamp of the most recent heartbeat from the worker owning this task. NULL until a worker heartbeats.';
COMMENT ON COLUMN system.execution_tasks.stuck_threshold_ms IS
  'Per-stage stuck threshold (ms). Time without heartbeat / transition before the watchdog considers the task stuck.';
COMMENT ON COLUMN system.execution_tasks.failure_class IS
  'Structured failure classification. Watchdog writes "timeout", "stuck_no_heartbeat", "stuck_no_progress", "lock_ttl_expired", "orphan_recovered". Adapter-level failures use existing error_code.';
COMMENT ON COLUMN system.execution_tasks.watchdog_intervened IS
  'TRUE if the watchdog has ever taken action on this task (auto-fail / auto-recover / lock-release).';

-- Per-verb defaults applied at dispatch when caller omits max_duration_ms.
-- Conservative — tasks that need longer must declare it explicitly.
CREATE TABLE IF NOT EXISTS system.task_verb_defaults (
  task_type           TEXT PRIMARY KEY,
  max_duration_ms     INTEGER NOT NULL CHECK (max_duration_ms > 0),
  stuck_threshold_ms  INTEGER NOT NULL CHECK (stuck_threshold_ms > 0),
  notes               TEXT,
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

INSERT INTO system.task_verb_defaults (task_type, max_duration_ms, stuck_threshold_ms, notes) VALUES
  ('*',                          5  * 60 * 1000, 90 * 1000,  'Global fallback'),
  ('ANALYSIS',                   2  * 60 * 1000, 60 * 1000,  'Read-only analysis tasks'),
  ('VALIDATION',                 2  * 60 * 1000, 60 * 1000,  'Read-only validation'),
  ('REPORT_GENERATION',          5  * 60 * 1000, 90 * 1000,  'Report rendering'),
  ('READ_ONLY_QUERY',            60 * 1000,      30 * 1000,  'Lightweight read'),
  ('CACHE_REFRESH',              2  * 60 * 1000, 60 * 1000,  'Cache rebuilds'),
  ('NOTIFICATION_DISPATCH',      90 * 1000,      45 * 1000,  'Outbound notification fan-out'),
  ('NON_SENSITIVE_BULK_UPDATE',  10 * 60 * 1000, 2  * 60 * 1000, 'Bulk row updates'),
  ('UI_FIX',                     5  * 60 * 1000, 90 * 1000,  'UI patches'),
  ('CODE_PATCH',                 15 * 60 * 1000, 3  * 60 * 1000, 'Approval-gated code patches'),
  ('DEPLOYMENT',                 20 * 60 * 1000, 5  * 60 * 1000, 'Approval-gated deployments'),
  ('SCHEMA_MIGRATION',           20 * 60 * 1000, 5  * 60 * 1000, 'Approval-gated migrations')
ON CONFLICT (task_type) DO NOTHING;

-- Resolve defaults for an arbitrary task_type, falling back to '*'.
CREATE OR REPLACE FUNCTION system.resolve_task_verb_defaults(p_type TEXT)
RETURNS TABLE(max_duration_ms INTEGER, stuck_threshold_ms INTEGER)
LANGUAGE plpgsql
STABLE
AS $$
DECLARE
  v_norm TEXT := UPPER(BTRIM(COALESCE(p_type, '')));
BEGIN
  RETURN QUERY
    SELECT d.max_duration_ms, d.stuck_threshold_ms
      FROM system.task_verb_defaults d
     WHERE d.task_type = v_norm
     LIMIT 1;
  IF NOT FOUND THEN
    RETURN QUERY
      SELECT d.max_duration_ms, d.stuck_threshold_ms
        FROM system.task_verb_defaults d
       WHERE d.task_type = '*'
       LIMIT 1;
  END IF;
END;
$$;

-- Stamp stage_started_at + defaults on insert and on every status change.
CREATE OR REPLACE FUNCTION system.execution_tasks_stamp_watchdog_fields()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  v_def RECORD;
BEGIN
  IF TG_OP = 'INSERT' THEN
    IF NEW.max_duration_ms IS NULL OR NEW.stuck_threshold_ms IS NULL THEN
      SELECT * INTO v_def FROM system.resolve_task_verb_defaults(NEW.type);
      IF v_def.max_duration_ms IS NOT NULL THEN
        NEW.max_duration_ms := COALESCE(NEW.max_duration_ms, v_def.max_duration_ms);
        NEW.stuck_threshold_ms := COALESCE(NEW.stuck_threshold_ms, v_def.stuck_threshold_ms);
      END IF;
    END IF;
    NEW.stage_started_at := COALESCE(NEW.stage_started_at, now());
  ELSIF TG_OP = 'UPDATE' AND NEW.status IS DISTINCT FROM OLD.status THEN
    NEW.stage_started_at := now();
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_execution_tasks_stamp_watchdog ON system.execution_tasks;
CREATE TRIGGER trg_execution_tasks_stamp_watchdog
  BEFORE INSERT OR UPDATE ON system.execution_tasks
  FOR EACH ROW EXECUTE FUNCTION system.execution_tasks_stamp_watchdog_fields();

-- ── 2. Task dependency graph (explicit edges) ────────────────────────────
CREATE TABLE IF NOT EXISTS system.task_dependencies (
  task_id              UUID NOT NULL REFERENCES system.execution_tasks(id) ON DELETE CASCADE,
  depends_on_task_id   UUID NOT NULL REFERENCES system.execution_tasks(id) ON DELETE RESTRICT,
  created_at           TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (task_id, depends_on_task_id),
  CHECK (task_id <> depends_on_task_id)
);

CREATE INDEX IF NOT EXISTS idx_task_dependencies_depends_on
  ON system.task_dependencies (depends_on_task_id);

-- States that satisfy a "dependency is approved or post-approval" check.
-- A task may depend ONLY on tasks already in one of these states. Defined
-- before the DAG trigger because the trigger's body invokes it.
CREATE OR REPLACE FUNCTION system.dependency_state_is_acceptable(s system.execution_task_status)
RETURNS BOOLEAN
LANGUAGE sql IMMUTABLE
AS $$
  SELECT s IN ('approved','queued','running','succeeded','rolling_back','rolled_back')
$$;

-- Defense-in-depth: enforce the DAG invariant at the database boundary so a
-- direct service-role insert into `task_dependencies` cannot bypass the
-- client-side `validate_task_dependencies` check.
CREATE OR REPLACE FUNCTION system.task_dependencies_enforce_dag()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  v_dep_status system.execution_task_status;
  v_creates_cycle BOOLEAN;
BEGIN
  -- Note on incident logging: this trigger RAISES to abort the offending
  -- INSERT, which rolls back the surrounding transaction. Writing an
  -- incident here would be rolled back too. Persistent incident rows for
  -- dependency rejections are therefore written by the caller
  -- (`system.dispatch_execution_task_with_deps` and the TS dispatcher) in a
  -- separate transaction once they observe the abort.
  IF NEW.task_id = NEW.depends_on_task_id THEN
    RAISE EXCEPTION 'task_dependencies: self_dependency forbidden (task=%)', NEW.task_id
      USING ERRCODE = '23514';
  END IF;

  SELECT status INTO v_dep_status
    FROM system.execution_tasks
   WHERE id = NEW.depends_on_task_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'task_dependencies: dependency_unknown (depends_on=%)', NEW.depends_on_task_id
      USING ERRCODE = '23503';
  END IF;
  IF NOT system.dependency_state_is_acceptable(v_dep_status) THEN
    RAISE EXCEPTION 'task_dependencies: dependency_not_approved (depends_on=% status=%)',
      NEW.depends_on_task_id, v_dep_status
      USING ERRCODE = '23514';
  END IF;

  -- Cycle detection: walk forward from the new dependency through existing
  -- edges; if we reach NEW.task_id the resulting graph contains a cycle.
  WITH RECURSIVE walk(node) AS (
    SELECT NEW.depends_on_task_id
    UNION
    SELECT d.depends_on_task_id
      FROM system.task_dependencies d
      JOIN walk w ON d.task_id = w.node
  )
  SELECT EXISTS (SELECT 1 FROM walk WHERE node = NEW.task_id) INTO v_creates_cycle;
  IF v_creates_cycle THEN
    RAISE EXCEPTION 'task_dependencies: dependency_cycle (task=% depends_on=%)',
      NEW.task_id, NEW.depends_on_task_id
      USING ERRCODE = '23514';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_task_dependencies_enforce_dag ON system.task_dependencies;
CREATE TRIGGER trg_task_dependencies_enforce_dag
  BEFORE INSERT OR UPDATE ON system.task_dependencies
  FOR EACH ROW EXECUTE FUNCTION system.task_dependencies_enforce_dag();

ALTER TABLE system.task_dependencies ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS task_deps_admin_read ON system.task_dependencies;
CREATE POLICY task_deps_admin_read
  ON system.task_dependencies FOR SELECT
  USING (auth.uid() IS NULL OR public.has_role(auth.uid(), 'admin'::public.app_role));

DROP POLICY IF EXISTS task_deps_service_role_write ON system.task_dependencies;
CREATE POLICY task_deps_service_role_write
  ON system.task_dependencies FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

-- Validate a proposed dependency set:
--   * every dep_id exists
--   * every dep_id is in an acceptable state
--   * the resulting graph (existing + proposed) has no cycle
-- Returns ok=false with a structured reason on first violation.
CREATE OR REPLACE FUNCTION system.validate_task_dependencies(
  p_task_id   UUID,
  p_depends_on UUID[]
) RETURNS TABLE(ok BOOLEAN, reason TEXT, offending_id UUID)
LANGUAGE plpgsql
STABLE
SET search_path = public, system
AS $$
DECLARE
  v_dep UUID;
  v_status system.execution_task_status;
  v_visited UUID[] := ARRAY[]::UUID[];
BEGIN
  IF p_depends_on IS NULL OR array_length(p_depends_on, 1) IS NULL THEN
    RETURN QUERY SELECT TRUE, NULL::TEXT, NULL::UUID;
    RETURN;
  END IF;

  FOREACH v_dep IN ARRAY p_depends_on LOOP
    IF v_dep = p_task_id THEN
      RETURN QUERY SELECT FALSE, 'self_dependency'::TEXT, v_dep; RETURN;
    END IF;
    SELECT status INTO v_status FROM system.execution_tasks WHERE id = v_dep;
    IF NOT FOUND THEN
      RETURN QUERY SELECT FALSE, 'dependency_unknown'::TEXT, v_dep; RETURN;
    END IF;
    IF NOT system.dependency_state_is_acceptable(v_status) THEN
      RETURN QUERY SELECT FALSE, 'dependency_not_approved'::TEXT, v_dep; RETURN;
    END IF;
  END LOOP;

  -- Cycle detection: BFS from each proposed dep through existing edges back
  -- to p_task_id. If we reach p_task_id, the resulting graph has a cycle.
  FOREACH v_dep IN ARRAY p_depends_on LOOP
    IF EXISTS (
      WITH RECURSIVE walk(node) AS (
        SELECT v_dep
        UNION
        SELECT d.depends_on_task_id
          FROM system.task_dependencies d
          JOIN walk w ON d.task_id = w.node
      )
      SELECT 1 FROM walk WHERE node = p_task_id
    ) THEN
      RETURN QUERY SELECT FALSE, 'dependency_cycle'::TEXT, v_dep; RETURN;
    END IF;
  END LOOP;

  RETURN QUERY SELECT TRUE, NULL::TEXT, NULL::UUID;
END;
$$;

-- ── 3. Append-only incident log ──────────────────────────────────────────
CREATE TABLE IF NOT EXISTS system.incident_log (
  id                          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  kind                        TEXT NOT NULL,
  severity                    TEXT NOT NULL CHECK (severity IN ('info','warn','error','critical')),
  related_task_id             UUID REFERENCES system.execution_tasks(id) ON DELETE SET NULL,
  related_dependency_task_id  UUID REFERENCES system.execution_tasks(id) ON DELETE SET NULL,
  actor                       TEXT NOT NULL,
  evidence_json               JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at                  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_incident_log_created_at      ON system.incident_log (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_incident_log_kind            ON system.incident_log (kind);
CREATE INDEX IF NOT EXISTS idx_incident_log_related_task    ON system.incident_log (related_task_id);
CREATE INDEX IF NOT EXISTS idx_incident_log_severity_recent ON system.incident_log (severity, created_at DESC);

ALTER TABLE system.incident_log ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS incident_log_admin_read ON system.incident_log;
CREATE POLICY incident_log_admin_read
  ON system.incident_log FOR SELECT
  USING (auth.uid() IS NULL OR public.has_role(auth.uid(), 'admin'::public.app_role));

DROP POLICY IF EXISTS incident_log_service_role_insert ON system.incident_log;
CREATE POLICY incident_log_service_role_insert
  ON system.incident_log FOR INSERT
  WITH CHECK (auth.role() = 'service_role');

-- Hard-block UPDATE / DELETE — the log is immutable.
CREATE OR REPLACE FUNCTION system.incident_log_reject_mutation()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  RAISE EXCEPTION 'system.incident_log is append-only — % denied', TG_OP
    USING ERRCODE = '42501';
END;
$$;

DROP TRIGGER IF EXISTS trg_incident_log_no_update ON system.incident_log;
CREATE TRIGGER trg_incident_log_no_update
  BEFORE UPDATE ON system.incident_log
  FOR EACH ROW EXECUTE FUNCTION system.incident_log_reject_mutation();

DROP TRIGGER IF EXISTS trg_incident_log_no_delete ON system.incident_log;
CREATE TRIGGER trg_incident_log_no_delete
  BEFORE DELETE ON system.incident_log
  FOR EACH ROW EXECUTE FUNCTION system.incident_log_reject_mutation();

CREATE OR REPLACE FUNCTION system.write_incident(
  p_kind                        TEXT,
  p_severity                    TEXT,
  p_actor                       TEXT,
  p_related_task_id             UUID DEFAULT NULL,
  p_related_dependency_task_id  UUID DEFAULT NULL,
  p_evidence                    JSONB DEFAULT '{}'::jsonb
) RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, system
AS $$
DECLARE
  v_id           UUID;
  v_caller       UUID    := auth.uid();
  v_role         TEXT    := auth.role();
  v_is_service   BOOLEAN := (v_role = 'service_role');
  v_is_admin     BOOLEAN := (v_caller IS NOT NULL AND public.has_role(v_caller, 'admin'::public.app_role));
  v_safe_actor   TEXT;
BEGIN
  -- Audit-integrity gate (defense-in-depth, executed under SECURITY DEFINER):
  --   * service_role  → trusted, may set any actor verbatim
  --   * admin user    → trusted, but actor is forced to `admin:<uid>` so a
  --                     malicious admin cannot impersonate the watchdog
  --                     loop or another service component.
  --   * everyone else → rejected with 42501 (PostgREST returns 401/403).
  -- This preserves the immutable-audit guarantee even when EXECUTE is
  -- granted to authenticated (so the dispatcher's pre-validate path can
  -- log structured rejections from a user JWT).
  IF NOT v_is_service AND NOT v_is_admin THEN
    RAISE EXCEPTION 'system.write_incident: forbidden (service_role or admin required)'
      USING ERRCODE = '42501';
  END IF;

  v_safe_actor := CASE
    WHEN v_is_service THEN COALESCE(NULLIF(BTRIM(p_actor), ''), 'service')
    ELSE 'admin:' || COALESCE(v_caller::text, 'unknown')
  END;

  INSERT INTO system.incident_log (
    kind, severity, actor, related_task_id, related_dependency_task_id, evidence_json
  ) VALUES (
    p_kind, p_severity,
    v_safe_actor,
    p_related_task_id, p_related_dependency_task_id,
    COALESCE(p_evidence, '{}'::jsonb)
      || jsonb_build_object('caller_role', v_role, 'caller_uid', v_caller)
  )
  RETURNING id INTO v_id;
  RETURN v_id;
END;
$$;

-- ── 4. Stuck-task scan ───────────────────────────────────────────────────
-- Deterministic rules — same logic must be evaluable by tests.
--   timeout            → started_at + max_duration_ms < now() (status in active set)
--   stuck_no_heartbeat → running, last_heartbeat_at older than 2× stuck_threshold_ms (or never set + stage older)
--   stuck_no_progress  → in {picked_up='running' here, planning, queued} for > stuck_threshold_ms with no transition
--   lock_ttl_expired   → row references a lock that has passed its expires_at
CREATE OR REPLACE FUNCTION system.scan_stuck_tasks(p_limit INT DEFAULT 200)
RETURNS TABLE(
  task_id        UUID,
  task_type      TEXT,
  domain         TEXT,
  status         system.execution_task_status,
  attempt_count  INTEGER,
  max_attempts   INTEGER,
  rule           TEXT,
  evidence       JSONB
)
LANGUAGE sql
STABLE
SET search_path = public, system
AS $$
  WITH active AS (
    SELECT t.*
      FROM system.execution_tasks t
     WHERE t.status IN ('queued','running','pending_review','approved','rolling_back')
  ),
  -- 1. End-to-end timeout
  timeouts AS (
    SELECT a.id AS task_id, a.type, a.domain, a.status, a.attempt_count, a.max_attempts,
           'timeout'::TEXT AS rule,
           jsonb_build_object(
             'started_at', a.started_at,
             'max_duration_ms', a.max_duration_ms,
             'elapsed_ms', EXTRACT(EPOCH FROM (now() - COALESCE(a.started_at, a.created_at))) * 1000
           ) AS evidence
      FROM active a
     WHERE a.max_duration_ms IS NOT NULL
       AND a.status IN ('running', 'rolling_back') -- only active execution can transition to terminal failure here
       AND COALESCE(a.started_at, a.created_at) + (a.max_duration_ms || ' milliseconds')::interval < now()
  ),
  -- 2. Running tasks with no recent heartbeat
  no_heartbeat AS (
    SELECT a.id AS task_id, a.type, a.domain, a.status, a.attempt_count, a.max_attempts,
           'stuck_no_heartbeat'::TEXT AS rule,
           jsonb_build_object(
             'last_heartbeat_at', a.last_heartbeat_at,
             'stage_started_at', a.stage_started_at,
             'stuck_threshold_ms', a.stuck_threshold_ms
           ) AS evidence
      FROM active a
     WHERE a.status = 'running'
       AND a.stuck_threshold_ms IS NOT NULL
       AND COALESCE(a.last_heartbeat_at, a.stage_started_at) + ((a.stuck_threshold_ms * 2) || ' milliseconds')::interval < now()
       AND NOT EXISTS (SELECT 1 FROM timeouts WHERE timeouts.task_id = a.id)
  ),
  -- 3. Stages that never made progress
  no_progress AS (
    SELECT a.id AS task_id, a.type, a.domain, a.status, a.attempt_count, a.max_attempts,
           'stuck_no_progress'::TEXT AS rule,
           jsonb_build_object(
             'stage_started_at', a.stage_started_at,
             'stuck_threshold_ms', a.stuck_threshold_ms
           ) AS evidence
      FROM active a
     WHERE a.status IN ('queued','approved','running','rolling_back')
       AND a.stuck_threshold_ms IS NOT NULL
       AND a.stage_started_at IS NOT NULL
       AND a.stage_started_at + ((a.stuck_threshold_ms * 3) || ' milliseconds')::interval < now()
       AND NOT EXISTS (SELECT 1 FROM timeouts WHERE timeouts.task_id = a.id)
       AND NOT EXISTS (SELECT 1 FROM no_heartbeat WHERE no_heartbeat.task_id = a.id)
  ),
  -- 4. Orphan: in-flight (`running`) row with no owning worker / no lock.
  --    Detects rows that lost their executor (worker crash before
  --    heartbeat/lock release). Distinct from `no_heartbeat` because it
  --    fires immediately rather than waiting for the heartbeat window.
  orphan_running AS (
    SELECT a.id AS task_id, a.type, a.domain, a.status, a.attempt_count, a.max_attempts,
           'orphan_no_owner'::TEXT AS rule,
           jsonb_build_object(
             'lock_key', a.lock_key,
             'locked_by', a.locked_by,
             'started_at', a.started_at
           ) AS evidence
      FROM active a
     WHERE a.status = 'running'
       AND (a.lock_key IS NULL OR a.locked_by IS NULL)
       AND COALESCE(a.started_at, a.stage_started_at, a.created_at) + INTERVAL '30 seconds' < now()
       AND NOT EXISTS (SELECT 1 FROM timeouts    WHERE timeouts.task_id    = a.id)
       AND NOT EXISTS (SELECT 1 FROM no_heartbeat WHERE no_heartbeat.task_id = a.id)
       AND NOT EXISTS (SELECT 1 FROM no_progress  WHERE no_progress.task_id  = a.id)
  ),
  -- 5. Locks held past TTL with the underlying task still active
  lock_expired AS (
    SELECT a.id AS task_id, a.type, a.domain, a.status, a.attempt_count, a.max_attempts,
           'lock_ttl_expired'::TEXT AS rule,
           jsonb_build_object(
             'lock_key', l.lock_key,
             'expires_at', l.expires_at
           ) AS evidence
      FROM active a
      JOIN system.execution_locks l
        ON l.lock_key = a.lock_key
     WHERE a.lock_key IS NOT NULL
       AND l.expires_at < now()
       AND NOT EXISTS (SELECT 1 FROM timeouts    WHERE timeouts.task_id    = a.id)
       AND NOT EXISTS (SELECT 1 FROM no_heartbeat WHERE no_heartbeat.task_id = a.id)
       AND NOT EXISTS (SELECT 1 FROM no_progress  WHERE no_progress.task_id  = a.id)
  )
  SELECT * FROM timeouts
  UNION ALL SELECT * FROM no_heartbeat
  UNION ALL SELECT * FROM no_progress
  UNION ALL SELECT * FROM orphan_running
  UNION ALL SELECT * FROM lock_expired
  LIMIT p_limit;
$$;

-- ── 5. Watchdog reconcilers ──────────────────────────────────────────────
-- Auto-fail with structured reason; release locks; write incident.
CREATE OR REPLACE FUNCTION system.watchdog_fail_task(
  p_task_id        UUID,
  p_failure_class  TEXT,
  p_reason         TEXT,
  p_evidence       JSONB DEFAULT '{}'::jsonb
) RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, system
AS $$
DECLARE
  v_row    system.execution_tasks;
  v_target system.execution_task_status;
  v_action TEXT;
BEGIN
  SELECT * INTO v_row FROM system.execution_tasks WHERE id = p_task_id FOR UPDATE;
  IF NOT FOUND THEN RETURN FALSE; END IF;

  -- Pick the only legal terminal transition for the task's current status.
  -- The `assert_task_transition` matrix forbids queued/approved/pending_review
  -- → failed, so for those states we route through `cancelled` instead. This
  -- keeps the watchdog deterministic and never raises an illegal-transition
  -- exception.
  v_target := CASE v_row.status
    WHEN 'running'        THEN 'failed'::system.execution_task_status
    WHEN 'rolling_back'   THEN 'failed'::system.execution_task_status
    WHEN 'queued'         THEN 'cancelled'::system.execution_task_status
    WHEN 'approved'       THEN 'cancelled'::system.execution_task_status
    WHEN 'pending_review' THEN 'cancelled'::system.execution_task_status
    WHEN 'blocked'        THEN 'cancelled'::system.execution_task_status
    ELSE NULL
  END;
  IF v_target IS NULL THEN
    -- Already terminal (succeeded/failed/cancelled/rejected/rolled_back/draft)
    RETURN FALSE;
  END IF;
  v_action := CASE v_target WHEN 'failed' THEN 'watchdog_auto_fail' ELSE 'watchdog_auto_cancel' END;

  -- Release any owned lock so the next attempt (or operator) is unblocked.
  IF v_row.lock_key IS NOT NULL THEN
    DELETE FROM system.execution_locks WHERE lock_key = v_row.lock_key;
  END IF;

  UPDATE system.execution_tasks
     SET status              = v_target,
         failed_at           = CASE WHEN v_target = 'failed' THEN now() ELSE failed_at END,
         failure_class       = p_failure_class,
         error_code          = COALESCE(p_reason, p_failure_class),
         watchdog_intervened = TRUE,
         lock_key            = NULL,
         locked_by           = NULL,
         next_retry_at       = NULL
   WHERE id = p_task_id;

  PERFORM system.write_incident(
    v_action, 'error', 'watchdog-loop',
    p_task_id, NULL,
    jsonb_build_object(
      'failure_class', p_failure_class,
      'reason', p_reason,
      'evidence', p_evidence,
      'previous_status', v_row.status,
      'new_status', v_target
    )
  );
  RETURN TRUE;
END;
$$;

-- Release lock + re-queue if retry budget remains; otherwise auto-fail.
CREATE OR REPLACE FUNCTION system.watchdog_recover_task(
  p_task_id   UUID,
  p_reason    TEXT,
  p_evidence  JSONB DEFAULT '{}'::jsonb
) RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, system
AS $$
DECLARE
  v_row system.execution_tasks;
BEGIN
  SELECT * INTO v_row FROM system.execution_tasks WHERE id = p_task_id FOR UPDATE;
  IF NOT FOUND THEN RETURN 'not_found'; END IF;

  IF v_row.lock_key IS NOT NULL THEN
    DELETE FROM system.execution_locks WHERE lock_key = v_row.lock_key;
  END IF;

  -- Spec contract: retry-budget exhaustion ALWAYS lands on `failed`,
  -- never `cancelled`. For non-running statuses we bridge through
  -- `running` (a legal forward transition for queued/approved) so the
  -- subsequent watchdog_fail_task() routes to `failed`. pending_review
  -- is intentionally left as `cancelled` because it represents
  -- human-in-the-loop work that the watchdog must not mark failed.
  IF COALESCE(v_row.attempt_count, 0) < COALESCE(v_row.max_attempts, 3) THEN
    -- Increment attempt_count BEFORE the requeue so the retry budget actually
    -- decays. Reset stage_started_at explicitly: the BEFORE UPDATE trigger
    -- only resets it on a status change, but recovery from `queued`→`queued`
    -- would otherwise leave the timer behind and re-trigger the same stuck
    -- rule next tick (infinite-recovery loop).
    UPDATE system.execution_tasks
       SET status              = 'queued',
           attempt_count       = COALESCE(attempt_count, 0) + 1,
           stage_started_at    = now(),
           lock_key            = NULL,
           locked_by           = NULL,
           last_heartbeat_at   = NULL,
           watchdog_intervened = TRUE
     WHERE id = p_task_id;
    PERFORM system.write_incident(
      'watchdog_auto_recover', 'warn', 'watchdog-loop',
      p_task_id, NULL,
      jsonb_build_object('reason', p_reason, 'evidence', p_evidence,
                         'previous_status', v_row.status,
                         'attempt_count', COALESCE(v_row.attempt_count, 0) + 1,
                         'max_attempts', COALESCE(v_row.max_attempts, 3))
    );
    RETURN 'requeued';
  END IF;

  -- Bridge non-running active statuses to `running` so the failure path
  -- routes deterministically to `failed`. We bypass the transition matrix
  -- on purpose here — this IS the safety compensation, and the prior
  -- attempt_count check guarantees we will never loop.
  IF v_row.status IN ('queued','approved') THEN
    UPDATE system.execution_tasks
       SET status     = 'running',
           started_at = COALESCE(started_at, now())
     WHERE id = p_task_id;
  END IF;

  PERFORM system.watchdog_fail_task(p_task_id, 'retry_budget_exhausted', p_reason, p_evidence);
  RETURN 'failed';
END;
$$;

-- One-shot reconciliation tick — invoked by the watchdog edge function.
-- Returns a small summary so the caller can log it.
CREATE OR REPLACE FUNCTION system.watchdog_tick(p_limit INT DEFAULT 200)
RETURNS TABLE(out_action TEXT, out_task_id UUID, out_rule TEXT)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, system
AS $$
DECLARE
  r RECORD;
  v_outcome TEXT;
  v_lock_key BIGINT := hashtextextended('system.watchdog_tick.singleton', 0);
BEGIN
  -- Single-claimer / anti-stampede: a transaction-scoped advisory lock
  -- ensures at most one tick reconciles candidates at any moment, even
  -- under concurrent invocations from cron + manual + edge-function. The
  -- lock is released automatically at COMMIT/ROLLBACK so a crashing tick
  -- never poisons the next one (idempotent across restart). When the
  -- lock can't be acquired, we return a single sentinel row so callers
  -- can observe the skip without thinking the system is silent.
  IF NOT pg_try_advisory_xact_lock(v_lock_key) THEN
    out_action  := 'skipped_concurrent';
    out_task_id := NULL;
    out_rule    := NULL;
    RETURN NEXT;
    RETURN;
  END IF;

  FOR r IN SELECT * FROM system.scan_stuck_tasks(p_limit) LOOP
    IF r.rule = 'timeout' THEN
      IF system.watchdog_fail_task(r.task_id, 'timeout', 'task exceeded max_duration_ms', r.evidence) THEN
        out_action  := 'failed_timeout';
        out_task_id := r.task_id;
        out_rule    := r.rule;
        RETURN NEXT;
      END IF;
    ELSE
      v_outcome := system.watchdog_recover_task(r.task_id, r.rule, r.evidence);
      out_action  := CASE v_outcome WHEN 'requeued' THEN 'recovered' ELSE 'failed_recover' END;
      out_task_id := r.task_id;
      out_rule    := r.rule;
      RETURN NEXT;
    END IF;
  END LOOP;
  RETURN;
END;
$$;

-- ── 6. Heartbeat helper for adapters ─────────────────────────────────────
CREATE OR REPLACE FUNCTION system.task_heartbeat(p_task_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, system
AS $$
BEGIN
  UPDATE system.execution_tasks
     SET last_heartbeat_at = now()
   WHERE id = p_task_id
     AND status IN ('queued','running','rolling_back');
  RETURN FOUND;
END;
$$;

-- ── 6b. Admin manual overrides (super-admin only) ────────────────────────
-- Force-release a stuck lock without changing the task status. Audited via
-- incident_log so the action is visible alongside watchdog activity.
CREATE OR REPLACE FUNCTION system.admin_release_task_lock(
  p_task_id UUID,
  p_reason  TEXT DEFAULT 'manual override'
) RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, system
AS $$
DECLARE v_row system.execution_tasks; v_actor TEXT;
BEGIN
  IF auth.uid() IS NULL OR NOT public.has_role(auth.uid(), 'admin'::public.app_role) THEN
    RAISE EXCEPTION 'admin_release_task_lock: forbidden' USING ERRCODE = '42501';
  END IF;
  v_actor := COALESCE(auth.uid()::text, 'unknown');
  SELECT * INTO v_row FROM system.execution_tasks WHERE id = p_task_id FOR UPDATE;
  IF NOT FOUND THEN RETURN FALSE; END IF;
  IF v_row.lock_key IS NULL THEN RETURN FALSE; END IF;

  DELETE FROM system.execution_locks WHERE lock_key = v_row.lock_key;
  UPDATE system.execution_tasks
     SET lock_key = NULL, locked_by = NULL, watchdog_intervened = TRUE
   WHERE id = p_task_id;

  PERFORM system.write_incident(
    'admin_release_lock', 'warn', 'admin:' || v_actor,
    p_task_id, NULL,
    jsonb_build_object('reason', p_reason, 'released_lock_key', v_row.lock_key,
                       'previous_status', v_row.status)
  );
  RETURN TRUE;
END;
$$;

-- Force-fail (or auto-cancel for pre-execution states) a task. Routes through
-- the same watchdog_fail_task path so the state-machine matrix is honoured.
CREATE OR REPLACE FUNCTION system.admin_force_fail_task(
  p_task_id UUID,
  p_reason  TEXT DEFAULT 'manual override'
) RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, system
AS $$
DECLARE v_actor TEXT; v_ok BOOLEAN;
BEGIN
  IF auth.uid() IS NULL OR NOT public.has_role(auth.uid(), 'admin'::public.app_role) THEN
    RAISE EXCEPTION 'admin_force_fail_task: forbidden' USING ERRCODE = '42501';
  END IF;
  v_actor := COALESCE(auth.uid()::text, 'unknown');
  v_ok := system.watchdog_fail_task(p_task_id, 'manual_override', p_reason,
                                    jsonb_build_object('actor', v_actor));
  PERFORM system.write_incident(
    'admin_force_fail', 'warn', 'admin:' || v_actor,
    p_task_id, NULL,
    jsonb_build_object('reason', p_reason, 'applied', v_ok)
  );
  RETURN v_ok;
END;
$$;

-- ── 6c. Watchdog loop health view ────────────────────────────────────────
-- Surfaces the last tick (latency, error?) directly from engine_run_logs so
-- the admin page can show "is the watchdog actually running?" without
-- depending on the cron infrastructure schema.
CREATE OR REPLACE VIEW system.watchdog_loop_health AS
  SELECT
    id,
    started_at,
    finished_at,
    EXTRACT(EPOCH FROM (now() - started_at)) * 1000 AS age_ms,
    status,
    effect_summary,
    error_message
    FROM public.engine_run_logs
   WHERE engine_name = 'watchdog-loop'
   ORDER BY started_at DESC
   LIMIT 50;
GRANT SELECT ON system.watchdog_loop_health TO authenticated, service_role;

-- Cron-friendly wrapper: runs `watchdog_tick` AND writes a row into
-- `engine_run_logs` so `watchdog_loop_health` (and the admin card it
-- powers) stays accurate regardless of whether the tick was driven by
-- pg_cron directly or by the `watchdog-loop` edge function.
CREATE OR REPLACE FUNCTION system.watchdog_tick_with_log(p_limit INT DEFAULT 200)
RETURNS INT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, system
AS $$
DECLARE
  v_started TIMESTAMPTZ := clock_timestamp();
  v_count   INT := 0;
  v_summary TEXT;
  v_counts  JSONB := '{}'::jsonb;
  r RECORD;
BEGIN
  FOR r IN SELECT * FROM system.watchdog_tick(p_limit) LOOP
    v_count := v_count + 1;
    v_counts := jsonb_set(
      v_counts,
      ARRAY[r.out_action || ':' || r.out_rule],
      to_jsonb(COALESCE((v_counts ->> (r.out_action || ':' || r.out_rule))::INT, 0) + 1),
      true
    );
  END LOOP;
  v_summary := CASE WHEN v_count = 0
    THEN format('tick: no stuck tasks (limit=%s)', p_limit)
    ELSE format('tick: %s actions taken — %s', v_count, v_counts::TEXT)
  END;
  INSERT INTO public.engine_run_logs (
    engine_name, category, started_at, finished_at, duration_ms,
    status, effect_summary, db_rows_affected, metadata_json, trigger_source
  ) VALUES (
    'watchdog-loop', 'execution-layer', v_started, clock_timestamp(),
    EXTRACT(MILLISECONDS FROM clock_timestamp() - v_started)::INT,
    'ok', v_summary, v_count,
    jsonb_build_object('tickCount', v_count, 'counts', v_counts, 'limit', p_limit),
    'pg_cron'
  );
  RETURN v_count;
EXCEPTION WHEN OTHERS THEN
  INSERT INTO public.engine_run_logs (
    engine_name, category, started_at, finished_at, duration_ms,
    status, effect_summary, error_message, metadata_json, trigger_source
  ) VALUES (
    'watchdog-loop', 'execution-layer', v_started, clock_timestamp(),
    EXTRACT(MILLISECONDS FROM clock_timestamp() - v_started)::INT,
    'error', 'watchdog-loop crashed', SQLERRM,
    jsonb_build_object('limit', p_limit, 'sqlstate', SQLSTATE),
    'pg_cron'
  );
  RAISE;
END;
$$;

-- ── 6d. Schedule: run watchdog_tick every minute (idempotent) ────────────
DO $cron_wd$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_extension WHERE extname = 'pg_cron'
  ) THEN
    BEGIN
      PERFORM cron.unschedule('system-watchdog-tick');
    EXCEPTION WHEN OTHERS THEN NULL;
    END;
    PERFORM cron.schedule(
      'system-watchdog-tick',
      '* * * * *',
      $wd$SELECT system.watchdog_tick_with_log(200)$wd$
    );
  END IF;
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'system-watchdog-tick schedule failed: %', SQLERRM;
END;
$cron_wd$;
-- ── 7. Grants ─────────────────────────────────────────────────────────────
GRANT EXECUTE ON FUNCTION system.resolve_task_verb_defaults(TEXT)                                  TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION system.validate_task_dependencies(UUID, UUID[])                          TO authenticated, service_role;
-- write_incident is granted to authenticated as well so the dispatcher's
-- pre-insert dependency-rejection path (called from the app supabase
-- client under an admin user JWT) can persist a structured audit row.
-- The function is SECURITY DEFINER, so the actual INSERT into
-- system.incident_log runs as the function owner; the auth role merely
-- gates EXECUTE. incident_log itself is append-only (UPDATE/DELETE
-- triggers raise insufficient_privilege), so the worst a malicious
-- authenticated caller can do is add a row — the same surface they
-- already have via hundreds of other audit-write paths.
GRANT EXECUTE ON FUNCTION system.write_incident(TEXT, TEXT, TEXT, UUID, UUID, JSONB)               TO service_role, authenticated;
GRANT EXECUTE ON FUNCTION system.scan_stuck_tasks(INT)                                             TO service_role, authenticated;
GRANT EXECUTE ON FUNCTION system.watchdog_fail_task(UUID, TEXT, TEXT, JSONB)                       TO service_role;
GRANT EXECUTE ON FUNCTION system.watchdog_recover_task(UUID, TEXT, JSONB)                          TO service_role;
GRANT EXECUTE ON FUNCTION system.watchdog_tick(INT)                                                TO service_role;
GRANT EXECUTE ON FUNCTION system.watchdog_tick_with_log(INT)                                       TO service_role;
GRANT EXECUTE ON FUNCTION system.task_heartbeat(UUID)                                              TO service_role;
GRANT EXECUTE ON FUNCTION system.admin_release_task_lock(UUID, TEXT)                               TO authenticated;
GRANT EXECUTE ON FUNCTION system.admin_force_fail_task(UUID, TEXT)                                 TO authenticated;
GRANT SELECT ON system.incident_log         TO authenticated;
GRANT SELECT ON system.task_dependencies    TO authenticated;
GRANT SELECT ON system.task_verb_defaults   TO authenticated;

COMMIT;
