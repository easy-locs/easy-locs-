-- ============================================================================
-- Task #848 — Migrate the GitHub-runner callback to the V2 result columns.
--
-- The `execution-runner-callback` Edge Function used to write the legacy
-- `result` (JSONB) and `error` (TEXT) columns inherited from the agent_tasks
-- era. The Command Center read both shapes via a merged-object fallback.
--
-- The callback now writes the canonical V2 columns (`execution_result` +
-- `error_code`) only, and the dashboard projection has been simplified to
-- read just the V2 columns. Any GitHub-runner task that was already
-- in-flight at the moment of deploy would otherwise lose its logs /
-- conclusion in the UI, because the row carries data on the legacy
-- columns the dashboard no longer reads.
--
-- This one-shot backfill copies the legacy shape into the V2 shape for
-- every row where the V2 columns are still empty, so old in-flight rows
-- (and any historical rows operators may inspect) keep rendering after
-- the writer migration ships.
-- ============================================================================

DO $$
DECLARE
  v_has_result BOOLEAN;
  v_has_error  BOOLEAN;
BEGIN
  -- Be defensive: only run the copy when the legacy columns are still
  -- present. Once they are dropped in a later cleanup migration this DO
  -- block becomes a no-op without raising.
  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns
     WHERE table_schema = 'system'
       AND table_name   = 'execution_tasks'
       AND column_name  = 'result'
  ) INTO v_has_result;

  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns
     WHERE table_schema = 'system'
       AND table_name   = 'execution_tasks'
       AND column_name  = 'error'
  ) INTO v_has_error;

  IF v_has_result THEN
    EXECUTE $sql$
      UPDATE system.execution_tasks
         SET execution_result = result
       WHERE execution_result IS NULL
         AND result IS NOT NULL
    $sql$;
  END IF;

  IF v_has_error THEN
    EXECUTE $sql$
      UPDATE system.execution_tasks
         SET error_code = error
       WHERE error_code IS NULL
         AND error IS NOT NULL
    $sql$;
  END IF;
END $$;
