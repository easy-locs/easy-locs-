-- Task #421: Extend response reconciliation to all pg_net cron dispatches
-- Replaces the prayer-push-only reconciliation with a generic system that
-- covers every pg_net-based cron dispatch. All dispatches now flow through
-- monitored_http_dispatch() which stores the pg_net request_id in
-- cron_execution_log metadata so the reconciler can verify actual HTTP outcomes.

-- ── Generic monitored HTTP dispatch ─────────────────────────────────────────
-- Reusable wrapper: logs to cron_execution_log, calls net.http_post, stores
-- the pg_net request_id in metadata for later reconciliation.
CREATE OR REPLACE FUNCTION public.monitored_http_dispatch(
  p_job_name text,
  p_endpoint text,
  p_body jsonb DEFAULT '{}'::jsonb,
  p_requires_auth boolean DEFAULT true
)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_log_id uuid;
  v_request_id bigint;
  v_headers jsonb;
BEGIN
  v_log_id := log_cron_start(p_job_name);
  BEGIN
    IF p_requires_auth THEN
      v_headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key')
      );
    ELSE
      v_headers := jsonb_build_object('Content-Type', 'application/json');
    END IF;

    SELECT net.http_post(
      current_setting('app.settings.supabase_url') || '/functions/v1/' || p_endpoint,
      p_body::text,
      '{}'::text,
      v_headers
    ) INTO v_request_id;

    IF v_request_id IS NULL THEN
      PERFORM log_cron_finish(v_log_id, 'failure', 0, 'pg_net returned NULL request_id');
      PERFORM insert_into_dlq(
        'pg_cron',
        p_job_name,
        jsonb_build_object('trigger', 'pg_cron', 'endpoint', p_endpoint),
        'pg_net returned NULL request_id'
      );
      RETURN;
    END IF;

    UPDATE cron_execution_log
    SET metadata = jsonb_build_object(
      'pg_net_request_id', v_request_id,
      'dispatch_status', 'dispatched',
      'reconciled', false,
      'endpoint', p_endpoint
    )
    WHERE id = v_log_id;

    PERFORM log_cron_finish(v_log_id, 'success', 0, NULL::text);
  EXCEPTION WHEN OTHERS THEN
    PERFORM log_cron_finish(v_log_id, 'failure', 0, SQLERRM);
    PERFORM insert_into_dlq(
      'pg_cron',
      p_job_name,
      jsonb_build_object('trigger', 'pg_cron', 'endpoint', p_endpoint),
      SQLERRM
    );
  END;
END;
$$;

REVOKE ALL ON FUNCTION public.monitored_http_dispatch(text, text, jsonb, boolean) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.monitored_http_dispatch(text, text, jsonb, boolean) TO service_role;

-- ── Update monitored_prayer_push_cron to delegate to generic dispatch ───────
CREATE OR REPLACE FUNCTION public.monitored_prayer_push_cron()
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  PERFORM monitored_http_dispatch('prayer-push-cron', 'prayer-push-cron');
END;
$$;

REVOKE ALL ON FUNCTION public.monitored_prayer_push_cron() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.monitored_prayer_push_cron() TO service_role;

-- ── Upgrade generic reconciliation with full server_events + DLQ support ────
CREATE OR REPLACE FUNCTION public.reconcile_cron_responses()
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
  v_log_id := log_cron_start('cron-response-reconcile');

  BEGIN
    FOR v_rec IN
      WITH candidates AS (
        SELECT cel.id AS log_id,
               cel.job_name,
               (cel.metadata->>'pg_net_request_id')::bigint AS request_id,
               cel.started_at
        FROM cron_execution_log cel
        WHERE cel.status = 'success'
          AND cel.metadata IS NOT NULL
          AND cel.metadata ? 'pg_net_request_id'
          AND (cel.metadata->>'reconciled')::boolean IS NOT TRUE
          AND cel.started_at > now() - interval '24 hours'
        ORDER BY cel.started_at DESC
        LIMIT 500
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
            v_rec.job_name,
            v_rec.job_name || ': pg_net response missing after 10 minutes (stale dispatch)',
            jsonb_build_object(
              'cron_log_id', v_rec.log_id,
              'pg_net_request_id', v_rec.request_id,
              'dispatch_status', 'stale_no_response'
            )
          );

          PERFORM insert_into_dlq(
            'pg_cron',
            v_rec.job_name,
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
        v_rec.job_name,
        format('%s: %s', v_rec.job_name, left(v_failure_reason, 200)),
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
        v_rec.job_name,
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

REVOKE ALL ON FUNCTION public.reconcile_cron_responses() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.reconcile_cron_responses() TO service_role;

-- ── Upgrade health check to be generic (any job_name) ───────────────────────
CREATE OR REPLACE FUNCTION public.check_cron_dispatch_health(p_job_name text DEFAULT NULL)
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
  v_job_filter text;
BEGIN
  v_job_filter := COALESCE(p_job_name, 'prayer-push-cron');

  WITH ranked AS (
    SELECT status, ROW_NUMBER() OVER (ORDER BY started_at DESC) AS rn
    FROM cron_execution_log
    WHERE job_name = v_job_filter
    ORDER BY started_at DESC
    LIMIT 10
  )
  SELECT COALESCE(MIN(rn) FILTER (WHERE status = 'success'), COUNT(*) + 1) - 1
  INTO v_consecutive_failures
  FROM ranked;

  SELECT MAX(started_at) INTO v_last_success
  FROM cron_execution_log
  WHERE job_name = v_job_filter
    AND status = 'success';

  SELECT
    COUNT(*),
    COUNT(*) FILTER (WHERE status = 'failure'),
    COUNT(*) FILTER (WHERE status = 'failure'
      AND metadata->>'dispatch_status' = 'edge_function_error')
  INTO v_total_24h, v_failures_24h, v_edge_failures_24h
  FROM cron_execution_log
  WHERE job_name = v_job_filter
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
      v_job_filter,
      v_job_filter || ' health: ' || v_health_status
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
    'job_name', v_job_filter,
    'status', v_health_status,
    'consecutive_failures', v_consecutive_failures,
    'last_success', v_last_success,
    'total_24h_runs', v_total_24h,
    'failures_24h', v_failures_24h,
    'edge_function_failures_24h', v_edge_failures_24h
  );
END;
$$;

REVOKE ALL ON FUNCTION public.check_cron_dispatch_health(text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.check_cron_dispatch_health(text) TO service_role;

-- ── Keep check_prayer_cron_health as a thin wrapper for backward compat ─────
CREATE OR REPLACE FUNCTION public.check_prayer_cron_health()
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN check_cron_dispatch_health('prayer-push-cron');
END;
$$;

REVOKE ALL ON FUNCTION public.check_prayer_cron_health() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.check_prayer_cron_health() TO service_role;

-- ── Reschedule all pg_net cron dispatches through monitored wrappers ────────
-- This replaces the raw inline net.http_post calls with monitored_http_dispatch
-- so every dispatch gets a cron_execution_log entry with pg_net_request_id.

DO $reschedule_all$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron')
     AND EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_net') THEN

    -- Unschedule old prayer-push reconciliation (replaced by generic)
    BEGIN PERFORM cron.unschedule('prayer-push-reconcile'); EXCEPTION WHEN OTHERS THEN NULL; END;

    -- autonomous-cron-dispatcher: every 5 minutes
    BEGIN PERFORM cron.unschedule('autonomous-cron-dispatcher'); EXCEPTION WHEN OTHERS THEN NULL; END;
    PERFORM cron.schedule(
      'autonomous-cron-dispatcher',
      '*/5 * * * *',
      $$SELECT public.monitored_http_dispatch('autonomous-cron-dispatcher', 'autonomous-cron-dispatcher')$$
    );

    -- dlq-processor: every 2 minutes
    BEGIN PERFORM cron.unschedule('dlq-processor'); EXCEPTION WHEN OTHERS THEN NULL; END;
    PERFORM cron.schedule(
      'dlq-processor',
      '*/2 * * * *',
      $$SELECT public.monitored_http_dispatch('dlq-processor', 'dlq-processor')$$
    );

    -- watchdog-ping: every minute
    BEGIN PERFORM cron.unschedule('watchdog-ping'); EXCEPTION WHEN OTHERS THEN NULL; END;
    PERFORM cron.schedule(
      'watchdog-ping',
      '* * * * *',
      $$SELECT public.monitored_http_dispatch('watchdog-ping', 'watchdog-ping')$$
    );

    -- job-queue-worker: every minute
    BEGIN PERFORM cron.unschedule('job-queue-worker'); EXCEPTION WHEN OTHERS THEN NULL; END;
    PERFORM cron.schedule(
      'job-queue-worker',
      '* * * * *',
      $$SELECT public.monitored_http_dispatch('job-queue-worker', 'job-queue-worker')$$
    );

    -- cache-manager-refresh: every 5 minutes
    BEGIN PERFORM cron.unschedule('cache-manager-refresh'); EXCEPTION WHEN OTHERS THEN NULL; END;
    PERFORM cron.schedule(
      'cache-manager-refresh',
      '*/5 * * * *',
      $$SELECT public.monitored_http_dispatch('cache-manager-refresh', 'cache-manager', '{"action":"refresh_all"}'::jsonb)$$
    );

    -- backup-storage-nightly: daily at 3 AM UTC
    BEGIN PERFORM cron.unschedule('backup-storage-nightly'); EXCEPTION WHEN OTHERS THEN NULL; END;
    PERFORM cron.schedule(
      'backup-storage-nightly',
      '0 3 * * *',
      $$SELECT public.monitored_http_dispatch('backup-storage-nightly', 'backup-storage')$$
    );

    -- external-health-check: every minute (no auth)
    BEGIN PERFORM cron.unschedule('external-health-check'); EXCEPTION WHEN OTHERS THEN NULL; END;
    PERFORM cron.schedule(
      'external-health-check',
      '* * * * *',
      $$SELECT public.monitored_http_dispatch('external-health-check', 'public-health', '{}'::jsonb, false)$$
    );

    -- email-queue-process: every 2 minutes
    BEGIN PERFORM cron.unschedule('email-queue-process'); EXCEPTION WHEN OTHERS THEN NULL; END;
    PERFORM cron.schedule(
      'email-queue-process',
      '*/2 * * * *',
      $$SELECT public.monitored_http_dispatch('email-queue-process', 'email-queue-process')$$
    );

    -- process-job-queue: every minute
    BEGIN PERFORM cron.unschedule('process-job-queue'); EXCEPTION WHEN OTHERS THEN NULL; END;
    PERFORM cron.schedule(
      'process-job-queue',
      '* * * * *',
      $$SELECT public.monitored_http_dispatch('process-job-queue', 'job-runner', '{"action":"process","batchSize":10}'::jsonb)$$
    );

    -- expire-pending-referrals: daily at 2 AM UTC
    BEGIN PERFORM cron.unschedule('expire-pending-referrals'); EXCEPTION WHEN OTHERS THEN NULL; END;
    PERFORM cron.schedule(
      'expire-pending-referrals',
      '0 2 * * *',
      $$SELECT public.monitored_http_dispatch('expire-pending-referrals', 'expire-pending-referrals')$$
    );

    -- cleanup-orphan-media: every 6 hours
    BEGIN PERFORM cron.unschedule('cleanup-orphan-media'); EXCEPTION WHEN OTHERS THEN NULL; END;
    PERFORM cron.schedule(
      'cleanup-orphan-media',
      '0 */6 * * *',
      $$SELECT public.monitored_http_dispatch('cleanup-orphan-media', 'cleanup-orphan-media')$$
    );

    -- Unified reconciliation: every 2 minutes (replaces prayer-push-reconcile)
    BEGIN PERFORM cron.unschedule('cron-response-reconcile'); EXCEPTION WHEN OTHERS THEN NULL; END;
    PERFORM cron.schedule(
      'cron-response-reconcile',
      '*/2 * * * *',
      $$SELECT public.reconcile_cron_responses()$$
    );

  END IF;
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'Unified cron reschedule failed: %', SQLERRM;
END;
$reschedule_all$;

-- ── Index to speed up reconciliation queries ────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_cron_log_reconcile_candidates
  ON public.cron_execution_log (started_at DESC)
  WHERE status = 'success'
    AND metadata ? 'pg_net_request_id'
    AND (metadata->>'reconciled')::boolean IS NOT TRUE;
