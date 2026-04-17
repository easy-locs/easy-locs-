-- ============================================================================
-- Task #851 — Retire the unused legacy `result` / `error` columns from
-- `system.execution_tasks`.
--
-- Background:
--   * Migration 20260418500000_execution_tasks_v2.sql added the canonical
--     V2 columns `execution_result` (JSONB) and `error_code` (TEXT) but
--     kept the agent_tasks-era `result` / `error` columns alongside for
--     historical rows.
--   * Task #848 migrated the GitHub-runner callback (the last production
--     writer) to write the V2 columns only, and migration
--     20260428100000_execution_runner_callback_v2_backfill.sql copied any
--     in-flight legacy data forward into `execution_result` / `error_code`.
--   * All remaining readers in `easy-locs-ea1eb0ed/src` and
--     `easy-locs-ea1eb0ed/supabase/functions` were migrated to the V2
--     columns alongside this drop.
--
-- This migration is the cleanup: it removes the last vestige of the
-- agent_tasks-era schema from the autonomous execution layer.
-- ============================================================================

-- The `system.v_ai_runs` view (recreated by migration
-- 20260425000000_lb1_lifecycle_quota.sql) still references `t.error` to
-- expose a unified error string to the conversation explorer. It must be
-- dropped before we can drop the column, then recreated reading from the
-- canonical `t.error_code` column instead.
DROP VIEW IF EXISTS system.v_ai_runs;

-- ── 1. Re-run the backfill defensively ────────────────────────────────
-- Migration #848 already copied legacy data forward, but a row that was
-- written to the legacy columns *between* that migration and this one
-- (e.g. by a deploy lag) would otherwise lose its data here. The copy is
-- idempotent — only fills V2 columns that are still NULL.
DO $$
DECLARE
  v_has_result BOOLEAN;
  v_has_error  BOOLEAN;
BEGIN
  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns
     WHERE table_schema = 'system'
       AND table_name   = 'execution_tasks'
       AND column_name  = 'result'
  ) INTO v_has_result;

  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns
     WHERE table_schema = 'system'
       AND table_name   = 'execution_tasks'
       AND column_name  = 'error'
  ) INTO v_has_error;

  IF v_has_result THEN
    EXECUTE $sql$
      UPDATE system.execution_tasks
         SET execution_result = result
       WHERE execution_result IS NULL
         AND result IS NOT NULL
    $sql$;
  END IF;

  IF v_has_error THEN
    EXECUTE $sql$
      UPDATE system.execution_tasks
         SET error_code = error
       WHERE error_code IS NULL
         AND error IS NOT NULL
    $sql$;
  END IF;
END $$;

-- ── 1b. Recreate RPC: find_existing_result_by_idempotency_key ────────
-- The function defined in 20260418500000_execution_locks_idempotency.sql
-- reads `result` and `error` directly off `system.execution_tasks`. We
-- must re-source those projections from the canonical V2 columns
-- (`execution_result` and `error_code`) BEFORE dropping the legacy
-- columns, otherwise the DROP COLUMN ... CASCADE would either remove the
-- function or the function body would silently break.
--
-- The RETURNS TABLE signature keeps the column names `result` / `error`
-- so existing callers (`src/core/execution/idempotency-service.ts`
-- `RawExistingRow` shape) continue to work without code changes — these
-- are logical concept names, not DB column names.
CREATE OR REPLACE FUNCTION system.find_existing_result_by_idempotency_key(
  p_key TEXT
) RETURNS TABLE (
  task_id UUID,
  status  system.execution_task_status,
  result  JSONB,
  error   TEXT,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, system
AS $$
  SELECT id, status, execution_result, error_code, created_at, updated_at
    FROM system.execution_tasks
   WHERE idempotency_key = NULLIF(BTRIM(p_key), '')
   ORDER BY created_at DESC
   LIMIT 1;
$$;

REVOKE ALL ON FUNCTION system.find_existing_result_by_idempotency_key(TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION system.find_existing_result_by_idempotency_key(TEXT)
  TO authenticated, service_role;

-- ── 2. Drop the legacy columns ────────────────────────────────────────
ALTER TABLE system.execution_tasks
  DROP COLUMN IF EXISTS result,
  DROP COLUMN IF EXISTS error;

-- ── 3. Recreate the v_ai_runs view against the V2 columns only ────────
-- Mirrors the shape recreated by 20260425000000_lb1_lifecycle_quota.sql,
-- but the `error` projection now reads from `t.error_code` (the canonical
-- V2 terminal error code) since the legacy `t.error` column no longer
-- exists. Consumers (`agentsRepo.listAgentRunsRich` and the AI runs UI)
-- already treat `error` as an opaque string.
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
  -- naturally returns to FALSE. Only post-execute holds count as
  -- "held_for_review" — a row that is in pending_review WITHOUT an
  -- execution_result is a pre-execute approval (LB0 lifecycle) and would
  -- mislead the agent-runs UI.
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
  COALESCE(t.error_code, t.blocked_reason) AS error,
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
