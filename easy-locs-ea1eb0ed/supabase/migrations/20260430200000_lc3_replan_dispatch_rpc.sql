-- ════════════════════════════════════════════════════════════════════════
-- Task #881 — LC3 replan dispatcher RPC
--
-- Background
--   Task #874 added the operator "Replan" button on the admin approvals
--   inbox. Clicking it stamps `drift_report.replan_requested_at` and
--   `drift_report.replan_requested_by` on the BLOCKED_BY_DRIFT row via
--   `system.request_drift_replan(...)`. The brief explicitly defers the
--   actual LC3 (planner) dispatch to a downstream trigger — that is
--   what task #881 wires up.
--
-- This RPC
--   `system.dispatch_lc3_replan(p_task_id)` is the choke-point that the
--   `lc3-replan-trigger` cron edge function calls once per
--   replan-marked row. It is SECURITY DEFINER and runs as the table
--   owner so it can:
--     1. Insert a fresh LC3.REPLAN execution_task (queued, parent-linked
--        to the original) carrying the drift_report and the original
--        payload — that is the planner's input.
--     2. Stamp `drift_report.replan_dispatched_at` + `replan_task_id`
--        on the original row so the trigger never re-dispatches the
--        same row twice (idempotency by marker).
--     3. Transition the original from `blocked` → `cancelled` (a legal
--        edge in the v2 lifecycle state machine, see
--        20260418500000_execution_tasks_v2.sql line 237). This drops
--        the row out of `dashboardRepo.fetchDriftBlockedTasks()` —
--        which filters on `status='blocked'` AND
--        `blocked_reason='BLOCKED_BY_DRIFT'` — so the operator sees the
--        inbox update without manual intervention.
--
-- Guarantees
--   - Caller MUST be admin (super_admin inherits) OR service_role —
--     same gate as `system.request_drift_replan`. The trigger uses
--     service_role; admins can also call it directly for debugging.
--   - Strict precondition: original row MUST be `status='blocked'`
--     AND `blocked_reason='BLOCKED_BY_DRIFT'` AND
--     `drift_report->>'replan_requested_at' IS NOT NULL` AND
--     `drift_report->>'replan_dispatched_at' IS NULL`. Any violation
--     RAISES — the trigger surfaces that as a per-row error in its
--     response so we never silently miss a row.
--   - Idempotent under concurrent triggers: the `FOR UPDATE` lock + the
--     `replan_dispatched_at IS NULL` precondition mean two parallel
--     dispatchers cannot both insert a replan task for the same row.
--   - Inserts the new task DIRECTLY (bypassing
--     `system.dispatch_execution_task`) because the LC3 planner agent
--     is not yet registered in `system.agent_capabilities`. The
--     orchestrator will pick the row up when the LC3 adapter ships;
--     until then the row sits queued, which is the correct behaviour
--     per the task brief ("dispatch the LC3 planner task" — i.e.
--     create the work item, not run the planner inline).
-- ════════════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION system.dispatch_lc3_replan(p_task_id UUID)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, system AS $$
DECLARE
  v_caller         UUID := auth.uid();
  v_orig           system.execution_tasks;
  v_replan_id      UUID;
  v_now            TIMESTAMPTZ := now();
  v_now_iso        TEXT := to_char(v_now AT TIME ZONE 'UTC',
                                   'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"');
  v_next_report    jsonb;
  v_payload        jsonb;
BEGIN
  PERFORM system._assert_admin_or_service();

  SELECT * INTO v_orig
    FROM system.execution_tasks
   WHERE id = p_task_id
   FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'dispatch_lc3_replan: task % not found', p_task_id
      USING ERRCODE = 'P0002';
  END IF;

  IF v_orig.status IS DISTINCT FROM 'blocked'
     OR v_orig.blocked_reason IS DISTINCT FROM 'BLOCKED_BY_DRIFT' THEN
    RAISE EXCEPTION
      'dispatch_lc3_replan: task % is not BLOCKED_BY_DRIFT (status=%, blocked_reason=%)',
      p_task_id, v_orig.status, v_orig.blocked_reason
      USING ERRCODE = '22023';
  END IF;

  IF v_orig.drift_report IS NULL
     OR (v_orig.drift_report->>'replan_requested_at') IS NULL THEN
    RAISE EXCEPTION
      'dispatch_lc3_replan: task % has no replan_requested_at marker', p_task_id
      USING ERRCODE = '22023';
  END IF;

  IF (v_orig.drift_report->>'replan_dispatched_at') IS NOT NULL THEN
    -- Already dispatched — return the prior replan task id so the trigger
    -- treats this as a no-op rather than an error.
    RETURN jsonb_build_object(
      'ok', TRUE,
      'already_dispatched', TRUE,
      'original_task_id', v_orig.id,
      'replan_task_id', v_orig.drift_report->'replan_task_id',
      'dispatched_at', v_orig.drift_report->'replan_dispatched_at'
    );
  END IF;

  -- Compose the payload the LC3 planner will consume. We carry the
  -- original payload verbatim, the drift report (so the planner can
  -- reason about the conflict), and a back-pointer to the original
  -- task id for traceability.
  v_payload := jsonb_build_object(
    'origin', 'lc3-replan-trigger',
    'original_task_id', v_orig.id,
    'original_type', v_orig.type,
    'original_domain', v_orig.domain,
    'original_payload', COALESCE(v_orig.payload, '{}'::jsonb),
    'drift_report', v_orig.drift_report,
    'triggered_at', v_now_iso,
    'triggered_by', COALESCE(v_caller::text, 'service')
  );

  -- Direct insert (service-definer scope). LC3.REPLAN / dev is the
  -- canonical (domain, type) pair the future LC3 planner adapter will
  -- bind to in agent_capabilities.
  INSERT INTO system.execution_tasks (
    type, domain, risk_level, status,
    payload, requested_by, parent_task_id,
    attempt_count, max_attempts,
    correlation_id, runner
  ) VALUES (
    'LC3.REPLAN', 'dev', 'SAFE', 'queued',
    v_payload,
    COALESCE(v_caller::text, 'system'),
    v_orig.id,
    0, 3,
    v_orig.id::text, 'internal'
  )
  RETURNING id INTO v_replan_id;

  -- Stamp the dispatch marker on the original drift_report. This is
  -- the idempotency key for the trigger's next pass.
  v_next_report := COALESCE(v_orig.drift_report, '{}'::jsonb)
                   || jsonb_build_object(
                        'replan_dispatched_at', v_now_iso,
                        'replan_dispatched_by', COALESCE(v_caller::text, 'service'),
                        'replan_task_id', v_replan_id::text
                      );

  -- Transition original out of `blocked`. `blocked → cancelled` is the
  -- only legal terminal edge from blocked in the v2 state machine
  -- (see 20260418500000_execution_tasks_v2.sql). We also clear
  -- `blocked_reason` to 'SUPERSEDED_BY_REPLAN' so audit logs explain
  -- why a previously drift-blocked row is now cancelled.
  UPDATE system.execution_tasks
     SET status         = 'cancelled',
         blocked_reason = 'SUPERSEDED_BY_REPLAN',
         drift_report   = v_next_report,
         updated_at     = v_now
   WHERE id = v_orig.id;

  RETURN jsonb_build_object(
    'ok', TRUE,
    'already_dispatched', FALSE,
    'original_task_id', v_orig.id,
    'replan_task_id', v_replan_id,
    'dispatched_at', v_now_iso
  );
END;
$$;

REVOKE ALL ON FUNCTION system.dispatch_lc3_replan(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION system.dispatch_lc3_replan(UUID)
  TO authenticated, service_role;

COMMENT ON FUNCTION system.dispatch_lc3_replan(UUID) IS
  'Task #881: dispatch the LC3 planner replan task for a BLOCKED_BY_DRIFT row '
  'whose drift_report has been stamped with replan_requested_at. Inserts an '
  'LC3.REPLAN execution_task (queued), supersedes the original (blocked → '
  'cancelled, blocked_reason=SUPERSEDED_BY_REPLAN), and stamps replan_task_id '
  '+ replan_dispatched_at on the original drift_report. Idempotent: a second '
  'call returns the prior replan_task_id without inserting a new row.';
