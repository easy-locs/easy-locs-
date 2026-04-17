-- ============================================================================
-- Level C · LC1 (task #871) — code.edit agent + policy profile seed.
--
-- Registers the sandboxed code-edit primitive consumed by every Level-C
-- agent (planner, builder, verifier). The adapter itself lives at
-- supabase/functions/_shared/execution/adapters/code/code-edit.ts and is
-- bound to the (domain="code", task_type="code.edit") capability via
-- system.register_agent.
--
-- Hard contract (mirrored in the adapter):
--   - kind = "code.tool"
--   - policy_profile = "code-default" (medium risk, no auto-approval for
--     writes that target paths outside the workspace clone — enforced in
--     the adapter via PATH_OUT_OF_SCOPE; the policy profile carries the
--     governance posture).
--   - quotas: 1000 ops/day, 50 MB diff/run.
-- ============================================================================

-- ── 1. policy_profiles seed ───────────────────────────────────────────────
INSERT INTO system.policy_profiles (
  slug, description, approval_required, risk_floor,
  max_cost_per_run_usd, max_runs_per_min, max_runs_per_day, metadata
) VALUES (
  'code-default',
  'Default posture for code-tool agents (Level C). Medium risk: writes are sandboxed to a workspace clone, no network or env access; writes outside the workspace are rejected at the adapter and never auto-approved.',
  FALSE, 'MEDIUM', NULL, 60, 1000,
  jsonb_build_object('lc1', TRUE, 'sandbox', 'worker', 'max_diff_bytes', 52428800)
)
ON CONFLICT (slug) DO UPDATE
  SET description           = EXCLUDED.description,
      approval_required     = EXCLUDED.approval_required,
      risk_floor            = EXCLUDED.risk_floor,
      max_cost_per_run_usd  = EXCLUDED.max_cost_per_run_usd,
      max_runs_per_min      = EXCLUDED.max_runs_per_min,
      max_runs_per_day      = EXCLUDED.max_runs_per_day,
      metadata              = system.policy_profiles.metadata || EXCLUDED.metadata;

-- ── 2. code.edit agent + capability ───────────────────────────────────────
SELECT system.register_agent(
  p_slug              := 'code.edit',
  p_display_name      := 'Code Edit Tool',
  p_agent_kind        := 'code.tool',
  p_initial_version   := '1.0.0',
  p_owner_team        := 'platform',
  p_status            := 'active',
  p_policy_profile    := 'code-default',
  p_quotas            := jsonb_build_object(
    'max_runs_per_min', 60,
    'max_runs_per_day', 1000,
    'max_diff_bytes',   52428800
  ),
  p_metadata          := jsonb_build_object(
    'description',
      'Sandboxed code-edit primitive: read_file, write_file, apply_diff, list_files. Worker has no network and no env access; FS scope is restricted to a workspace temporary clone of the repo. Emits a unified diff plus before/after checksums on every run.',
    'capabilities',         jsonb_build_array('read_file','write_file','apply_diff','list_files'),
    'rollback_strategy',    'none',
    'sandbox',              'worker',
    'max_diff_bytes',       52428800
  ),
  p_capabilities      := jsonb_build_array(
    jsonb_build_object('domain','code','task_type','code.edit')
  ),
  p_changelog         := 'LC1 initial registration (#871)'
);
