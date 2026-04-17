-- ════════════════════════════════════════════════════════════════════════
-- LC7 (#874) — Drift detection · admin "Replan" RPC
--
-- Background
--   The drift detector transitions a task to
--   status='blocked' / blocked_reason='BLOCKED_BY_DRIFT' and stores a
--   structured `drift_report` JSONB. Operators clear the situation from
--   the admin inbox by clicking "Replan", which must stamp a marker
--   (`drift_report.replan_requested_at` + `replan_requested_by`) so a
--   downstream LC3 trigger can pick it up.
--
-- Why an RPC
--   `system.execution_tasks` REVOKES INSERT / UPDATE / DELETE from the
--   `authenticated` role (see 20260418300000_execution_tasks.sql) and
--   the control-plane convention (#812) is that all admin-side mutations
--   on execution_tasks happen through a SECURITY DEFINER RPC that
--   asserts admin role and validates the transition. Direct table
--   updates from the browser would fail at RLS for real admins.
--
-- Guarantees
--   - Caller must be `admin` (super_admin inherits) OR service_role.
--   - Task MUST currently be `blocked` with `blocked_reason =
--     'BLOCKED_BY_DRIFT'` and a non-null `drift_report`. Otherwise raise.
--   - We never touch `status`, `blocked_reason`, or any other column —
--     we only merge the marker into the existing JSONB. The actual
--     replan is performed by a downstream worker (follow-up #881),
--     never by this RPC and never by LC4 directly.
-- ════════════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION system.request_drift_replan(p_task_id UUID)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, system AS $$
DECLARE
  v_caller         UUID := auth.uid();
  v_status         TEXT;
  v_blocked_reason TEXT;
  v_report         jsonb;
  v_next           jsonb;
BEGIN
  PERFORM system._assert_admin_or_service();

  SELECT status, blocked_reason, drift_report
    INTO v_status, v_blocked_reason, v_report
    FROM system.execution_tasks
   WHERE id = p_task_id
   FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'request_drift_replan: task % not found', p_task_id
      USING ERRCODE = 'P0002';
  END IF;

  IF v_status IS DISTINCT FROM 'blocked'
     OR v_blocked_reason IS DISTINCT FROM 'BLOCKED_BY_DRIFT' THEN
    RAISE EXCEPTION
      'request_drift_replan: task % is not BLOCKED_BY_DRIFT (status=%, blocked_reason=%)',
      p_task_id, v_status, v_blocked_reason
      USING ERRCODE = '22023';
  END IF;

  v_next := COALESCE(v_report, '{}'::jsonb)
            || jsonb_build_object(
                 'replan_requested_at', to_char(now() AT TIME ZONE 'UTC',
                   'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"'),
                 'replan_requested_by', COALESCE(v_caller::text, 'service')
               );

  UPDATE system.execution_tasks
     SET drift_report = v_next
   WHERE id = p_task_id;

  RETURN v_next;
END;
$$;

REVOKE ALL ON FUNCTION system.request_drift_replan(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION system.request_drift_replan(UUID)
  TO authenticated, service_role;

COMMENT ON FUNCTION system.request_drift_replan(UUID) IS
  'LC7 (#874): admin-only marker stamp on a BLOCKED_BY_DRIFT task. '
  'Mutates only drift_report JSONB; never calls LC4. Downstream LC3 '
  'replan trigger consumes the replan_requested_at marker.';
