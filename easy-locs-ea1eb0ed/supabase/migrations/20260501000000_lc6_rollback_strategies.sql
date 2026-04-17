-- ============================================================================
-- LC6 — Verifier + rollback for dev tasks · rollback strategy registry
-- (task #877)
--
-- Sovereign Agent Control · Level A L3 (#811) introduced the per-task
-- `rollback_strategy` posture column (auto/manual/none) and the
-- `system.request_rollback` RPC. LC6 adds a NAMED registry of concrete
-- rollback IMPLEMENTATIONS so a code-domain task can opt in to a specific
-- strategy (e.g. `revert_pr` for production GitHub deploys) without
-- redefining the lifecycle.
--
-- This migration:
--   1. Creates `system.rollback_strategies` (name + kind + description +
--      metadata).
--   2. Seeds the `revert_pr` row consumed by LC6's auto-rollback hook
--      (`maybeAutoRollbackAfterDeploy`) and by `system.request_rollback`
--      callers that pass `metadata.rollback_strategy_name`.
--   3. Restricts writes to `service_role` / `super_admin` so a malicious
--      authenticated user cannot register a rogue strategy.
--
-- Reuses Level A L3 — does NOT touch `system.execution_tasks` columns or
-- the existing `request_rollback` RPC. The new table is a registry only.
-- ============================================================================

CREATE TABLE IF NOT EXISTS system.rollback_strategies (
  name         TEXT PRIMARY KEY,
  kind         TEXT NOT NULL,
  description  TEXT NOT NULL,
  metadata     JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT rollback_strategies_kind_chk
    CHECK (kind IN ('git.revert', 'db.restore', 'http.replay', 'custom'))
);

COMMENT ON TABLE system.rollback_strategies IS
  'LC6 (#877) — Named registry of rollback implementations referenced by ' ||
  'execution_tasks.metadata.rollback_strategy_name. The lifecycle itself ' ||
  '(rolling_back / rolled_back / rollback_failed) lives on execution_tasks ' ||
  'per Level A L3.';

-- Update trigger so `updated_at` is honest.
CREATE OR REPLACE FUNCTION system.rollback_strategies_touch_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_rollback_strategies_updated_at
  ON system.rollback_strategies;
CREATE TRIGGER trg_rollback_strategies_updated_at
  BEFORE UPDATE ON system.rollback_strategies
  FOR EACH ROW EXECUTE FUNCTION system.rollback_strategies_touch_updated_at();

-- ── RLS — registry is read-by-everyone (authenticated), write by admins ──
ALTER TABLE system.rollback_strategies ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS rollback_strategies_select_authenticated
  ON system.rollback_strategies;
CREATE POLICY rollback_strategies_select_authenticated
  ON system.rollback_strategies FOR SELECT
  TO authenticated
  USING (TRUE);

DROP POLICY IF EXISTS rollback_strategies_write_super_admin
  ON system.rollback_strategies;
CREATE POLICY rollback_strategies_write_super_admin
  ON system.rollback_strategies
  FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'super_admin'::public.app_role))
  WITH CHECK (public.has_role(auth.uid(), 'super_admin'::public.app_role));

-- ── Seed: revert_pr ──────────────────────────────────────────────────────
-- Mirrors `_shared/execution/rollback/revert-pr.ts` (REVERT_PR_STRATEGY_SLUG).
-- The concrete implementation lives in TypeScript; this row is the
-- single-source-of-truth name that `maybeAutoRollbackAfterDeploy` and
-- the dispatch wrapper validate against.
INSERT INTO system.rollback_strategies (name, kind, description, metadata)
VALUES (
  'revert_pr',
  'git.revert',
  'Revert a merged PR / commit on the production branch via the GitHub ' ||
  'REST API. Creates a NEW commit (no force-push). Idempotent: detects ' ||
  'a prior revert by commit-message marker. Used by deploy.prod auto-' ||
  'rollback when post-deploy health check fails inside the LC6 5-minute ' ||
  'watch window.',
  jsonb_build_object(
    'level', 'C',
    'task', '#877',
    'requires_secret', 'GITHUB_REVERT_TOKEN',
    'marker', 'lc6-revert-pr',
    'idempotent', TRUE,
    'fail_loud', TRUE
  )
)
ON CONFLICT (name) DO UPDATE SET
  description = EXCLUDED.description,
  metadata    = system.rollback_strategies.metadata
                  || EXCLUDED.metadata;

-- ── Audit ────────────────────────────────────────────────────────────────
DO $$ BEGIN
  INSERT INTO public.engine_run_logs (
    engine_name, category, status, started_at, finished_at, duration_ms,
    effect_summary, metadata_json, trigger_source
  ) VALUES (
    'lc6-bootstrap', 'rollback.strategies.seed', 'ok', now(), now(), 0,
    'LC6_BOOTSTRAP system.rollback_strategies + revert_pr seed registered',
    jsonb_build_object('task', '#877', 'level', 'C'),
    'migration'
  );
EXCEPTION WHEN OTHERS THEN NULL; END $$;
