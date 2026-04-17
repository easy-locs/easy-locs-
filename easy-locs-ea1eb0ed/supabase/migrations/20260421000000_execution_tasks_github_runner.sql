-- GitHub Actions Runner Bridge — Phase 1 schema additions (#816)
-- Adds runner routing and callback state columns to system.execution_tasks.
-- All new columns have safe defaults and are non-destructive on existing rows.

-- runner: where the task executes.
-- 'internal' (default) = existing execution-loop agent path.
-- 'github'             = GitHub Actions runner bridge (this task).
-- Existing rows backfilled to 'internal' via the UPDATE below.
ALTER TABLE system.execution_tasks
  ADD COLUMN IF NOT EXISTS runner TEXT NOT NULL DEFAULT 'internal'
  CHECK (runner IN ('internal', 'github'));

-- Backfill existing rows (idempotent; new rows already get the default).
UPDATE system.execution_tasks
  SET runner = 'internal'
  WHERE runner IS DISTINCT FROM 'internal';

-- external_run_url: authoritative GitHub Actions run URL.
-- Set by the execution-runner-callback Edge Function on the first RUNNING
-- callback from the workflow. Always overwritten by the callback (source of truth).
ALTER TABLE system.execution_tasks
  ADD COLUMN IF NOT EXISTS external_run_url TEXT;

-- pr_url: GitHub PR URL opened by the runner.
-- Set by execution-runner-callback on SUCCESS; null until the PR is opened.
ALTER TABLE system.execution_tasks
  ADD COLUMN IF NOT EXISTS pr_url TEXT;

-- runner_token_hash: stores HMAC-SHA256(RUNNER_HMAC_KEY, task_id).
-- Computed by execution-loop when dispatching; the GitHub Actions runner
-- computes the same HMAC from its repo secret and sends it in X-Runner-Token.
-- Cleared to NULL by the callback on SUCCESS/FAILED for one-shot replay protection.
ALTER TABLE system.execution_tasks
  ADD COLUMN IF NOT EXISTS runner_token_hash TEXT;

-- Sparse index for monitoring queries that filter by runner type.
CREATE INDEX IF NOT EXISTS idx_execution_tasks_runner
  ON system.execution_tasks (runner)
  WHERE runner <> 'internal';
