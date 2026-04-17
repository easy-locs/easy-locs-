-- ============================================================================
-- Goals + Planner + Learning Memory (Phase 1 & 2 of self-evolving system)
--
-- system.execution_tasks remains the canonical, governed task table for
-- system-dispatched work. public.agent_tasks (Command Center prompt log) is
-- preserved as the user-facing prompt journal — the trigger-github edge
-- function bridges agent_tasks → execution_tasks via dispatch_execution_task,
-- so all GitHub runs flow through the orchestrator while the user-facing
-- prompt history continues to live in agent_tasks (with RLS).
--
-- This migration:
--   1. CREATES system.goals             — user-stated objectives
--   2. CREATES system.goal_iterations   — planner runs with feedback metrics
--   3. CREATES system.learning_memory   — patterns the planner reads to improve
--   4. ADDS    goal_id to system.execution_tasks (link tasks to their goal)
--   5. EXTENDS system.classify_task_risk to recognize GITHUB.WORKFLOW_DISPATCH
--
-- All new tables are RLS owner-only. Service-role bypasses for the planner.
-- ============================================================================

-- ── 2. system.goals ───────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS system.goals (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id        UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title           TEXT NOT NULL,
  description     TEXT NOT NULL DEFAULT '',
  status          TEXT NOT NULL DEFAULT 'active'
                  CHECK (status IN ('active','paused','succeeded','failed','archived')),
  priority        INT  NOT NULL DEFAULT 0,
  iteration_count INT  NOT NULL DEFAULT 0,
  last_planned_at TIMESTAMPTZ,
  last_result     JSONB,
  metadata        JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS goals_owner_id_idx     ON system.goals (owner_id, created_at DESC);
CREATE INDEX IF NOT EXISTS goals_status_idx       ON system.goals (status);

ALTER TABLE system.goals ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "goals_select_own" ON system.goals;
CREATE POLICY "goals_select_own" ON system.goals
  FOR SELECT TO authenticated
  USING (owner_id = auth.uid());

DROP POLICY IF EXISTS "goals_insert_own" ON system.goals;
CREATE POLICY "goals_insert_own" ON system.goals
  FOR INSERT TO authenticated
  WITH CHECK (owner_id = auth.uid());

DROP POLICY IF EXISTS "goals_update_own" ON system.goals;
CREATE POLICY "goals_update_own" ON system.goals
  FOR UPDATE TO authenticated
  USING (owner_id = auth.uid())
  WITH CHECK (owner_id = auth.uid());

GRANT SELECT, INSERT, UPDATE ON system.goals TO authenticated;
GRANT ALL ON system.goals TO service_role;

-- ── 3. system.goal_iterations ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS system.goal_iterations (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  goal_id               UUID NOT NULL REFERENCES system.goals(id) ON DELETE CASCADE,
  iteration_number      INT  NOT NULL,
  plan                  JSONB NOT NULL DEFAULT '{}'::jsonb,
  dispatched_task_ids   UUID[] NOT NULL DEFAULT '{}',
  result                JSONB,
  success               BOOLEAN,
  metrics               JSONB NOT NULL DEFAULT '{}'::jsonb,
  started_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
  ended_at              TIMESTAMPTZ,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (goal_id, iteration_number)
);
CREATE INDEX IF NOT EXISTS goal_iterations_goal_idx ON system.goal_iterations (goal_id, iteration_number DESC);

ALTER TABLE system.goal_iterations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "goal_iterations_select_own" ON system.goal_iterations;
CREATE POLICY "goal_iterations_select_own" ON system.goal_iterations
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM system.goals g
      WHERE g.id = goal_iterations.goal_id
        AND g.owner_id = auth.uid()
    )
  );

GRANT SELECT ON system.goal_iterations TO authenticated;
GRANT ALL ON system.goal_iterations TO service_role;

-- ── 4. system.learning_memory ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS system.learning_memory (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id        UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  pattern_key     TEXT NOT NULL,
  pattern_data    JSONB NOT NULL DEFAULT '{}'::jsonb,
  success_count   INT NOT NULL DEFAULT 0,
  failure_count   INT NOT NULL DEFAULT 0,
  last_used_at    TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (owner_id, pattern_key)
);
CREATE INDEX IF NOT EXISTS learning_memory_owner_idx ON system.learning_memory (owner_id, last_used_at DESC NULLS LAST);

ALTER TABLE system.learning_memory ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "learning_memory_select_own" ON system.learning_memory;
CREATE POLICY "learning_memory_select_own" ON system.learning_memory
  FOR SELECT TO authenticated
  USING (owner_id = auth.uid());

GRANT SELECT ON system.learning_memory TO authenticated;
GRANT ALL ON system.learning_memory TO service_role;

-- ── 5. Link execution_tasks to goals ──────────────────────────────────────
ALTER TABLE system.execution_tasks
  ADD COLUMN IF NOT EXISTS goal_id UUID REFERENCES system.goals(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS execution_tasks_goal_idx
  ON system.execution_tasks (goal_id) WHERE goal_id IS NOT NULL;

-- Allow goal owners to read THEIR execution_tasks (read-only).
-- This is the user-facing per-goal timeline; mutations remain dispatch-only.
DROP POLICY IF EXISTS "execution_tasks_select_via_goal" ON system.execution_tasks;
CREATE POLICY "execution_tasks_select_via_goal" ON system.execution_tasks
  FOR SELECT TO authenticated
  USING (
    goal_id IS NOT NULL
    AND EXISTS (
      SELECT 1 FROM system.goals g
      WHERE g.id = system.execution_tasks.goal_id
        AND g.owner_id = auth.uid()
    )
  );

GRANT SELECT ON system.execution_tasks TO authenticated;

-- ── 6. Extend risk classification: GITHUB.WORKFLOW_DISPATCH = MEDIUM ─────
-- Allowlisted, auto-runnable. The adapter enforces a server-side workflow
-- allowlist; the user cannot influence which workflow file runs.
CREATE OR REPLACE FUNCTION system.classify_task_risk(_type TEXT)
RETURNS system.execution_task_risk
LANGUAGE plpgsql
IMMUTABLE
AS $$
DECLARE
  v_t TEXT := UPPER(BTRIM(COALESCE(_type, '')));
BEGIN
  -- SAFE: read-only / report / cache refresh / smoke test
  IF v_t IN (
    'NOOP','SMOKE_NOOP','REPORT.GENERATE','CACHE.REFRESH',
    'PLANNER.NOTE'
  ) THEN
    RETURN 'SAFE'::system.execution_task_risk;
  END IF;

  -- MEDIUM: marketplace listing flows + GitHub workflow dispatch
  IF v_t IN (
    'MARKETPLACE.LISTING.PUBLISH','MARKETPLACE.LISTING.UNPUBLISH',
    'GITHUB.WORKFLOW_DISPATCH'
  ) THEN
    RETURN 'MEDIUM'::system.execution_task_risk;
  END IF;

  -- Deny-by-default: unrecognized → CRITICAL (= blocked in Phase 1).
  RETURN 'CRITICAL'::system.execution_task_risk;
END;
$$;
REVOKE ALL ON FUNCTION system.classify_task_risk(TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION system.classify_task_risk(TEXT) TO authenticated, service_role;

-- ── 7. updated_at triggers for new tables ────────────────────────────────
CREATE OR REPLACE FUNCTION system.set_updated_at_now()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at := now(); RETURN NEW; END;
$$;

DROP TRIGGER IF EXISTS goals_set_updated_at ON system.goals;
CREATE TRIGGER goals_set_updated_at
  BEFORE UPDATE ON system.goals
  FOR EACH ROW EXECUTE FUNCTION system.set_updated_at_now();

DROP TRIGGER IF EXISTS learning_memory_set_updated_at ON system.learning_memory;
CREATE TRIGGER learning_memory_set_updated_at
  BEFORE UPDATE ON system.learning_memory
  FOR EACH ROW EXECUTE FUNCTION system.set_updated_at_now();
