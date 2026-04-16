-- Autonomous Execution Layer — Phase 1, task #711
-- Adds next_retry_at to system.execution_tasks so the server-side execution
-- loop can implement exponential backoff without depending on updated_at
-- (which is overwritten by the BEFORE UPDATE touch trigger).

ALTER TABLE system.execution_tasks
  ADD COLUMN IF NOT EXISTS next_retry_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_execution_tasks_next_retry_at
  ON system.execution_tasks (next_retry_at)
  WHERE status = 'PENDING';
