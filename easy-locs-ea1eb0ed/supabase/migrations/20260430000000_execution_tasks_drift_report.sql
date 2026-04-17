-- LC7 (#874) — Drift detection multi-branches
--
-- Adds a `drift_report` JSONB column to system.execution_tasks so the
-- drift detector (supabase/functions/_shared/execution/drift-detector.ts)
-- can attach a structured overlap report when it transitions a dev task
-- to BLOCKED_BY_DRIFT.
--
-- BLOCKED_BY_DRIFT is modeled as the existing `blocked` lifecycle status
-- (Level A) PLUS a sentinel `blocked_reason = 'BLOCKED_BY_DRIFT'`. We
-- intentionally DO NOT introduce a new enum value: doing so would force
-- a schema change on every consumer of execution_task_status, and the
-- task brief explicitly says "state déjà existant" — i.e. reuse blocked.
--
-- The drift_report payload shape (see drift-detector.ts) is:
--   {
--     "computed_at": "2026-04-30T...",
--     "current_branch": "agent-task-874",
--     "compared_against": ["main@<sha>", "agent-task-872", ...],
--     "overlaps": [
--       {
--         "file": "src/foo.ts",
--         "other_ref": "main@<sha>",
--         "current_lines": [12, 30],
--         "other_lines":   [18, 22]
--       }, ...
--     ],
--     "severity": "hard" | "soft"
--   }

ALTER TABLE system.execution_tasks
  ADD COLUMN IF NOT EXISTS drift_report JSONB;

-- Sparse index: only rows with a drift report (very small slice of the
-- table). Used by the admin approvals inbox to surface BLOCKED_BY_DRIFT
-- rows ahead of vanilla blocked rows.
CREATE INDEX IF NOT EXISTS idx_execution_tasks_drift_report
  ON system.execution_tasks ((blocked_reason))
  WHERE drift_report IS NOT NULL;

COMMENT ON COLUMN system.execution_tasks.drift_report IS
  'LC7 (#874) — file/line overlap report attached when blocked_reason = BLOCKED_BY_DRIFT. Null on every other row.';
