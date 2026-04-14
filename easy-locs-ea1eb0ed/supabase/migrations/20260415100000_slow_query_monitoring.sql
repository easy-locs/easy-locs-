-- Slow Query Monitoring Infrastructure
-- Enables pg_stat_statements for query performance tracking
-- Threshold: 500ms for slow query classification

-- Enable pg_stat_statements extension (if available and not already enabled)
CREATE EXTENSION IF NOT EXISTS pg_stat_statements;

-- Create a table to store slow query snapshots for dashboard display
CREATE TABLE IF NOT EXISTS admin_slow_query_log (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  query_text text NOT NULL,
  calls bigint NOT NULL DEFAULT 0,
  total_exec_time_ms double precision NOT NULL DEFAULT 0,
  mean_exec_time_ms double precision NOT NULL DEFAULT 0,
  max_exec_time_ms double precision NOT NULL DEFAULT 0,
  min_exec_time_ms double precision NOT NULL DEFAULT 0,
  rows_returned bigint NOT NULL DEFAULT 0,
  snapshot_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_slow_query_log_snapshot
  ON admin_slow_query_log (snapshot_at DESC);

CREATE INDEX IF NOT EXISTS idx_slow_query_log_mean_time
  ON admin_slow_query_log (mean_exec_time_ms DESC);

-- RLS: only admins can read slow query logs
ALTER TABLE admin_slow_query_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY admin_slow_query_read ON admin_slow_query_log
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- Function to capture slow queries (mean > 500ms) from pg_stat_statements
CREATE OR REPLACE FUNCTION capture_slow_queries(threshold_ms double precision DEFAULT 500)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  captured_count integer;
BEGIN
  INSERT INTO admin_slow_query_log (query_text, calls, total_exec_time_ms, mean_exec_time_ms, max_exec_time_ms, min_exec_time_ms, rows_returned)
  SELECT
    query,
    calls,
    total_exec_time,
    mean_exec_time,
    max_exec_time,
    min_exec_time,
    rows
  FROM pg_stat_statements
  WHERE mean_exec_time >= threshold_ms
    AND calls > 0
    AND query NOT LIKE '%pg_stat_statements%'
  ORDER BY mean_exec_time DESC
  LIMIT 50;

  GET DIAGNOSTICS captured_count = ROW_COUNT;
  RETURN captured_count;
END;
$$;

-- View for quick dashboard access to recent slow queries
CREATE OR REPLACE VIEW admin_slow_queries_latest AS
SELECT
  id,
  LEFT(query_text, 200) AS query_preview,
  calls,
  round(mean_exec_time_ms::numeric, 2) AS avg_ms,
  round(max_exec_time_ms::numeric, 2) AS max_ms,
  rows_returned,
  snapshot_at
FROM admin_slow_query_log
WHERE snapshot_at > now() - interval '24 hours'
ORDER BY mean_exec_time_ms DESC
LIMIT 100;

-- Auto-cleanup: remove logs older than 30 days
CREATE OR REPLACE FUNCTION cleanup_old_slow_query_logs()
RETURNS void
LANGUAGE sql
SECURITY DEFINER
AS $$
  DELETE FROM admin_slow_query_log
  WHERE snapshot_at < now() - interval '30 days';
$$;

-- Schedule periodic slow query capture and cleanup via pg_cron (if available)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN
    PERFORM cron.schedule(
      'capture-slow-queries',
      '*/15 * * * *',
      'SELECT capture_slow_queries(500);'
    );
    PERFORM cron.schedule(
      'cleanup-slow-query-logs',
      '0 3 * * *',
      'SELECT cleanup_old_slow_query_logs();'
    );
  END IF;
END
$$;
