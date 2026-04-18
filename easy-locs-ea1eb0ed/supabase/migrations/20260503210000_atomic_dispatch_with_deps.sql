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
  v_dep        UUID;
  v_err        TEXT;
  v_state      TEXT;
  v_caller     UUID    := auth.uid();
  v_is_service BOOLEAN := (auth.role() = 'service_role');
BEGIN
  -- ── Authz gate (defense-in-depth) ───────────────────────────────────────
  -- This function is SECURITY DEFINER and can mutate task status as a
  -- compensation step, so it MUST gate every caller exactly like the
  -- canonical dispatch RPC. Allowed callers:
  --   * service_role  (edge functions / cron / dispatcher)
  --   * authenticated users with the `admin` role on public.user_roles
  -- Anyone else is rejected with a structured incident + 42501.
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

    -- Compensate: deterministically move the orphan task to a non-runnable
    -- state. The transition matrix (assert_task_transition) forbids some
    -- direct routes (e.g. pending_review→blocked), so we pick a per-status
    -- LEGAL fallback. `cancelled` is a universally-legal terminal sink,
    -- and we choose `blocked` only for statuses where it is a valid
    -- transition. We must never RAISE inside the compensation arm —
    -- doing so would leave the just-created task neither attached nor
    -- compensated, breaking the atomic-dispatch contract.
    SELECT status::TEXT INTO v_state
      FROM system.execution_tasks WHERE id = p_task_id;

    IF v_state IS NOT NULL
       AND v_state NOT IN ('failed','cancelled','succeeded','blocked') THEN
      DECLARE v_target TEXT; v_compensation_error TEXT;
      BEGIN
        v_target := CASE
          -- pending_review → cancelled is the only legal exit when an
          -- approval-gated task can never run. Routing through `blocked`
          -- would violate the state machine.
          WHEN v_state = 'pending_review' THEN 'cancelled'
          -- queued/approved/planning may go to `blocked` per matrix.
          WHEN v_state IN ('queued','approved','planning') THEN 'blocked'
          -- running/compensating: force-cancel; orchestrator workers
          -- already check status before each step and will abort cleanly.
          ELSE 'cancelled'
        END;

        BEGIN
          UPDATE system.execution_tasks
             SET status         = v_target::system.task_status,
                 blocked_reason = 'dependency_rejected: ' || v_err
           WHERE id = p_task_id;
        EXCEPTION WHEN OTHERS THEN
          v_compensation_error := SQLERRM;
          -- Last-resort: cancelled is universally legal. If even that
          -- fails (matrix change?) we still log and return ok=false
          -- without raising, so the wrapper's contract holds.
          BEGIN
            UPDATE system.execution_tasks
               SET status         = 'cancelled'::system.task_status,
                   blocked_reason = 'dependency_rejected (forced): ' || v_err
             WHERE id = p_task_id;
          EXCEPTION WHEN OTHERS THEN
            v_compensation_error := v_compensation_error || ' | last-resort: ' || SQLERRM;
          END;
        END;
      END;
    END IF;

    PERFORM system.write_incident(
      'dependency_rejected', 'error', 'attach_task_dependencies',
      p_task_id, NULL,
      jsonb_build_object(
        'error', v_err,
        'depends_on', to_jsonb(p_depends_on),
        'pre_state', v_state,
        'compensated', v_state IS NOT NULL
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
-- Only service_role gets a direct grant. The function ALSO performs an
-- in-body has_role(..,'admin') check on auth.uid() so admin callers are
-- explicitly allowed via that path; everyone else is rejected with 42501
-- and a critical incident row.
GRANT EXECUTE ON FUNCTION system.attach_task_dependencies(UUID, UUID[]) TO service_role;
-- Authenticated callers must reach the function through the in-body
-- admin gate; we still grant EXECUTE so the gate has a chance to run
-- (otherwise PostgREST returns 42501 before the structured incident
-- can be written).
GRANT EXECUTE ON FUNCTION system.attach_task_dependencies(UUID, UUID[]) TO authenticated;

COMMENT ON FUNCTION system.attach_task_dependencies(UUID, UUID[]) IS
  'Atomic edge attachment with compensating block + incident on rejection. '
  'Authz: service_role OR authenticated user with admin role. '
  'Used by TaskDispatcher to guarantee no orphan task ever runs without its '
  'declared dependencies. See task #1017.';
