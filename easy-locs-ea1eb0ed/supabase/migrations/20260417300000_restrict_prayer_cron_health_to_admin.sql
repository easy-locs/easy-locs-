-- Task #479: Restrict check_prayer_cron_health RPC to admin users only
-- Defense-in-depth: add admin role verification inside the function body
-- in addition to the existing GRANT/REVOKE restrictions.
-- Callers with auth.uid() set must have the admin role.
-- Service-role / cron callers (auth.uid() IS NULL) are allowed through.

-- ── Update check_cron_dispatch_health with inline admin guard ─────────────
CREATE OR REPLACE FUNCTION public.check_cron_dispatch_health(p_job_name text DEFAULT NULL)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _uid uuid := auth.uid();
  v_consecutive_failures integer;
  v_last_success timestamptz;
  v_total_24h integer;
  v_failures_24h integer;
  v_edge_failures_24h integer;
  v_health_status text;
  v_job_filter text;
BEGIN
  IF _uid IS NOT NULL THEN
    IF NOT COALESCE(public.has_role(_uid, 'admin'), false) THEN
      RAISE EXCEPTION 'admin role required';
    END IF;
  END IF;

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

-- ── Update check_prayer_cron_health with inline admin guard ───────────────
CREATE OR REPLACE FUNCTION public.check_prayer_cron_health()
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _uid uuid := auth.uid();
BEGIN
  IF _uid IS NOT NULL THEN
    IF NOT COALESCE(public.has_role(_uid, 'admin'), false) THEN
      RAISE EXCEPTION 'admin role required';
    END IF;
  END IF;

  RETURN check_cron_dispatch_health('prayer-push-cron');
END;
$$;

REVOKE ALL ON FUNCTION public.check_prayer_cron_health() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.check_prayer_cron_health() TO service_role;
