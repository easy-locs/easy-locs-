CREATE TABLE IF NOT EXISTS analytics.integration_health_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  overall_status TEXT NOT NULL,
  plaid_status TEXT NOT NULL,
  plaid_latency_ms INTEGER,
  livekit_status TEXT NOT NULL,
  livekit_latency_ms INTEGER,
  meilisearch_status TEXT NOT NULL,
  meilisearch_latency_ms INTEGER,
  total_latency_ms INTEGER NOT NULL,
  checked_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_integration_health_log_checked_at
  ON analytics.integration_health_log (checked_at DESC);

ALTER TABLE analytics.integration_health_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "integration_health_log_read_all"
  ON analytics.integration_health_log
  FOR SELECT
  USING (true);

COMMENT ON TABLE analytics.integration_health_log IS 'Stores historical integration health check results for uptime trend analysis. Task #583.';
