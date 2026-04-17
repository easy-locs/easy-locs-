-- ============================================================================
-- Level C · LC4 (task #878) — system.request_dev_replan(p_builder_task_id, p_reason)
--
-- Triggered by the dev-builder loop (`runDevBuilderForPlan`) when the
-- LC6 verifier rejects an iteration. Unlike `dispatch_lc3_replan`
-- (which gates on BLOCKED_BY_DRIFT and is owned by LC7), this RPC is
-- the canonical replan path for the dev-builder pipeline itself:
--
--   * Caller MUST be admin or service_role (mirrors register_agent).
--   * Builder task MUST exist and MUST belong to the dev-builder
--     pipeline (`type = 'EXECUTE_DEV_PLAN'`).
--   * Inserts a child `execution_tasks` row with:
--       type            = 'LC3.PLAN.PRODUCE'
--       domain          = 'planner'
--       risk_level      = MEDIUM
--       status          = queued
--       parent_task_id  = p_builder_task_id
--       payload         = { previous_plan_id, reason, requested_at }
--   * Returns { replan_task_id }. The dev-builder loop then waits for
--     LC3 to populate `payload.plan` on that row and reloads it.
--
-- This is the single SECURITY DEFINER choke-point for dev-builder
-- replans; the runtime never inserts into `execution_tasks` directly.
-- ============================================================================

CREATE OR REPLACE FUNCTION system.request_dev_replan(
  p_builder_task_id UUID,
  p_reason          TEXT DEFAULT NULL
) RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, system
AS $$
DECLARE
  v_caller   UUID := auth.uid();
  v_builder  system.execution_tasks;
  v_prev_plan_id TEXT;
  v_replan   system.execution_tasks;
BEGIN
  -- Admin gate (service_role bypasses).
  IF v_caller IS NOT NULL THEN
    IF NOT public.has_role(v_caller, 'admin'::public.app_role) THEN
      RAISE EXCEPTION 'request_dev_replan: caller % is not an admin', v_caller
        USING ERRCODE = '42501';
    END IF;
  END IF;

  SELECT * INTO v_builder
    FROM system.execution_tasks
   WHERE id = p_builder_task_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'request_dev_replan: task % not found', p_builder_task_id
      USING ERRCODE = '23503';
  END IF;

  -- Light contract check: this RPC is exclusively for dev-builder rows.
  -- We allow legacy uppercased / dotted variants by matching either.
  IF UPPER(v_builder.type) NOT IN ('EXECUTE_DEV_PLAN', 'EXECUTE.DEV.PLAN') THEN
    RAISE EXCEPTION
      'request_dev_replan: task % is not an execute_dev_plan task (type=%)',
      p_builder_task_id, v_builder.type
      USING ERRCODE = '22023';
  END IF;

  v_prev_plan_id := COALESCE(
    v_builder.payload #>> '{plan,plan_id}',
    p_builder_task_id::TEXT
  );

  INSERT INTO system.execution_tasks (
    type, domain, risk_level, status, payload, requested_by,
    parent_task_id, attempt_count, max_attempts,
    approval_policy, requires_approval
  ) VALUES (
    'LC3.PLAN.PRODUCE', 'planner', 'MEDIUM', 'queued',
    jsonb_build_object(
      'previous_plan_id', v_prev_plan_id,
      'reason',           COALESCE(p_reason, 'verifier_red'),
      'requested_at',     to_jsonb(now())
    ),
    'dev.builder',
    p_builder_task_id, 0, 1,
    'none', FALSE
  )
  RETURNING * INTO v_replan;

  -- Best-effort audit trail on the parent row.
  UPDATE system.execution_tasks
     SET payload = COALESCE(payload, '{}'::jsonb) || jsonb_build_object(
           'last_replan', jsonb_build_object(
             'requested_at',  to_jsonb(now()),
             'reason',        COALESCE(p_reason, 'verifier_red'),
             'replan_task_id', v_replan.id
           )
         )
   WHERE id = p_builder_task_id;

  RETURN jsonb_build_object(
    'replan_task_id', v_replan.id,
    'parent_task_id', p_builder_task_id,
    'requested_at',   now()
  );
END;
$$;

REVOKE ALL ON FUNCTION system.request_dev_replan(UUID, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION system.request_dev_replan(UUID, TEXT)
  TO authenticated, service_role;

COMMENT ON FUNCTION system.request_dev_replan(UUID, TEXT) IS
  'LC4 (#878): canonical replan dispatch for dev-builder rows. Inserts a child LC3.PLAN.PRODUCE task and returns its id. Distinct from dispatch_lc3_replan (which is the LC7 / BLOCKED_BY_DRIFT path).';
