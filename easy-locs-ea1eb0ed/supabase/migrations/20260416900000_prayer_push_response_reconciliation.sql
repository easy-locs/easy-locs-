-- Task #393: Add response status tracking for prayer push cron dispatches
-- The monitored_prayer_push_cron() wrapper uses pg_net.http_post which is async.
-- It currently logs dispatch success but cannot verify the Edge Function's HTTP
-- response status. This migration adds:
--   1. request_id tracking in cron_execution_log metadata
--   2. A reconciliation function that checks net._http_response
--   3. Accurate status updates when the Edge Function returns non-2xx
--   4. Alerts via server_events when the Edge Function itself fails

-- ── Update monitored wrapper to store pg_net request_id ────────────────────
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

    UPDATE cron_execution_log
    SET metadata = jsonb_build_object(
      'pg_net_request_id', v_request_id,
      'dispatch_status', 'dispatched',
      'reconciled', false
    )
    WHERE id = v_log_id;

    PERFORM log_cron_finish(v_log_id, 'success', 0, NULL::text);
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

-- ── Reconciliation function ────────────────────────────────────────────────
-- Checks net._http_response for completed prayer-push-cron dispatches and
-- updates cron_execution_log to reflect actual Edge Function outcomes.
-- Handles: HTTP error responses, transport-level failures (timed_out, error_msg),
-- and stale dispatches that never received a response.
CREATE OR REPLACE FUNCTION public.reconcile_prayer_push_responses()
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_rec record;
  v_http_status smallint;
  v_response_body text;
  v_error_msg text;
  v_timed_out boolean;
  v_response_found boolean;
  v_reconciled integer := 0;
  v_failures integer := 0;
  v_pending integer := 0;
  v_stale integer := 0;
  v_log_id uuid;
  v_failure_reason text;
  v_severity text;
BEGIN
  v_log_id := log_cron_start('prayer-push-reconcile');

  BEGIN
    FOR v_rec IN
      WITH candidates AS (
        SELECT cel.id AS log_id,
               (cel.metadata->>'pg_net_request_id')::bigint AS request_id,
               cel.started_at
        FROM cron_execution_log cel
        WHERE cel.job_name = 'prayer-push-cron'
          AND cel.status = 'success'
          AND cel.metadata ? 'pg_net_request_id'
          AND (cel.metadata->>'reconciled')::boolean IS NOT TRUE
          AND cel.started_at > now() - interval '24 hours'
        ORDER BY cel.started_at DESC
        LIMIT 200
        FOR UPDATE OF cel SKIP LOCKED
      )
      SELECT * FROM candidates
    LOOP
      v_response_found := false;
      v_http_status := NULL;
      v_response_body := NULL;
      v_error_msg := NULL;
      v_timed_out := NULL;

      SELECT r.status_code,
             r.content::text,
             r.error_msg,
             r.timed_out
      INTO v_http_status, v_response_body, v_error_msg, v_timed_out
      FROM net._http_response r
      WHERE r.id = v_rec.request_id;

      v_response_found := FOUND;

      IF NOT v_response_found THEN
        IF v_rec.started_at < now() - interval '10 minutes' THEN
          UPDATE cron_execution_log
          SET
            status = 'failure',
            error_message = 'pg_net response missing after 10 minutes (stale dispatch)',
            metadata = COALESCE(metadata, '{}'::jsonb) || jsonb_build_object(
              'reconciled', true,
              'dispatch_status', 'stale_no_response'
            )
          WHERE id = v_rec.log_id;

          INSERT INTO server_events (event_type, severity, source, message, metadata)
          VALUES (
            'cron_edge_function_error',
            'error',
            'prayer-push-cron',
            'prayer-push-cron: pg_net response missing after 10 minutes (stale dispatch)',
            jsonb_build_object(
              'cron_log_id', v_rec.log_id,
              'pg_net_request_id', v_rec.request_id,
              'dispatch_status', 'stale_no_response'
            )
          );

          PERFORM insert_into_dlq(
            'pg_cron',
            'prayer-push-cron',
            jsonb_build_object(
              'trigger', 'pg_cron_reconciliation',
              'dispatch_status', 'stale_no_response',
              'cron_log_id', v_rec.log_id
            ),
            'pg_net response missing after 10 minutes (stale dispatch)'
          );

          v_stale := v_stale + 1;
          v_failures := v_failures + 1;
          v_reconciled := v_reconciled + 1;
        ELSE
          v_pending := v_pending + 1;
        END IF;
        CONTINUE;
      END IF;

      IF v_timed_out IS TRUE THEN
        v_failure_reason := 'pg_net request timed out';
        v_severity := 'error';
      ELSIF v_error_msg IS NOT NULL AND v_error_msg <> '' THEN
        v_failure_reason := format('pg_net transport error: %s', left(v_error_msg, 500));
        v_severity := 'error';
      ELSIF v_http_status IS NULL THEN
        v_failure_reason := 'pg_net response has no status code (transport failure)';
        v_severity := 'error';
      ELSIF v_http_status >= 200 AND v_http_status < 300 THEN
        UPDATE cron_execution_log
        SET metadata = COALESCE(metadata, '{}'::jsonb) || jsonb_build_object(
          'reconciled', true,
          'http_status', v_http_status,
          'dispatch_status', 'confirmed_success'
        )
        WHERE id = v_rec.log_id;

        v_reconciled := v_reconciled + 1;
        CONTINUE;
      ELSE
        v_failure_reason := format(
          'Edge Function returned HTTP %s: %s',
          v_http_status,
          left(COALESCE(v_response_body, ''), 500)
        );
        v_severity := CASE WHEN v_http_status >= 500 THEN 'error' ELSE 'warning' END;
      END IF;

      UPDATE cron_execution_log
      SET
        status = 'failure',
        error_message = v_failure_reason,
        metadata = COALESCE(metadata, '{}'::jsonb) || jsonb_build_object(
          'reconciled', true,
          'http_status', v_http_status,
          'timed_out', COALESCE(v_timed_out, false),
          'transport_error', COALESCE(v_error_msg, ''),
          'dispatch_status', 'edge_function_error',
          'response_body', left(COALESCE(v_response_body, ''), 1000)
        )
      WHERE id = v_rec.log_id;

      v_failures := v_failures + 1;
      v_reconciled := v_reconciled + 1;

      INSERT INTO server_events (event_type, severity, source, message, metadata)
      VALUES (
        'cron_edge_function_error',
        v_severity,
        'prayer-push-cron',
        format('prayer-push-cron: %s', left(v_failure_reason, 200)),
        jsonb_build_object(
          'http_status', v_http_status,
          'timed_out', COALESCE(v_timed_out, false),
          'transport_error', COALESCE(v_error_msg, ''),
          'cron_log_id', v_rec.log_id,
          'pg_net_request_id', v_rec.request_id,
          'response_preview', left(COALESCE(v_response_body, ''), 500)
        )
      );

      PERFORM insert_into_dlq(
        'pg_cron',
        'prayer-push-cron',
        jsonb_build_object(
          'trigger', 'pg_cron_reconciliation',
          'http_status', v_http_status,
          'timed_out', COALESCE(v_timed_out, false),
          'cron_log_id', v_rec.log_id
        ),
        left(v_failure_reason, 500)
      );
    END LOOP;

    PERFORM log_cron_finish(v_log_id, 'success', v_reconciled, NULL::text);
  EXCEPTION WHEN OTHERS THEN
    PERFORM log_cron_finish(v_log_id, 'failure', 0, SQLERRM);
  END;

  RETURN jsonb_build_object(
    'reconciled', v_reconciled,
    'failures_found', v_failures,
    'still_pending', v_pending,
    'stale_expired', v_stale
  );
END;
$$;

REVOKE ALL ON FUNCTION public.reconcile_prayer_push_responses() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.reconcile_prayer_push_responses() TO service_role;

-- ── Update health check to account for reconciled failures ─────────────────
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
  v_edge_failures_24h integer;
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
    COUNT(*) FILTER (WHERE status = 'failure'),
    COUNT(*) FILTER (WHERE status = 'failure'
      AND metadata->>'dispatch_status' = 'edge_function_error')
  INTO v_total_24h, v_failures_24h, v_edge_failures_24h
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
        'failures_24h', v_failures_24h,
        'edge_function_failures_24h', v_edge_failures_24h
      )
    );
  END IF;

  RETURN jsonb_build_object(
    'status', v_health_status,
    'consecutive_failures', v_consecutive_failures,
    'last_success', v_last_success,
    'total_24h_runs', v_total_24h,
    'failures_24h', v_failures_24h,
    'edge_function_failures_24h', v_edge_failures_24h
  );
END;
$$;

REVOKE ALL ON FUNCTION public.check_prayer_cron_health() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.check_prayer_cron_health() TO service_role;

-- ── Schedule reconciliation every 2 minutes ────────────────────────────────
DO $cron_reconcile$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron')
     AND EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_net') THEN
    BEGIN
      PERFORM cron.unschedule('prayer-push-reconcile');
    EXCEPTION WHEN OTHERS THEN NULL;
    END;

    PERFORM cron.schedule(
      'prayer-push-reconcile',
      '*/2 * * * *',
      $cron_body$SELECT public.reconcile_prayer_push_responses()$cron_body$
    );
  END IF;
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'prayer-push-reconcile schedule failed: %', SQLERRM;
END;
$cron_reconcile$;
