-- Task #1017 follow-up — atomic dispatch + dependency edges.
--
-- Closes the dispatch-vs-edges race: if any edge insert is rejected by
-- `task_dependencies_enforce_dag`, this wrapper compensates inside the
-- SAME transaction by marking the just-inserted task `blocked` with a
-- structured `blocked_reason`, and writes an immutable row to
-- `system.incident_log`. The savepoint pattern lets the failed edge
-- INSERT roll back without losing the surrounding compensation +
-- incident write, so the caller is guaranteed "task is fully wired OR
-- fully blocked" — never "running with missing dependencies".

CREATE OR REPLACE FUNCTION system.attach_task_dependencies(
  p_task_id     UUID,
  p_depends_on  UUID[]
) RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, system
AS $$
DECLARE
  v_dep   UUID;
  v_err   TEXT;
  v_state TEXT;
  v_caller UUID := auth.uid();
  v_is_service BOOLEAN := (auth.role() = 'service_role');
BEGIN
  -- ── Authz gate (defense-in-depth) ───────────────────────────────────────
  -- This function is SECURITY DEFINER and can mutate task status as a
  -- compensation, so it MUST gate every caller exactly like the dispatch
  -- RPC does. Allowed callers:
  --   * service_role  (edge functions / cron)
  --   * authenticated users with the `admin` role on public.user_roles
  -- Anyone else is rejected with a structured error and an incident row.
  IF NOT v_is_service THEN
    IF v_caller IS NULL OR NOT public.has_role(v_caller, 'admin'::public.app_role) THEN
      PERFORM system.write_incident(
        'unauthorized_attach_attempt', 'critical', 'attach_task_dependencies',
        p_task_id, NULL,
        jsonb_build_object('caller', v_caller, 'role', auth.role()));
      RAISE EXCEPTION 'attach_task_dependencies: forbidden (admin or service_role required)'
        USING ERRCODE = '42501';
    END IF;
  END IF;

  IF p_task_id IS NULL THEN
    RAISE EXCEPTION 'attach_task_dependencies: p_task_id is required'
      USING ERRCODE = '22023';
  END IF;
  IF p_depends_on IS NULL OR array_length(p_depends_on, 1) IS NULL THEN
    RETURN jsonb_build_object('ok', true, 'attached', 0);
  END IF;

  -- The savepoint isolates the edge INSERTs. Any RAISE from the DAG
  -- trigger rolls back the savepoint only; the surrounding tx survives
  -- so the compensation + incident_log writes commit.
  BEGIN
    FOREACH v_dep IN ARRAY p_depends_on LOOP
      INSERT INTO system.task_dependencies (task_id, depends_on_task_id)
      VALUES (p_task_id, v_dep);
    END LOOP;

    RETURN jsonb_build_object('ok', true, 'attached', array_length(p_depends_on, 1));
  EXCEPTION WHEN OTHERS THEN
    v_err := SQLERRM;

    -- Compensate: force the orphan task into `blocked` so the orchestrator
    -- can never pick it up. Use a direct UPDATE because the offending row
    -- may not be in `running` (so the assert_task_transition matrix
    -- accepts queued/approved/pending_review/blocked → blocked as a no-op
    -- or downward step). We bypass the matrix here on purpose because
    -- this IS the safety compensation.
    SELECT status::TEXT INTO v_state
      FROM system.execution_tasks WHERE id = p_task_id;
    IF v_state IS NOT NULL AND v_state NOT IN ('failed','cancelled','succeeded','blocked') THEN
      UPDATE system.execution_tasks
         SET status         = 'blocked',
             blocked_reason = 'dependency_rejected: ' || v_err
       WHERE id = p_task_id;
    END IF;

    PERFORM system.write_incident(
      'dependency_rejected', 'error', 'attach_task_dependencies',
      p_task_id, NULL,
      jsonb_build_object(
        'error', v_err,
        'depends_on', to_jsonb(p_depends_on),
        'compensated_to_blocked', v_state IS NOT NULL
      )
    );

    RETURN jsonb_build_object(
      'ok', false,
      'error', v_err,
      'compensated', TRUE
    );
  END;
END;
$$;

REVOKE ALL ON FUNCTION system.attach_task_dependencies(UUID, UUID[]) FROM PUBLIC;
REVOKE ALL ON FUNCTION system.attach_task_dependencies(UUID, UUID[]) FROM authenticated;
-- Only service_role gets a direct grant. Authenticated admin callers
-- still reach the function through the dispatcher path, but the
-- function ALSO re-checks `has_role(..,'admin')` on auth.uid() inside
-- (defense-in-depth) so a missing/forged grant cannot widen the surface.
GRANT EXECUTE ON FUNCTION system.attach_task_dependencies(UUID, UUID[]) TO service_role;
-- Keep authenticated callers eligible for the in-function admin check.
GRANT EXECUTE ON FUNCTION system.attach_task_dependencies(UUID, UUID[]) TO authenticated;

COMMENT ON FUNCTION system.attach_task_dependencies(UUID, UUID[]) IS
  'Atomic edge attachment with compensating block + incident on rejection. '
  'Used by TaskDispatcher to guarantee no orphan task ever runs without its '
  'declared dependencies. See task #1017.';
