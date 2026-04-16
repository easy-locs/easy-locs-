-- Task #517: Add admin role check to reconcile_cron_responses and reconcile_prayer_push_responses
-- Defense-in-depth: add admin role verification inside the function body
-- in addition to the existing GRANT/REVOKE restrictions.
-- Callers with auth.uid() set must have the admin role.
-- Service-role / cron callers (auth.uid() IS NULL) are allowed through.

-- ── Update reconcile_cron_responses with inline admin guard ─────────────────
CREATE OR REPLACE FUNCTION public.reconcile_cron_responses()
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _uid uuid := auth.uid();
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
  IF _uid IS NOT NULL THEN
    IF NOT COALESCE(public.has_role(_uid, 'admin'), false) THEN
      RAISE EXCEPTION 'admin role required';
    END IF;
  END IF;

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

-- ── Update reconcile_prayer_push_responses with inline admin guard ──────────
CREATE OR REPLACE FUNCTION public.reconcile_prayer_push_responses()
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _uid uuid := auth.uid();
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
  IF _uid IS NOT NULL THEN
    IF NOT COALESCE(public.has_role(_uid, 'admin'), false) THEN
      RAISE EXCEPTION 'admin role required';
    END IF;
  END IF;

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
