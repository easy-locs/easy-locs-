CREATE TABLE IF NOT EXISTS analytics.dld_backfill_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  months_requested INTEGER NOT NULL,
  months_processed INTEGER NOT NULL,
  total_fetched INTEGER NOT NULL DEFAULT 0,
  total_upserted INTEGER NOT NULL DEFAULT 0,
  total_errors INTEGER NOT NULL DEFAULT 0,
  start_date DATE,
  end_date DATE,
  duration_ms INTEGER NOT NULL DEFAULT 0,
  month_details JSONB DEFAULT '[]'::JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_dld_backfill_log_created
  ON analytics.dld_backfill_log (created_at DESC);

ALTER TABLE analytics.dld_backfill_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "dld_backfill_log_read_all"
  ON analytics.dld_backfill_log
  FOR SELECT
  USING (true);

COMMENT ON TABLE analytics.dld_backfill_log IS 'Tracks historical DLD data backfill runs for audit and monitoring. Task #541.';
