-- Goal Engine Phase 3 — feedback loop + dispatch contract hardening (#820)
--
-- Implements four user-requested hardening steps:
--   (1) Move goal_id and runner into the canonical dispatch_execution_task
--       contract so callers stop post-RPC patching.
--   (2) Add system.goal_iterations + helper RPC to score outcomes.
--   (3) Add system.learning_memory scaffold (read-side ready for Phase 4
--       planner integration; write side is intentionally minimal until the
--       feedback loop generates real signal).
--   (4) Reserve mode='plan'|'execute' on system.goals so a future planner
--       can produce a plan without dispatching, with explicit promotion to
--       execute. Default 'execute' preserves current behaviour.
--
-- Single source of truth invariant: dispatch_execution_task remains the ONLY
-- creation path. We extend its signature instead of bypassing it.

------------------------------------------------------------------------------
-- 1. Extend system.goals with mode (PLAN vs EXECUTE) — Phase 5 scaffold.
------------------------------------------------------------------------------
ALTER TABLE system.goals
  ADD COLUMN IF NOT EXISTS mode TEXT NOT NULL DEFAULT 'execute'
    CHECK (mode IN ('plan','execute'));

COMMENT ON COLUMN system.goals.mode IS
  'plan = planner generates plan but goal-planner skips dispatch; '
  'execute = planner dispatches all steps. Reserved for higher-risk goals '
  'that must be human-approved between planning and execution.';

------------------------------------------------------------------------------
-- 2. Extend dispatch_execution_task: add p_goal_id UUID + p_runner TEXT.
--    DROP + recreate with new signature (Postgres requires it for arg list
--    changes). Existing callers that omit the new params get the defaults
--    (NULL goal_id, runner='internal' via the column default).
------------------------------------------------------------------------------
DROP FUNCTION IF EXISTS system.dispatch_execution_task(
  TEXT, TEXT, system.execution_task_risk, system.execution_task_status,
  JSONB, TEXT, UUID, INT, TEXT, TEXT, TEXT,
  UUID, TEXT, TEXT, TEXT, TEXT, BOOLEAN, JSONB
);

CREATE OR REPLACE FUNCTION system.dispatch_execution_task(
  p_type              TEXT,
  p_domain            TEXT,
  p_risk_level        system.execution_task_risk,
  p_status            system.execution_task_status,
  p_payload           JSONB DEFAULT '{}'::jsonb,
  p_requested_by      TEXT  DEFAULT 'system',
  p_parent_task_id    UUID  DEFAULT NULL,
  p_max_attempts      INT   DEFAULT 3,
  p_approved_by       TEXT  DEFAULT NULL,
  p_blocked_reason    TEXT  DEFAULT NULL,
  p_idempotency_key   TEXT  DEFAULT NULL,
  p_root_task_id      UUID  DEFAULT NULL,
  p_correlation_id    TEXT  DEFAULT NULL,
  p_entity_type       TEXT  DEFAULT NULL,
  p_entity_id         TEXT  DEFAULT NULL,
  p_approval_policy   TEXT  DEFAULT 'none',
  p_requires_approval BOOLEAN DEFAULT FALSE,
  p_retry_policy      JSONB DEFAULT NULL,
  p_goal_id           UUID  DEFAULT NULL,
  p_runner            TEXT  DEFAULT NULL
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
  v_policy       TEXT := COALESCE(NULLIF(BTRIM(p_approval_policy), ''), 'none');
  v_runner       TEXT := COALESCE(NULLIF(BTRIM(p_runner), ''), 'internal');
  v_agent_id     UUID;
  v_agent_ver    UUID;
  v_agent_slug   TEXT;
  v_agent_status TEXT;
  v_strict       BOOLEAN := FALSE;
BEGIN
  IF v_caller IS NOT NULL THEN
    IF NOT public.has_role(v_caller, 'admin'::public.app_role) THEN
      RAISE EXCEPTION 'execution_tasks dispatch denied: caller % is not an admin', v_caller
        USING ERRCODE = '42501';
    END IF;
  END IF;

  IF v_runner NOT IN ('internal','github') THEN
    RAISE EXCEPTION 'execution_tasks dispatch denied: invalid runner %', v_runner
      USING ERRCODE = '22023';
  END IF;

  IF p_idempotency_key IS NOT NULL AND BTRIM(p_idempotency_key) <> '' THEN
    SELECT * INTO v_existing
      FROM system.execution_tasks
     WHERE idempotency_key = p_idempotency_key
       AND status IN ('pending_review','approved','queued','running','blocked','failed')
     LIMIT 1;
    IF FOUND THEN RETURN v_existing; END IF;
  END IF;

  IF v_status NOT IN ('draft','pending_review','approved','queued','blocked') THEN
    RAISE EXCEPTION 'execution_tasks dispatch denied: status % not allowed at creation', v_status
      USING ERRCODE = '22023';
  END IF;

  v_server_risk := system.classify_task_risk(v_normalized_t);
  IF v_server_risk <> p_risk_level THEN
    v_blocked_rsn := COALESCE(v_blocked_rsn, '') ||
      CASE WHEN COALESCE(v_blocked_rsn,'') = '' THEN '' ELSE ' | ' END ||
      format('RISK_MISMATCH: client=%s server=%s', p_risk_level, v_server_risk);
  END IF;

  IF v_server_risk = 'CRITICAL' THEN
    v_status := 'blocked';
    v_approved_by := NULL;
    v_blocked_rsn := COALESCE(v_blocked_rsn, '') ||
      CASE WHEN COALESCE(v_blocked_rsn,'') = '' THEN '' ELSE ' | ' END ||
      'PHASE1_CRITICAL_FORBIDDEN: CRITICAL task types cannot execute in phase 1';
  END IF;

  IF p_requires_approval AND v_status = 'queued' AND v_server_risk <> 'CRITICAL' THEN
    v_status := 'pending_review';
  END IF;

  -- ── Agent resolution ──
  SELECT r.agent_id, r.agent_version_id, r.agent_slug, r.agent_status
    INTO v_agent_id, v_agent_ver, v_agent_slug, v_agent_status
    FROM system.resolve_capability(p_domain, v_normalized_t) r;

  BEGIN
    v_strict := COALESCE(current_setting('system.agent_strict_routing', TRUE), 'on') <> 'off';
  EXCEPTION WHEN OTHERS THEN v_strict := TRUE; END;

  IF v_agent_id IS NULL AND v_strict THEN
    v_status := 'blocked';
    v_blocked_rsn := COALESCE(v_blocked_rsn, '') ||
      CASE WHEN COALESCE(v_blocked_rsn,'') = '' THEN '' ELSE ' | ' END ||
      format('AGENT_NOT_REGISTERED: no capability for (%s, %s)', p_domain, v_normalized_t);
  END IF;

  IF v_agent_id IS NOT NULL AND v_agent_status = 'disabled' THEN
    v_status := 'blocked';
    v_blocked_rsn := COALESCE(v_blocked_rsn, '') ||
      CASE WHEN COALESCE(v_blocked_rsn,'') = '' THEN '' ELSE ' | ' END ||
      format('AGENT_DISABLED: agent %s is disabled', v_agent_slug);
  END IF;

  IF v_approved_by IS NOT NULL THEN v_approved_at := now(); END IF;

  INSERT INTO system.execution_tasks (
    type, domain, risk_level, status, payload, requested_by,
    parent_task_id, attempt_count, max_attempts, blocked_reason,
    approved_by, approved_at, idempotency_key,
    root_task_id, correlation_id, entity_type, entity_id,
    approval_policy, requires_approval, retry_policy,
    agent_id, agent_version_id,
    goal_id, runner
  ) VALUES (
    v_normalized_t, p_domain, v_server_risk, v_status,
    COALESCE(p_payload, '{}'::jsonb),
    COALESCE(NULLIF(BTRIM(p_requested_by), ''), 'system'),
    p_parent_task_id, 0, COALESCE(p_max_attempts, 3), v_blocked_rsn,
    v_approved_by, v_approved_at,
    NULLIF(BTRIM(p_idempotency_key), ''),
    p_root_task_id,
    NULLIF(BTRIM(p_correlation_id), ''),
    NULLIF(BTRIM(p_entity_type), ''),
    NULLIF(BTRIM(p_entity_id), ''),
    v_policy,
    COALESCE(p_requires_approval, FALSE),
    p_retry_policy,
    v_agent_id, v_agent_ver,
    p_goal_id, v_runner
  )
  RETURNING * INTO v_row;

  RETURN v_row;
EXCEPTION
  WHEN unique_violation THEN
    IF p_idempotency_key IS NOT NULL THEN
      SELECT * INTO v_existing
        FROM system.execution_tasks
       WHERE idempotency_key = p_idempotency_key
         AND status IN ('pending_review','approved','queued','running','blocked','failed')
       LIMIT 1;
      IF FOUND THEN RETURN v_existing; END IF;
    END IF;
    RAISE;
END;
$$;

REVOKE ALL ON FUNCTION system.dispatch_execution_task(
  TEXT, TEXT, system.execution_task_risk, system.execution_task_status,
  JSONB, TEXT, UUID, INT, TEXT, TEXT, TEXT,
  UUID, TEXT, TEXT, TEXT, TEXT, BOOLEAN, JSONB,
  UUID, TEXT
) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION system.dispatch_execution_task(
  TEXT, TEXT, system.execution_task_risk, system.execution_task_status,
  JSONB, TEXT, UUID, INT, TEXT, TEXT, TEXT,
  UUID, TEXT, TEXT, TEXT, TEXT, BOOLEAN, JSONB,
  UUID, TEXT
) TO authenticated, service_role;

------------------------------------------------------------------------------
-- 3. system.goal_iterations — Phase 3 feedback loop.
------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS system.goal_iterations (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  goal_id           UUID NOT NULL REFERENCES system.goals(id) ON DELETE CASCADE,
  iteration_number  INT  NOT NULL,
  task_ids          UUID[] NOT NULL DEFAULT ARRAY[]::UUID[],
  plan              JSONB NOT NULL DEFAULT '[]'::jsonb,
  plan_source       TEXT,             -- 'ai' | 'fallback'
  plan_provider     TEXT,             -- 'openai' | 'anthropic' | NULL
  outcome           TEXT NOT NULL DEFAULT 'pending'
                     CHECK (outcome IN ('pending','succeeded','partial','failed')),
  score             NUMERIC(4,3),     -- 0.000 .. 1.000 (succeeded / total)
  summary           TEXT,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at      TIMESTAMPTZ,
  UNIQUE (goal_id, iteration_number)
);

CREATE INDEX IF NOT EXISTS idx_goal_iterations_goal_created
  ON system.goal_iterations (goal_id, created_at DESC);

ALTER TABLE system.goal_iterations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS goal_iterations_select_own_or_admin ON system.goal_iterations;
CREATE POLICY goal_iterations_select_own_or_admin ON system.goal_iterations
  FOR SELECT TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin'::public.app_role)
    OR EXISTS (
      SELECT 1 FROM system.goals g
       WHERE g.id = goal_iterations.goal_id
         AND g.created_by = auth.uid()
    )
  );

-- Writes go through goal-planner / compute_goal_iteration_outcome (service role).
GRANT SELECT ON system.goal_iterations TO authenticated;
GRANT ALL ON system.goal_iterations TO service_role;

-- Helper: assign next iteration_number atomically.
CREATE OR REPLACE FUNCTION system.next_goal_iteration_number(p_goal_id UUID)
RETURNS INT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, system
AS $$
DECLARE v_n INT;
BEGIN
  SELECT COALESCE(MAX(iteration_number), 0) + 1 INTO v_n
    FROM system.goal_iterations
   WHERE goal_id = p_goal_id;
  RETURN v_n;
END$$;

REVOKE ALL ON FUNCTION system.next_goal_iteration_number(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION system.next_goal_iteration_number(UUID)
  TO authenticated, service_role;

-- Compute / refresh outcome of an iteration based on its task_ids' final status.
-- terminal statuses = succeeded / failed / blocked / cancelled / rolled_back.
-- outcome = 'pending'   if any task is non-terminal
--         | 'succeeded' if every task is succeeded
--         | 'failed'    if zero tasks are succeeded and at least one terminal
--         | 'partial'   otherwise (mixed terminal results)
-- score = succeeded_count / total (NULL if total = 0).
CREATE OR REPLACE FUNCTION system.compute_goal_iteration_outcome(p_iteration_id UUID)
RETURNS system.goal_iterations
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, system
AS $$
DECLARE
  v_iter      system.goal_iterations;
  v_total     INT := 0;
  v_done      INT := 0;
  v_succeeded INT := 0;
  v_outcome   TEXT;
  v_score     NUMERIC(4,3);
  v_complete  TIMESTAMPTZ;
BEGIN
  SELECT * INTO v_iter FROM system.goal_iterations WHERE id = p_iteration_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'iteration % not found', p_iteration_id USING ERRCODE = 'P0002';
  END IF;

  v_total := COALESCE(array_length(v_iter.task_ids, 1), 0);
  IF v_total = 0 THEN
    UPDATE system.goal_iterations
       SET outcome = 'pending', score = NULL, completed_at = NULL
     WHERE id = p_iteration_id
     RETURNING * INTO v_iter;
    RETURN v_iter;
  END IF;

  SELECT
    COUNT(*) FILTER (WHERE status IN ('succeeded','failed','blocked','cancelled','rolled_back')),
    COUNT(*) FILTER (WHERE status = 'succeeded')
  INTO v_done, v_succeeded
  FROM system.execution_tasks
  WHERE id = ANY(v_iter.task_ids);

  IF v_done < v_total THEN
    v_outcome := 'pending';
    v_score   := NULL;
    v_complete := NULL;
  ELSIF v_succeeded = v_total THEN
    v_outcome := 'succeeded';
    v_score   := 1.000;
    v_complete := now();
  ELSIF v_succeeded = 0 THEN
    v_outcome := 'failed';
    v_score   := 0.000;
    v_complete := now();
  ELSE
    v_outcome := 'partial';
    v_score   := ROUND(v_succeeded::numeric / v_total::numeric, 3);
    v_complete := now();
  END IF;

  UPDATE system.goal_iterations
     SET outcome      = v_outcome,
         score        = v_score,
         completed_at = v_complete
   WHERE id = p_iteration_id
   RETURNING * INTO v_iter;

  RETURN v_iter;
END$$;

REVOKE ALL ON FUNCTION system.compute_goal_iteration_outcome(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION system.compute_goal_iteration_outcome(UUID)
  TO authenticated, service_role;

-- Convenience: refresh every still-pending iteration of a goal.
CREATE OR REPLACE FUNCTION system.refresh_goal_iterations(p_goal_id UUID)
RETURNS INT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, system
AS $$
DECLARE v_id UUID; v_count INT := 0;
BEGIN
  FOR v_id IN
    SELECT id FROM system.goal_iterations
     WHERE goal_id = p_goal_id AND outcome = 'pending'
  LOOP
    PERFORM system.compute_goal_iteration_outcome(v_id);
    v_count := v_count + 1;
  END LOOP;
  RETURN v_count;
END$$;

REVOKE ALL ON FUNCTION system.refresh_goal_iterations(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION system.refresh_goal_iterations(UUID)
  TO authenticated, service_role;

------------------------------------------------------------------------------
-- 4. system.learning_memory — Phase 4 scaffold.
--    Read side is enabled now so the planner can start querying. Writes are
--    intentionally minimal: a single INSERT happens from the iteration outcome
--    helper when a step type "wins" (succeeded) or "loses" (failed). Real
--    pattern mining is a Phase 4 follow-up.
------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS system.learning_memory (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pattern       TEXT NOT NULL,                          -- e.g. "github-runner/SMOKE_NOOP"
  context       JSONB NOT NULL DEFAULT '{}'::jsonb,     -- { goal_title_keywords, domain, type, ... }
  attempts      INT  NOT NULL DEFAULT 0,
  successes     INT  NOT NULL DEFAULT 0,
  success_rate  NUMERIC(4,3),
  last_used_at  TIMESTAMPTZ,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (pattern)
);

CREATE INDEX IF NOT EXISTS idx_learning_memory_last_used
  ON system.learning_memory (last_used_at DESC NULLS LAST);

ALTER TABLE system.learning_memory ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS learning_memory_select_admin ON system.learning_memory;
CREATE POLICY learning_memory_select_admin ON system.learning_memory
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::public.app_role));

GRANT SELECT ON system.learning_memory TO authenticated;
GRANT ALL ON system.learning_memory TO service_role;

-- Touch helper used by the iteration scorer.
CREATE OR REPLACE FUNCTION system.upsert_learning_pattern(
  p_pattern TEXT,
  p_context JSONB,
  p_succeeded BOOLEAN
) RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, system
AS $$
BEGIN
  INSERT INTO system.learning_memory (pattern, context, attempts, successes, success_rate, last_used_at)
  VALUES (
    p_pattern, COALESCE(p_context, '{}'::jsonb),
    1, CASE WHEN p_succeeded THEN 1 ELSE 0 END,
    CASE WHEN p_succeeded THEN 1.000 ELSE 0.000 END,
    now()
  )
  ON CONFLICT (pattern) DO UPDATE
    SET attempts     = system.learning_memory.attempts + 1,
        successes    = system.learning_memory.successes + CASE WHEN p_succeeded THEN 1 ELSE 0 END,
        success_rate = ROUND(
          (system.learning_memory.successes + CASE WHEN p_succeeded THEN 1 ELSE 0 END)::numeric
          / NULLIF(system.learning_memory.attempts + 1, 0)::numeric,
          3
        ),
        last_used_at = now(),
        updated_at   = now();
END$$;

REVOKE ALL ON FUNCTION system.upsert_learning_pattern(TEXT, JSONB, BOOLEAN) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION system.upsert_learning_pattern(TEXT, JSONB, BOOLEAN)
  TO service_role;
