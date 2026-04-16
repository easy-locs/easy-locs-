-- ============================================================================
-- Marketplace Pilot Adapter — risk classification + approval policy (task #754)
--
-- Phase-2 pilot adds two MEDIUM task types to system.classify_task_risk so
-- they are NOT deny-by-default classified as CRITICAL by the dispatch RPC:
--
--   MARKETPLACE.LISTING.PUBLISH    → MEDIUM (requires_approval = true)
--   MARKETPLACE.LISTING.UNPUBLISH  → MEDIUM (SAFE_BY_POLICY, no approval)
--
-- Approval gating is enforced by the dispatch RPC's `p_requires_approval`
-- argument and is therefore caller-driven (the marketplace policy resolver
-- in TypeScript is the canonical source). We extend
-- `system.validate_execution_task` so the inline MEDIUM_REQUIRES_APPROVAL
-- gate also fires for MARKETPLACE.LISTING.PUBLISH, providing defence-in-depth
-- if a caller ever forgets to set requires_approval.
-- ============================================================================

CREATE OR REPLACE FUNCTION system.classify_task_risk(_type TEXT)
RETURNS system.execution_task_risk
LANGUAGE plpgsql IMMUTABLE
AS $$
DECLARE
  t TEXT := UPPER(BTRIM(COALESCE(_type, '')));
BEGIN
  IF t = '' THEN RETURN 'CRITICAL'; END IF;

  IF t IN (
    'ANALYSIS','VALIDATION','RETRY','RESYNC','REPORT_GENERATION',
    'INCIDENT_CLASSIFICATION','NON_SENSITIVE_DEDUP','READ_ONLY_QUERY','CACHE_REFRESH'
  ) THEN
    RETURN 'SAFE';
  END IF;

  IF t IN (
    'UI_FIX','NON_CRITICAL_DATA_FIX','REVIEW_QUEUE_RESOLUTION',
    'NOTIFICATION_DISPATCH','NON_SENSITIVE_BULK_UPDATE',
    'MARKETPLACE.LISTING.PUBLISH','MARKETPLACE.LISTING.UNPUBLISH'
  ) THEN
    RETURN 'MEDIUM';
  END IF;

  IF t IN (
    'SCHEMA_MIGRATION','DEPLOYMENT','CODE_PATCH','RLS_CHANGE',
    'SECRET_ROTATION','USER_DELETION'
  ) THEN
    RETURN 'CRITICAL';
  END IF;

  IF t LIKE 'WALLET\_%' ESCAPE '\' OR t LIKE 'AUTH\_%' ESCAPE '\' OR t LIKE 'FINANCIAL\_%' ESCAPE '\' THEN
    RETURN 'CRITICAL';
  END IF;

  -- Deny-by-default
  RETURN 'CRITICAL';
END;
$$;

REVOKE ALL ON FUNCTION system.classify_task_risk(TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION system.classify_task_risk(TEXT) TO authenticated, service_role;

-- Extend validate_execution_task: MARKETPLACE.LISTING.PUBLISH joins the
-- approval-gated MEDIUM list. Unpublish stays MEDIUM but auto-executable.
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
  IF v_type = '' THEN
    RETURN jsonb_build_object('ok', FALSE, 'reason', 'MISSING_TYPE: task.type is required');
  END IF;
  IF v_task.domain IS NULL OR BTRIM(v_task.domain) = '' THEN
    RETURN jsonb_build_object('ok', FALSE, 'reason', 'MISSING_DOMAIN: task.domain is required');
  END IF;

  v_server_risk := system.classify_task_risk(v_type);
  v_approver    := NULLIF(BTRIM(COALESCE(v_task.approved_by, '')), '');

  IF v_server_risk = 'CRITICAL' THEN
    RETURN jsonb_build_object(
      'ok', FALSE,
      'reason', 'PHASE1_CRITICAL_FORBIDDEN: CRITICAL task types cannot execute in phase 1',
      'risk_level', v_server_risk
    );
  END IF;

  IF v_server_risk = 'MEDIUM' THEN
    IF v_type IN (
      'NOTIFICATION_DISPATCH', 'NON_SENSITIVE_BULK_UPDATE',
      'MARKETPLACE.LISTING.PUBLISH'
    ) THEN
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

  RETURN jsonb_build_object('ok', TRUE, 'reason', NULL, 'risk_level', v_server_risk);
END;
$$;

REVOKE ALL ON FUNCTION system.validate_execution_task(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION system.validate_execution_task(UUID) TO authenticated, service_role;
