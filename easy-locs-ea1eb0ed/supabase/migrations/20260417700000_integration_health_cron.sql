-- Task #601: Auto-schedule integration health checks every 5 minutes
-- Uses pg_cron + pg_net to call the integration-health-cron Edge Function,
-- with monitoring via cron_execution_log and a cleanup job for old log rows.

-- ── Monitored wrapper for integration-health-cron ──────────────────────────
CREATE OR REPLACE FUNCTION public.monitored_integration_health_cron()
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  PERFORM monitored_http_dispatch('integration-health-cron', 'integration-health-cron', '{}'::jsonb, true);
END;
$$;

REVOKE ALL ON FUNCTION public.monitored_integration_health_cron() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.monitored_integration_health_cron() TO service_role;

-- ── Schedule integration health check every 5 minutes via pg_cron ──────────
DO $cron_integration_health$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron')
     AND EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_net') THEN
    BEGIN
      PERFORM cron.unschedule('integration-health-cron');
    EXCEPTION WHEN OTHERS THEN NULL;
    END;

    PERFORM cron.schedule(
      'integration-health-cron',
      '*/5 * * * *',
      $cron_body$SELECT public.monitored_integration_health_cron()$cron_body$
    );
  END IF;
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'integration-health-cron schedule failed: %', SQLERRM;
END;
$cron_integration_health$;

-- ── Cleanup: prune integration health logs older than 90 days ──────────────
CREATE OR REPLACE FUNCTION public.monitored_prune_integration_health_log()
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_log_id uuid;
  v_count integer;
BEGIN
  v_log_id := log_cron_start('prune-integration-health-log');
  BEGIN
    DELETE FROM analytics.integration_health_log WHERE checked_at < now() - interval '90 days';
    GET DIAGNOSTICS v_count = ROW_COUNT;
    PERFORM log_cron_finish(v_log_id, 'success', v_count);
  EXCEPTION WHEN OTHERS THEN
    PERFORM log_cron_finish(v_log_id, 'failure', 0, SQLERRM);
  END;
END;
$$;

REVOKE ALL ON FUNCTION public.monitored_prune_integration_health_log() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.monitored_prune_integration_health_log() TO service_role;

DO $cron_prune_health_log$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN
    BEGIN
      PERFORM cron.unschedule('prune-integration-health-log');
    EXCEPTION WHEN OTHERS THEN NULL;
    END;

    PERFORM cron.schedule(
      'prune-integration-health-log',
      '0 2 * * 0',
      $cron_body$SELECT public.monitored_prune_integration_health_log()$cron_body$
    );
  END IF;
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'prune-integration-health-log schedule failed: %', SQLERRM;
END;
$cron_prune_health_log$;
