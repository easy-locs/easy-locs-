DO $$
DECLARE
  constraint_name TEXT;
BEGIN
  SELECT c.conname INTO constraint_name
  FROM pg_constraint c
  JOIN pg_class t ON c.conrelid = t.oid
  JOIN pg_namespace n ON t.relnamespace = n.oid
  WHERE n.nspname = 'commerce'
    AND t.relname = 'bnpl_plans'
    AND c.contype = 'c'
    AND pg_get_constraintdef(c.oid) LIKE '%status%';

  IF constraint_name IS NOT NULL THEN
    EXECUTE format('ALTER TABLE commerce.bnpl_plans DROP CONSTRAINT %I', constraint_name);
  END IF;
END $$;

ALTER TABLE commerce.bnpl_plans
  ADD CONSTRAINT bnpl_plans_status_check
  CHECK (status IN ('created', 'approved', 'active', 'completed', 'overdue', 'defaulted'));

ALTER TABLE commerce.bnpl_plans
  ALTER COLUMN status SET DEFAULT 'created';

DROP INDEX IF EXISTS commerce.idx_bnpl_plans_status;
CREATE INDEX idx_bnpl_plans_status ON commerce.bnpl_plans(status) WHERE status IN ('created', 'approved', 'active');

COMMENT ON TABLE commerce.bnpl_plans IS 'BNPL plans with full lifecycle: created -> approved -> active -> completed | overdue | defaulted. Task #575.';
