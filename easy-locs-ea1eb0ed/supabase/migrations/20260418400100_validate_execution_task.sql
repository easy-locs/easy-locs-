-- Autonomous Execution Layer — task #711
-- Authoritative pre-execution validation RPC.
--
-- Mirrors src/core/execution/validation-engine.ts (DB-checkable subset) so the
-- server-side execution-loop calls a single source of truth instead of an
-- inline fallback. The TS in-memory checks (repair-storm, quarantine state,
-- engine-contract reuse) are process-local to the dashboard runtime and have
-- no DB equivalent in this project; the rest of the policy lives here.
--
-- The TS validation engine *and* this RPC enforce the same rules:
--   * required fields (type, domain)
--   * server-authoritative risk classification (system.classify_task_risk)
--   * MEDIUM per-type approval policy (NOTIFICATION_DISPATCH,
--     NON_SENSITIVE_BULK_UPDATE require a non-"system" approver)
--   * CRITICAL hard-gate (must have non-"system" approved_by)
--   * Phase-1 strict allowlist (CRITICAL is never executed by the loop)
--
-- Returns JSONB:  { ok: boolean, reason: text|null, risk_level: text }

CREATE OR REPLACE FUNCTION system.validate_execution_task(p_task_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, system
AS $$
DECLARE
  v_task        system.execution_tasks;
  v_server_risk system.execution_task_risk;
  v_approver    TEXT;
  v_type        TEXT;
BEGIN
  SELECT * INTO v_task FROM system.execution_tasks WHERE id = p_task_id;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', FALSE, 'reason', 'TASK_NOT_FOUND');
  END IF;

  v_type := UPPER(BTRIM(COALESCE(v_task.type, '')));

  -- Required fields.
  IF v_type = '' THEN
    RETURN jsonb_build_object('ok', FALSE, 'reason', 'MISSING_TYPE: task.type is required');
  END IF;
  IF v_task.domain IS NULL OR BTRIM(v_task.domain) = '' THEN
    RETURN jsonb_build_object('ok', FALSE, 'reason', 'MISSING_DOMAIN: task.domain is required');
  END IF;

  -- Server-authoritative risk classification.
  v_server_risk := system.classify_task_risk(v_type);

  v_approver := NULLIF(BTRIM(COALESCE(v_task.approved_by, '')), '');

  -- Phase-1 strict allowlist: the autonomous loop never runs CRITICAL,
  -- regardless of approver. This matches the dispatch RPC's PHASE1
  -- forbidden gate.
  IF v_server_risk = 'CRITICAL' THEN
    RETURN jsonb_build_object(
      'ok', FALSE,
      'reason', 'PHASE1_CRITICAL_FORBIDDEN: CRITICAL task types cannot execute in phase 1',
      'risk_level', v_server_risk
    );
  END IF;

  -- MEDIUM per-type approval policy.
  IF v_server_risk = 'MEDIUM' THEN
    IF v_type IN ('NOTIFICATION_DISPATCH', 'NON_SENSITIVE_BULK_UPDATE') THEN
      IF v_approver IS NULL OR v_approver = 'system' THEN
        RETURN jsonb_build_object(
          'ok', FALSE,
          'reason', format(
            'MEDIUM_REQUIRES_APPROVAL: task type %L is approval-gated and cannot run without a non-system approver',
            v_type
          ),
          'risk_level', v_server_risk
        );
      END IF;
    END IF;
  END IF;

  -- All gates passed.
  RETURN jsonb_build_object('ok', TRUE, 'reason', NULL, 'risk_level', v_server_risk);
END;
$$;

REVOKE ALL ON FUNCTION system.validate_execution_task(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION system.validate_execution_task(UUID) TO authenticated, service_role;
