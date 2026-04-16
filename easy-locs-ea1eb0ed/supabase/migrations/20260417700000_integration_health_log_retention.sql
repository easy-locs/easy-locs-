CREATE OR REPLACE FUNCTION analytics.purge_integration_health_logs(
  retention_days INTEGER DEFAULT 90
)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = analytics
AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  IF retention_days < 1 OR retention_days > 3650 THEN
    RAISE EXCEPTION 'retention_days must be between 1 and 3650, got %', retention_days;
  END IF;

  DELETE FROM analytics.integration_health_log
  WHERE checked_at < now() - (retention_days || ' days')::INTERVAL;

  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$;

REVOKE ALL ON FUNCTION analytics.purge_integration_health_logs(INTEGER) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION analytics.purge_integration_health_logs(INTEGER) TO service_role;

COMMENT ON FUNCTION analytics.purge_integration_health_logs IS
  'Deletes integration_health_log rows older than retention_days (default 90). Restricted to service_role only. Called by cleanup-integration-health-logs edge function on a daily schedule. Task #602.';
