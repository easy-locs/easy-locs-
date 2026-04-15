-- Task #331: Set up server-side cron to send prayer push notifications every minute
-- Adds a dedicated pg_cron job that calls the prayer-push-cron Edge Function
-- every minute via pg_net, bypassing the 5-minute autonomous-cron-dispatcher cycle.
-- Includes monitoring via cron_execution_log and alerting for consecutive failures.

-- ── Monitored wrapper for prayer-push-cron ────────────────────────────────────
-- NOTE: pg_net.http_post is async — it enqueues the HTTP request and returns
-- immediately with a request_id. The wrapper logs dispatch success/failure,
-- not Edge Function response status. The Edge Function itself logs outcomes
-- via withEdgeLogging and engine_supervisor updates.
CREATE OR REPLACE FUNCTION public.monitored_prayer_push_cron()
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_log_id uuid;
  v_request_id bigint;
BEGIN
  v_log_id := log_cron_start('prayer-push-cron');
  BEGIN
    SELECT net.http_post(
      current_setting('app.settings.supabase_url') || '/functions/v1/prayer-push-cron',
      '{}',
      '{}',
      jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key')
      )
    ) INTO v_request_id;

    IF v_request_id IS NULL THEN
      PERFORM log_cron_finish(v_log_id, 'failure', 0, 'pg_net returned NULL request_id');
      PERFORM insert_into_dlq(
        'pg_cron',
        'prayer-push-cron',
        jsonb_build_object('trigger', 'pg_cron', 'schedule', '* * * * *'),
        'pg_net returned NULL request_id'
      );
      RETURN;
    END IF;

    PERFORM log_cron_finish(v_log_id, 'success', 0,
      NULL::text);
  EXCEPTION WHEN OTHERS THEN
    PERFORM log_cron_finish(v_log_id, 'failure', 0, SQLERRM);
    PERFORM insert_into_dlq(
      'pg_cron',
      'prayer-push-cron',
      jsonb_build_object('trigger', 'pg_cron', 'schedule', '* * * * *'),
      SQLERRM
    );
  END;
END;
$$;

REVOKE ALL ON FUNCTION public.monitored_prayer_push_cron() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.monitored_prayer_push_cron() TO service_role;

-- ── Schedule prayer-push-cron every minute via pg_cron ────────────────────────
DO $cron_prayer_push$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron')
     AND EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_net') THEN
    BEGIN
      PERFORM cron.unschedule('prayer-push-cron-direct');
    EXCEPTION WHEN OTHERS THEN NULL;
    END;

    PERFORM cron.schedule(
      'prayer-push-cron-direct',
      '* * * * *',
      $cron_body$SELECT public.monitored_prayer_push_cron()$cron_body$
    );
  END IF;
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'prayer-push-cron-direct schedule failed: %', SQLERRM;
END;
$cron_prayer_push$;

-- ── Alerting function for consecutive cron failures ───────────────────────────
CREATE OR REPLACE FUNCTION public.check_prayer_cron_health()
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_consecutive_failures integer;
  v_last_success timestamptz;
  v_total_24h integer;
  v_failures_24h integer;
  v_health_status text;
BEGIN
  WITH ranked AS (
    SELECT status, ROW_NUMBER() OVER (ORDER BY started_at DESC) AS rn
    FROM cron_execution_log
    WHERE job_name = 'prayer-push-cron'
    ORDER BY started_at DESC
    LIMIT 10
  )
  SELECT COALESCE(MIN(rn) FILTER (WHERE status = 'success'), COUNT(*) + 1) - 1
  INTO v_consecutive_failures
  FROM ranked;

  SELECT MAX(started_at) INTO v_last_success
  FROM cron_execution_log
  WHERE job_name = 'prayer-push-cron'
    AND status = 'success';

  SELECT
    COUNT(*),
    COUNT(*) FILTER (WHERE status = 'failure')
  INTO v_total_24h, v_failures_24h
  FROM cron_execution_log
  WHERE job_name = 'prayer-push-cron'
    AND started_at > now() - interval '24 hours';

  IF v_consecutive_failures >= 5 THEN
    v_health_status := 'critical';
  ELSIF v_consecutive_failures >= 3 THEN
    v_health_status := 'degraded';
  ELSIF v_failures_24h > v_total_24h * 0.1 THEN
    v_health_status := 'warning';
  ELSE
    v_health_status := 'healthy';
  END IF;

  IF v_health_status IN ('critical', 'degraded') THEN
    INSERT INTO server_events (event_type, severity, source, message, metadata)
    VALUES (
      'cron_health_alert',
      CASE WHEN v_health_status = 'critical' THEN 'error' ELSE 'warning' END,
      'prayer-push-cron',
      'Prayer push cron health: ' || v_health_status
        || ' (' || v_consecutive_failures || ' consecutive failures)',
      jsonb_build_object(
        'consecutive_failures', v_consecutive_failures,
        'last_success', v_last_success,
        'total_24h', v_total_24h,
        'failures_24h', v_failures_24h
      )
    );
  END IF;

  RETURN jsonb_build_object(
    'status', v_health_status,
    'consecutive_failures', v_consecutive_failures,
    'last_success', v_last_success,
    'total_24h_runs', v_total_24h,
    'failures_24h', v_failures_24h
  );
END;
$$;

REVOKE ALL ON FUNCTION public.check_prayer_cron_health() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.check_prayer_cron_health() TO service_role;

-- ── Schedule health check every 15 minutes ────────────────────────────────────
DO $cron_prayer_health$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN
    BEGIN
      PERFORM cron.unschedule('prayer-push-cron-health');
    EXCEPTION WHEN OTHERS THEN NULL;
    END;

    PERFORM cron.schedule(
      'prayer-push-cron-health',
      '*/15 * * * *',
      $cron_hb$SELECT public.check_prayer_cron_health()$cron_hb$
    );
  END IF;
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'prayer-push-cron-health schedule failed: %', SQLERRM;
END;
$cron_prayer_health$;
