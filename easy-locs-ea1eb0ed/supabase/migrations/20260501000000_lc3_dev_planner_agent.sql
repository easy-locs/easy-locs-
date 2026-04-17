-- ============================================================================
-- LC3 — Dev planner agent · registry seed (task #876).
--
-- Registers the `dev.planner` agent so the Level C builder loop (LC4) and
-- any operator-tooling can dispatch through the canonical execution
-- pipeline:
--
--   - dev.planner   kind=ai.router   profile=dev-default
--                   capability=(plan, PLAN_CODE_CHANGE)
--
-- The planner produces a plan only — it never invokes a tool. Its plans
-- are persisted onto the originating `system.execution_tasks` row under
-- `payload.plan` (and mirrored at `payload.dev_plan`) by the
-- `dev-planner` edge function.
--
-- The agent's risk floor is intentionally LOW: planning is read-only
-- LLM work. Sensitive code changes are caught later by LC5's
-- `dev-sensitive` policy when the BUILDER actually dispatches a step.
--
-- Idempotent: rerunnable; `register_agent` upserts. Policy profile
-- `dev-default` is seeded by LC2 (#872) and LC5 (#873); we depend on
-- one of those having run first, but the migration is still safe to
-- replay.
-- ============================================================================

-- ── 1. Register the dev.planner agent ────────────────────────────────────
SELECT system.register_agent(
  p_slug              := 'dev.planner',
  p_display_name      := 'Dev Planner',
  p_agent_kind        := 'ai.router',
  p_initial_version   := '1.0.0',
  p_owner_team        := 'platform-dev',
  p_status            := 'active',
  p_policy_profile    := 'dev-default',
  p_quotas            := jsonb_build_object(
    'max_runs_per_min', 60,
    'max_runs_per_day', 2000
  ),
  p_metadata          := jsonb_build_object(
    'description',
      'Decomposes a developer intent into an ordered list of code.edit / ' ||
      'build.run / test.run steps. Plan-only: never dispatches a tool. ' ||
      'Drives the LC4 builder loop.',
    'rollback_strategy', 'none',
    'sensitive_classifier', FALSE,
    'plan_only', TRUE,
    'allowed_tools', jsonb_build_array('code.edit', 'build.run', 'test.run'),
    'level', 'C'
  ),
  p_capabilities      := jsonb_build_array(
    jsonb_build_object('domain', 'plan', 'task_type', 'plan_code_change')
  ),
  p_changelog         := 'LC3 initial registration (#876)'
);

-- ── 2. Audit ─────────────────────────────────────────────────────────────
DO $$ BEGIN
  INSERT INTO public.engine_run_logs (
    engine_name, category, status, started_at, finished_at, duration_ms,
    effect_summary, metadata_json, trigger_source
  ) VALUES (
    'lc3-bootstrap', 'agents.seed', 'ok', now(), now(), 0,
    'LC3_BOOTSTRAP dev.planner registered (plan-only, dev-default policy)',
    jsonb_build_object('task', '#876', 'level', 'C'),
    'migration'
  );
EXCEPTION WHEN OTHERS THEN NULL; END $$;
