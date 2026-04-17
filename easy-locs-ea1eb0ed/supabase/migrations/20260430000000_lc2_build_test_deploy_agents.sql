-- ============================================================================
-- LC2 — Build / Test / Deploy adapters · agent registry seeds (task #872)
--
-- Seeds the four code.tool agents that wrap the dev pipeline so dev.* agents
-- can request build / test / preview-deploy / prod-deploy through the same
-- governed `dispatchExecutionTask` surface as every other adapter:
--
--   - build.run        kind=code.tool   profile=dev-default
--   - test.run         kind=code.tool   profile=dev-default
--   - deploy.preview   kind=code.tool   profile=dev-default
--   - deploy.prod      kind=code.tool   profile=dev-sensitive  (forces
--                                       pending_review via LC5 policy gate)
--
-- The two policy profiles used here are the minimal seed values needed for
-- LC2 to land. LC5 (#875) extends `dev-sensitive` with the path-based hook
-- that forces other code changes (touching `_shared/`, migrations, RLS) into
-- the same approval lane. Profiles are upserted, never replaced wholesale.
--
-- Hard contract:
--   - Idempotent (repeatable migration; re-running is a no-op).
--   - No new secrets in plain text. Vercel access tokens flow via the env
--     var named in agent metadata: `metadata.router.primary.key_env`.
--   - Reuses `system.register_agent` so the audit trail (engine_run_logs
--     `agent.registered`) fires for these agents like any other.
-- ============================================================================

-- ── 1. Policy profiles (seed only; LC5 owns canonical fields) ────────────
-- LC2 only needs these slugs to *exist* so the agents below can reference
-- them. LC5 (#875) owns the canonical risk_floor, quotas, and metadata.
-- We therefore INSERT ... ON CONFLICT DO NOTHING — pre-existing rows
-- (whether seeded by LC5 or hand-edited by an operator) are preserved
-- verbatim so this migration cannot drift LC5 policy semantics.
INSERT INTO system.policy_profiles (
  slug, description, approval_required, risk_floor,
  max_cost_per_run_usd, max_runs_per_min, max_runs_per_day, metadata
) VALUES
  ('dev-default',
   'Default dev-tooling posture: low-risk build / test / preview steps. ' ||
   'No approval; quotas sized for a healthy CI loop. ' ||
   '(Seeded by LC2; LC5 owns canonical values.)',
   FALSE, 'SAFE', 5.00, 60, 5000,
   jsonb_build_object('lc2_seed', TRUE, 'level', 'C')),
  ('dev-sensitive',
   'Dev-tooling posture for irreversible operations: production deploys, ' ||
   'edits to _shared/, migrations, RLS changes. Always pending_review. ' ||
   '(Seeded by LC2; LC5 extends with path-based hooks.)',
   TRUE, 'CRITICAL', 25.00, 5, 100,
   jsonb_build_object('lc2_seed', TRUE, 'lc5_extends', TRUE, 'level', 'C'))
ON CONFLICT (slug) DO NOTHING;

-- ── 2. Register the four code.tool agents + capabilities ─────────────────

-- build.run — wraps `vite build`
SELECT system.register_agent(
  p_slug              := 'build.run',
  p_display_name      := 'Build Runner (Vite)',
  p_agent_kind        := 'code.tool',
  p_initial_version   := '1.0.0',
  p_owner_team        := 'platform-dev',
  p_status            := 'active',
  p_policy_profile    := 'dev-default',
  p_quotas            := jsonb_build_object(
    'max_runs_per_min', 30,
    'max_runs_per_day', 2000
  ),
  p_metadata          := jsonb_build_object(
    'description',
      'Runs `vite build` in a scratch workspace, captures structured logs, ' ||
      'bundle size and build-minutes cost.',
    'rollback_strategy', 'none',
    'cost_unit', 'build_minutes'
  ),
  p_capabilities      := jsonb_build_array(
    jsonb_build_object('domain','build','task_type','BUILD_RUN')
  ),
  p_changelog         := 'LC2 initial registration (#872)'
);

-- test.run — wraps `vitest run`
SELECT system.register_agent(
  p_slug              := 'test.run',
  p_display_name      := 'Test Runner (Vitest)',
  p_agent_kind        := 'code.tool',
  p_initial_version   := '1.0.0',
  p_owner_team        := 'platform-dev',
  p_status            := 'active',
  p_policy_profile    := 'dev-default',
  p_quotas            := jsonb_build_object(
    'max_runs_per_min', 30,
    'max_runs_per_day', 2000
  ),
  p_metadata          := jsonb_build_object(
    'description',
      'Runs the Vitest suite, reports pass/fail/skip + coverage and ' ||
      'build-minutes cost.',
    'rollback_strategy', 'none',
    'cost_unit', 'build_minutes'
  ),
  p_capabilities      := jsonb_build_array(
    jsonb_build_object('domain','test','task_type','TEST_RUN')
  ),
  p_changelog         := 'LC2 initial registration (#872)'
);

-- deploy.preview — Vercel preview deployment
SELECT system.register_agent(
  p_slug              := 'deploy.preview',
  p_display_name      := 'Deploy (Vercel preview)',
  p_agent_kind        := 'code.tool',
  p_initial_version   := '1.0.0',
  p_owner_team        := 'platform-dev',
  p_status            := 'active',
  p_policy_profile    := 'dev-default',
  p_quotas            := jsonb_build_object(
    'max_runs_per_min', 10,
    'max_runs_per_day', 1000
  ),
  p_metadata          := jsonb_build_object(
    'description',
      'Triggers a Vercel preview deployment, captures URL + status.',
    'rollback_strategy', 'none',
    'cost_unit', 'build_minutes',
    'router', jsonb_build_object(
      'primary', jsonb_build_object(
        'provider', 'vercel',
        'key_env', 'VERCEL_ACCESS_TOKEN'
      )
    )
  ),
  p_capabilities      := jsonb_build_array(
    jsonb_build_object('domain','deploy','task_type','DEPLOY_PREVIEW')
  ),
  p_changelog         := 'LC2 initial registration (#872)'
);

-- deploy.prod — Vercel production deployment, dev-sensitive policy
SELECT system.register_agent(
  p_slug              := 'deploy.prod',
  p_display_name      := 'Deploy (Vercel production)',
  p_agent_kind        := 'code.tool',
  p_initial_version   := '1.0.0',
  p_owner_team        := 'platform-dev',
  p_status            := 'active',
  p_policy_profile    := 'dev-sensitive',
  p_quotas            := jsonb_build_object(
    'max_runs_per_min', 2,
    'max_runs_per_day', 50
  ),
  p_metadata          := jsonb_build_object(
    'description',
      'Triggers a Vercel production deployment. Always requires admin ' ||
      'approval via the dev-sensitive policy profile (LC5).',
    'rollback_strategy', 'none',
    'sensitive', TRUE,
    'cost_unit', 'build_minutes',
    'router', jsonb_build_object(
      'primary', jsonb_build_object(
        'provider', 'vercel',
        'key_env', 'VERCEL_ACCESS_TOKEN'
      )
    )
  ),
  p_capabilities      := jsonb_build_array(
    jsonb_build_object('domain','deploy','task_type','DEPLOY_PROD')
  ),
  p_changelog         := 'LC2 initial registration (#872)'
);

-- ── 3. Audit ─────────────────────────────────────────────────────────────
DO $$ BEGIN
  INSERT INTO public.engine_run_logs (
    engine_name, category, status, started_at, finished_at, duration_ms,
    effect_summary, metadata_json, trigger_source
  ) VALUES (
    'lc2-bootstrap', 'agents.seed', 'ok', now(), now(), 0,
    'LC2_BOOTSTRAP build.run / test.run / deploy.preview / deploy.prod registered',
    jsonb_build_object('task', '#872', 'level', 'C'),
    'migration'
  );
EXCEPTION WHEN OTHERS THEN NULL; END $$;
