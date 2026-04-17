-- ============================================================================
-- Level C · LC4 (task #878) — dev.builder agent seed.
--
-- Registers the Dev Builder loop agent. It is the LC4 component that
-- consumes a plan produced by LC3 and runs the LC1 (code.edit) → LC2
-- (build/test) → LC6 (verifier) loop until either:
--   - tests are green and a PR is opened on GitHub, or
--   - LC6 emits a permanent reject, or
--   - the iteration budget is exhausted.
--
-- The runtime lives at:
--   - supabase/functions/dev-builder/index.ts  (HTTP entry, glue)
--   - supabase/functions/_shared/execution/builders/dev-builder-loop.ts
--     (pure driver, vitest-tested)
--
-- Hard contract (mirrored in the loop driver):
--   - kind = "ai.router"  (the builder routes plan steps to LC1/LC2,
--     it does NOT itself mutate code or run shell)
--   - policy_profile = "dev-default"
--   - capabilities  = (domain="code", task_type="execute_dev_plan")
--   - quotas.max_iterations = 5  (loop hard upper bound)
-- ============================================================================

SELECT system.register_agent(
  p_slug              := 'dev.builder',
  p_display_name      := 'Dev Builder Loop Agent',
  p_agent_kind        := 'ai.router',
  p_initial_version   := '1.0.0',
  p_owner_team        := 'platform',
  p_status            := 'active',
  p_policy_profile    := 'dev-default',
  p_quotas            := jsonb_build_object(
    'max_runs_per_min', 30,
    'max_runs_per_day', 1000,
    'max_iterations',   5
  ),
  p_metadata          := jsonb_build_object(
    'description',
      'Consumes a plan produced by LC3 and executes it in a bounded loop: code.edit (LC1) → build.run / test.run (LC2) → verifier (LC6). On green, opens a PR via the GitHub REST API with the aggregated diff and a link to the run. On red, requests a replan from LC3 and retries until quotas.max_iterations is reached.',
    'rollback_strategy',  'none',
    'verifier',           'lc6.dev',
    'pipeline',           jsonb_build_array('LC1','LC2','LC6'),
    'opens_pr',           TRUE
  ),
  p_capabilities      := jsonb_build_array(
    jsonb_build_object('domain','code','task_type','execute_dev_plan')
  ),
  p_changelog         := 'LC4 initial registration (#878)'
);
