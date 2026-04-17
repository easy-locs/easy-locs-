-- LB1 follow-up #834 — Canonical lifecycle for held AI runs + orchestrator quota gate.
--
-- Purpose: collapse the parallel "held_for_review" surface added by LB1 (#815)
-- into the canonical pending_review / decide_task_approval contract. The
-- orchestrator now transitions sensitive AI runs running→pending_review and
-- the existing approvals inbox decides them; no separate release RPC.
--
-- Changes:
--   1) assert_task_transition: add running→pending_review and
--      pending_review→{succeeded,failed} edges.
--   2) decide_task_approval: when the held task already has an
--      execution_result (post-execute hold), terminate to succeeded/failed
--      instead of approved/rejected so the canonical state machine carries
--      the run to its natural terminus.
--   3) Drop system.release_held_ai_response — superseded by
--      decide_task_approval.
--   4) Drop the held_for_review / held_reason / released_at / released_by
--      columns + supporting index. The pending_review status itself plus
--      blocked_reason now carry the same information without a parallel
--      surface.
--   5) Re-create system.v_ai_runs to derive held_for_review from status so
--      the conversation explorer keeps its existing field shape.

-- ── 1. State-machine: hold + post-hold terminus ────────────────────────────
-- Rebased on the L3 matrix from 20260421100000_execution_tasks_rollback_l3.sql
-- so the rolling_back / rollback_failed lifecycle is preserved verbatim.
-- LB1 #834 only ADDS edges:
--   * draft         → ... + 'pending_review' already legal (unchanged)
--   * pending_review→ 'draft' (changes_requested) and post-execute terminals
--                     'succeeded' / 'failed'
--   * running       → 'pending_review' (held for sensitive-output review)
CREATE OR REPLACE FUNCTION system.assert_task_transition(
  _old system.execution_task_status,
  _new system.execution_task_status
) RETURNS BOOLEAN
LANGUAGE plpgsql
IMMUTABLE
AS $$
BEGIN
  IF _old IS NOT DISTINCT FROM _new THEN RETURN TRUE; END IF;
  IF _old IS NULL THEN RETURN TRUE; END IF;

  RETURN CASE _old
    WHEN 'draft'           THEN _new IN ('pending_review','approved','queued','cancelled')
    -- LB1 #834: pending_review can now also terminate post-execute holds
    -- (succeeded/failed) via decide_task_approval and route back to draft
    -- via changes_requested.
    WHEN 'pending_review'  THEN _new IN ('draft','approved','rejected','succeeded','failed','cancelled')
    WHEN 'approved'        THEN _new IN ('queued','cancelled')
    WHEN 'rejected'        THEN _new IN ('draft','cancelled')
    WHEN 'queued'          THEN _new IN ('running','blocked','cancelled')
    -- LB1 #834: running→pending_review is the canonical "hold response for
    -- review" issued by the orchestrator on flagged sensitive output.
    WHEN 'running'         THEN _new IN ('succeeded','failed','blocked','pending_review')
    WHEN 'failed'          THEN _new IN ('queued','blocked','rolling_back','rolled_back','cancelled')
    WHEN 'succeeded'       THEN _new IN ('rolling_back','rolled_back')
    WHEN 'blocked'         THEN _new IN ('queued','cancelled')
    -- L3 (#811) — rollback lifecycle preserved verbatim.
    WHEN 'rolling_back'    THEN _new IN ('rolled_back','rollback_failed')
    WHEN 'rollback_failed' THEN _new IN ('rolling_back','blocked','cancelled')
    WHEN 'rolled_back'     THEN FALSE -- terminal
    WHEN 'cancelled'       THEN FALSE -- terminal
    ELSE FALSE
  END;
END;
$$;

-- ── 2. decide_task_approval: terminate post-execute holds correctly ────────
CREATE OR REPLACE FUNCTION system.decide_task_approval(
  p_task_id           UUID,
  p_decision          system.task_approval_decision,
  p_reason            TEXT DEFAULT NULL,
  p_comment_md        TEXT DEFAULT NULL,
  p_client_request_id TEXT DEFAULT NULL
) RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, system
AS $$
DECLARE
  v_caller    UUID := auth.uid();
  v_task      system.execution_tasks;
  v_existing  system.task_approvals;
  v_inserted  system.task_approvals;
  v_reason    TEXT := NULLIF(BTRIM(p_reason), '');
  v_comment   TEXT := NULLIF(BTRIM(p_comment_md), '');
  v_clientreq TEXT := NULLIF(BTRIM(p_client_request_id), '');
  v_post_exec BOOLEAN := FALSE;
BEGIN
  IF v_caller IS NULL THEN
    RAISE EXCEPTION 'decide_task_approval denied: not authenticated'
      USING ERRCODE = '42501';
  END IF;
  IF NOT public.has_role(v_caller, 'super_admin'::public.app_role) THEN
    RAISE EXCEPTION 'decide_task_approval denied: caller % is not a super_admin', v_caller
      USING ERRCODE = '42501';
  END IF;

  SELECT * INTO v_task FROM system.execution_tasks WHERE id = p_task_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'decide_task_approval: task % not found', p_task_id
      USING ERRCODE = '22023';
  END IF;

  IF v_clientreq IS NOT NULL THEN
    SELECT * INTO v_existing
      FROM system.task_approvals
     WHERE task_id = p_task_id
       AND reviewer_user_id = v_caller
       AND client_request_id = v_clientreq
     LIMIT 1;
    IF FOUND THEN
      RETURN jsonb_build_object(
        'ok', TRUE,
        'idempotent', TRUE,
        'approval_id', v_existing.id,
        'decision', v_existing.decision,
        'task_status', v_task.status
      );
    END IF;
  END IF;

  IF v_task.status <> 'pending_review' AND p_decision <> 'comment' THEN
    SELECT * INTO v_existing
      FROM system.task_approvals
     WHERE task_id = p_task_id
       AND decision = p_decision
     ORDER BY decided_at DESC
     LIMIT 1;
    IF FOUND THEN
      RETURN jsonb_build_object(
        'ok', TRUE,
        'idempotent', TRUE,
        'approval_id', v_existing.id,
        'decision', v_existing.decision,
        'task_status', v_task.status,
        'note', 'task is no longer pending_review; returning prior decision'
      );
    END IF;
    RAISE EXCEPTION 'decide_task_approval: task % is in status % (must be pending_review)',
      p_task_id, v_task.status
      USING ERRCODE = '22023';
  END IF;

  IF p_decision = 'rejected' AND v_reason IS NULL THEN
    RAISE EXCEPTION 'decide_task_approval: rejection requires a non-empty reason'
      USING ERRCODE = '22023';
  END IF;

  -- Detect post-execute hold: the row already carries an execution_result,
  -- meaning the adapter ran and the orchestrator transitioned it to
  -- pending_review for sensitive-output review. Approvals on these rows
  -- terminate the run; pre-execute approvals continue queueing as before.
  v_post_exec := (v_task.execution_result IS NOT NULL);

  INSERT INTO system.task_approvals (
    task_id, reviewer_user_id, decision, reason, comment_md,
    agent_id_at_decision, agent_kind_at_decision, client_request_id
  ) VALUES (
    p_task_id, v_caller, p_decision, v_reason, v_comment,
    v_task.agent_id,
    (SELECT agent_kind FROM system.agents WHERE id = v_task.agent_id),
    v_clientreq
  )
  RETURNING * INTO v_inserted;

  IF p_decision = 'approved' THEN
    IF v_post_exec THEN
      -- Held response release: the execute call already succeeded.
      UPDATE system.execution_tasks
         SET status        = 'succeeded',
             approved_by   = COALESCE(v_caller::text, approved_by),
             approved_at   = now()
       WHERE id = p_task_id;
    ELSE
      UPDATE system.execution_tasks
         SET status        = 'approved',
             approved_by   = COALESCE(v_caller::text, approved_by),
             approved_at   = now()
       WHERE id = p_task_id;
    END IF;
  ELSIF p_decision = 'rejected' THEN
    IF v_post_exec THEN
      -- Held response rejected: drop the response and terminate as failed
      -- with the reviewer's reason on blocked_reason.
      UPDATE system.execution_tasks
         SET status         = 'failed',
             rejected_by    = v_caller::text,
             error_code     = 'REVIEW_REJECTED',
             blocked_reason = COALESCE(v_reason, 'rejected by reviewer')
       WHERE id = p_task_id;
    ELSE
      UPDATE system.execution_tasks
         SET status         = 'rejected',
             rejected_by    = v_caller::text,
             blocked_reason = COALESCE(v_reason, 'rejected by reviewer')
       WHERE id = p_task_id;
    END IF;
  ELSIF p_decision = 'changes_requested' THEN
    UPDATE system.execution_tasks
       SET status         = 'draft',
           blocked_reason = COALESCE(v_comment, v_reason, 'changes requested by reviewer')
     WHERE id = p_task_id;
  END IF;

  PERFORM system.emit_task_canonical_event(
    p_task_id,
    'approval.decided',
    jsonb_build_object(
      'approval_id', v_inserted.id,
      'decision', p_decision,
      'reviewer', v_caller,
      'reason', v_reason,
      'has_comment', v_comment IS NOT NULL,
      'post_execute_hold', v_post_exec
    ),
    CASE WHEN p_decision = 'rejected' THEN 'error' ELSE 'ok' END
  );

  RETURN jsonb_build_object(
    'ok', TRUE,
    'idempotent', FALSE,
    'approval_id', v_inserted.id,
    'decision', p_decision,
    'task_status', (SELECT status FROM system.execution_tasks WHERE id = p_task_id),
    'post_execute_hold', v_post_exec
  );
END;
$$;

REVOKE ALL ON FUNCTION system.decide_task_approval(
  UUID, system.task_approval_decision, TEXT, TEXT, TEXT
) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION system.decide_task_approval(
  UUID, system.task_approval_decision, TEXT, TEXT, TEXT
) TO authenticated, service_role;

-- ── 3. Drop the parallel release RPC ──────────────────────────────────────
DROP FUNCTION IF EXISTS system.release_held_ai_response(UUID, TEXT);

-- ── 4. Drop the parallel held_for_review surface from execution_tasks ─────
-- Drop the view first so the column drops below succeed (views with
-- column dependencies block ALTER TABLE ... DROP COLUMN). Step 5 below
-- recreates the view against the new (derived) shape.
DROP VIEW IF EXISTS system.v_ai_runs;
DROP INDEX IF EXISTS system.idx_execution_tasks_held_for_review;
ALTER TABLE system.execution_tasks
  DROP COLUMN IF EXISTS held_for_review,
  DROP COLUMN IF EXISTS held_reason,
  DROP COLUMN IF EXISTS released_by,
  DROP COLUMN IF EXISTS released_at;

-- ── 5. v_ai_runs — derive held_for_review from the canonical status ───────
CREATE VIEW system.v_ai_runs AS
SELECT
  t.id                AS task_id,
  t.agent_id,
  t.agent_version_id,
  a.slug              AS agent_slug,
  t.type              AS task_type,
  t.domain,
  t.status            AS task_status,
  t.risk_level,
  t.requires_approval,
  t.cost_usd,
  t.latency_ms,
  -- Canonical hold derivation: a held AI response sits in pending_review
  -- with the adapter's flagged reason on blocked_reason. Once the
  -- reviewer decides, status moves to succeeded/failed and held_for_review
  -- naturally returns to FALSE.
  -- Only post-execute holds count as "held_for_review" — a row that is
  -- in pending_review WITHOUT an execution_result is a pre-execute
  -- approval (LB0 lifecycle) and would mislead the agent-runs UI.
  (t.status = 'pending_review' AND t.execution_result IS NOT NULL) AS held_for_review,
  CASE WHEN t.status = 'pending_review' THEN t.blocked_reason
       ELSE NULL END                                             AS held_reason,
  CASE WHEN t.status IN ('succeeded','failed')
            AND EXISTS (
              SELECT 1 FROM system.task_approvals ta
               WHERE ta.task_id = t.id
            )
       THEN t.completed_at
       ELSE NULL END                                             AS released_at,
  t.created_at        AS task_created_at,
  t.completed_at,
  t.failed_at,
  t.error_code,
  COALESCE(t.error, t.blocked_reason) AS error,
  t.payload,
  t.execution_result  AS result,
  t.correlation_id,
  ai.id               AS interaction_id,
  ai.feature          AS ai_feature,
  ai.provider,
  ai.model,
  ai.prompt_tokens,
  ai.completion_tokens,
  ai.total_tokens,
  ai.fallback_used,
  ai.status           AS ai_status,
  ai.block_reason     AS ai_block_reason,
  ai.metadata         AS ai_metadata,
  COALESCE(
    NULLIF(t.payload->'payload'->>'prompt', ''),
    NULLIF(t.payload->'payload'->'messages'->-1->>'content', ''),
    NULLIF(ai.metadata->>'prompt', '')
  )                   AS prompt,
  COALESCE(
    NULLIF(t.execution_result->>'text', ''),
    NULLIF(t.execution_result->'output'->>'text', ''),
    NULLIF(ai.metadata->>'response', '')
  )                   AS response,
  t.execution_result->'verification' AS verification,
  COALESCE(
    t.execution_result->'tool_calls',
    t.execution_result->'tools_used',
    t.payload->'payload'->'tools'
  )                   AS tools_used,
  t.payload->'payload'->>'purpose' AS purpose
FROM system.execution_tasks t
LEFT JOIN system.agents a ON a.id = t.agent_id
LEFT JOIN public.ai_interactions ai ON ai.execution_task_id = t.id
WHERE t.domain = 'ai';

GRANT SELECT ON system.v_ai_runs TO authenticated, service_role;
