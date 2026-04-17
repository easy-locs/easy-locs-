-- ============================================================================
-- Level C · L5 — Approval policy for code changes (Task #873)
--
-- Adds the two named policy profiles that govern every `domain = 'code'`
-- execution task produced by the dev-builder pipeline (LC1 .. LC4):
--
--   * dev-default   — UI / docs / tests / non-shared component edits.
--                     Auto-approved (no human review required).
--   * dev-sensitive — Edits that touch the shared edge-function code,
--                     SQL migrations, RLS policy files, or any task of
--                     type `deploy.prod`. ALWAYS pending_review (human
--                     reviewer must release via the Level A · L5 inbox).
--
-- The matching itself lives in the TypeScript hook
-- `supabase/functions/_shared/execution/policies/dev-policy.ts` so it can
-- run in the dispatch pre-execute pipeline before the RPC is invoked.
-- The DB-side row is the canonical declaration of the profile (referenced
-- by `system.agents.policy_profile_id`) plus a machine-readable metadata
-- mirror of the rule list — the hook is the source of truth, the DB row
-- is the audit-friendly snapshot. They MUST stay aligned (see the test
-- in `src/__tests__/lc5-dev-policy.integration.test.ts`).
--
-- This migration is idempotent: it UPSERTs both profiles so re-running it
-- is a no-op, and any prior `dev-default` seed (from #808) is preserved
-- via `ON CONFLICT (slug) DO UPDATE` rather than recreated.
-- ============================================================================

INSERT INTO system.policy_profiles (
  slug, description, approval_required, risk_floor,
  max_runs_per_min, max_runs_per_day, metadata
) VALUES
  (
    'dev-default',
    'Dev / build agents — low-risk code changes (UI, docs, tests).',
    FALSE,
    'SAFE',
    60,
    2000,
    jsonb_build_object(
      'level', 'C',
      'task', '873',
      'auto_approve', TRUE,
      'sensitive_path_rules', '[]'::jsonb,
      'sensitive_task_types', '[]'::jsonb,
      'notes', 'See supabase/functions/_shared/execution/policies/dev-policy.ts'
    )
  ),
  (
    'dev-sensitive',
    'Dev / build agents — sensitive changes (shared code, migrations, RLS, deploy.prod). Always pending_review.',
    TRUE,
    'MEDIUM',
    20,
    400,
    jsonb_build_object(
      'level', 'C',
      'task', '873',
      'auto_approve', FALSE,
      -- IDs only — patterns/descriptions live in the TS hook (single
      -- source of truth) so the DB row never drifts out of sync.
      'sensitive_path_rule_ids', jsonb_build_array(
        'shared-edge-functions',
        'sql-migrations',
        'rls-policies'
      ),
      'sensitive_task_types', jsonb_build_array('DEPLOY.PROD'),
      'rules_source', 'supabase/functions/_shared/execution/policies/dev-policy.ts'
    )
  )
ON CONFLICT (slug) DO UPDATE
  SET description       = EXCLUDED.description,
      approval_required = EXCLUDED.approval_required,
      risk_floor        = EXCLUDED.risk_floor,
      max_runs_per_min  = EXCLUDED.max_runs_per_min,
      max_runs_per_day  = EXCLUDED.max_runs_per_day,
      metadata          = system.policy_profiles.metadata || EXCLUDED.metadata;
