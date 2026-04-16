CREATE TABLE IF NOT EXISTS cache_metrics_history (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  endpoint text NOT NULL DEFAULT 'extract-article',
  hits integer NOT NULL DEFAULT 0,
  misses integer NOT NULL DEFAULT 0,
  evictions integer NOT NULL DEFAULT 0,
  expirations integer NOT NULL DEFAULT 0,
  stores integer NOT NULL DEFAULT 0,
  hit_rate numeric(5,2) NOT NULL DEFAULT 0,
  current_size integer NOT NULL DEFAULT 0,
  average_size numeric(7,2) NOT NULL DEFAULT 0,
  uptime_ms bigint NOT NULL DEFAULT 0,
  recorded_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_cache_metrics_history_recorded_at
  ON cache_metrics_history (recorded_at DESC);

CREATE INDEX IF NOT EXISTS idx_cache_metrics_history_endpoint
  ON cache_metrics_history (endpoint, recorded_at DESC);

ALTER TABLE cache_metrics_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "service_role_only_cache_metrics" ON cache_metrics_history
  FOR ALL USING (auth.role() = 'service_role');
