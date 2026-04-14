-- Task #100: Infrastructure Backend — Cron Monitoring + Pooling
-- NOTE: job_queue table already exists in 20260414300000_autonomous_engine_systems.sql

-- ── cron_execution_log ──────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.cron_execution_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  job_name text NOT NULL,
  started_at timestamptz NOT NULL DEFAULT now(),
  finished_at timestamptz,
  status text NOT NULL DEFAULT 'running' CHECK (status IN ('running','success','failure')),
  duration_ms integer,
  error_message text,
  rows_affected integer,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_cron_log_job_name ON public.cron_execution_log (job_name);
CREATE INDEX IF NOT EXISTS idx_cron_log_started ON public.cron_execution_log (started_at DESC);
CREATE INDEX IF NOT EXISTS idx_cron_log_status ON public.cron_execution_log (status);

ALTER TABLE public.cron_execution_log ENABLE ROW LEVEL SECURITY;

DO $guard_cron_log$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'cron_execution_log' AND policyname = 'service_role_cron_log'
  ) THEN
    CREATE POLICY service_role_cron_log ON public.cron_execution_log
      FOR ALL USING (auth.role() = 'service_role');
  END IF;
END;
$guard_cron_log$;

DO $guard_cron_log_admin$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'cron_execution_log' AND policyname = 'admin_read_cron_log'
  ) THEN
    CREATE POLICY admin_read_cron_log ON public.cron_execution_log
      FOR SELECT USING (public.is_admin(auth.uid()));
  END IF;
END;
$guard_cron_log_admin$;

-- ── log_cron_execution RPCs ─────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.log_cron_start(p_job_name text)
RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_id uuid;
BEGIN
  INSERT INTO cron_execution_log (job_name, started_at, status)
  VALUES (p_job_name, now(), 'running')
  RETURNING id INTO v_id;
  RETURN v_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.log_cron_finish(
  p_log_id uuid,
  p_status text DEFAULT 'success',
  p_rows_affected integer DEFAULT 0,
  p_error_message text DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE cron_execution_log
  SET
    finished_at = now(),
    status = p_status,
    duration_ms = EXTRACT(EPOCH FROM (now() - started_at))::integer * 1000,
    rows_affected = p_rows_affected,
    error_message = p_error_message
  WHERE id = p_log_id;
END;
$$;

REVOKE ALL ON FUNCTION public.log_cron_start(text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.log_cron_start(text) TO service_role;

REVOKE ALL ON FUNCTION public.log_cron_finish(uuid, text, integer, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.log_cron_finish(uuid, text, integer, text) TO service_role;

-- ── Monitored cron wrapper ─────────────────────────────────────────────────
-- Wraps existing cron cleanup functions with logging
CREATE OR REPLACE FUNCTION public.monitored_cleanup_expired_cache()
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_log_id uuid;
  v_count integer;
BEGIN
  v_log_id := log_cron_start('cleanup-expired-cache');
  BEGIN
    DELETE FROM server_cache WHERE expires_at IS NOT NULL AND expires_at < now();
    GET DIAGNOSTICS v_count = ROW_COUNT;
    PERFORM log_cron_finish(v_log_id, 'success', v_count);
  EXCEPTION WHEN OTHERS THEN
    PERFORM log_cron_finish(v_log_id, 'failure', 0, SQLERRM);
  END;
END;
$$;

CREATE OR REPLACE FUNCTION public.monitored_cleanup_rate_limits()
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_log_id uuid;
  v_count integer;
BEGIN
  v_log_id := log_cron_start('cleanup-rate-limits');
  BEGIN
    DELETE FROM rate_limits WHERE window_start < now() - interval '5 minutes';
    GET DIAGNOSTICS v_count = ROW_COUNT;
    PERFORM log_cron_finish(v_log_id, 'success', v_count);
  EXCEPTION WHEN OTHERS THEN
    PERFORM log_cron_finish(v_log_id, 'failure', 0, SQLERRM);
  END;
END;
$$;

CREATE OR REPLACE FUNCTION public.monitored_cleanup_old_uptime_logs()
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_log_id uuid;
  v_count integer;
BEGIN
  v_log_id := log_cron_start('cleanup-uptime-logs');
  BEGIN
    DELETE FROM system_uptime_log WHERE created_at < now() - interval '7 days';
    GET DIAGNOSTICS v_count = ROW_COUNT;
    PERFORM log_cron_finish(v_log_id, 'success', v_count);
  EXCEPTION WHEN OTHERS THEN
    PERFORM log_cron_finish(v_log_id, 'failure', 0, SQLERRM);
  END;
END;
$$;

CREATE OR REPLACE FUNCTION public.monitored_cleanup_server_events()
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_log_id uuid;
  v_count integer;
BEGIN
  v_log_id := log_cron_start('cleanup-server-events');
  BEGIN
    PERFORM cleanup_old_server_events();
    v_count := 0;
    PERFORM log_cron_finish(v_log_id, 'success', v_count);
  EXCEPTION WHEN OTHERS THEN
    PERFORM log_cron_finish(v_log_id, 'failure', 0, SQLERRM);
  END;
END;
$$;

CREATE OR REPLACE FUNCTION public.monitored_prune_cron_logs()
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_log_id uuid;
  v_count integer;
BEGIN
  v_log_id := log_cron_start('prune-cron-execution-log');
  BEGIN
    DELETE FROM cron_execution_log WHERE created_at < now() - interval '30 days';
    GET DIAGNOSTICS v_count = ROW_COUNT;
    PERFORM log_cron_finish(v_log_id, 'success', v_count);
  EXCEPTION WHEN OTHERS THEN
    PERFORM log_cron_finish(v_log_id, 'failure', 0, SQLERRM);
  END;
END;
$$;

CREATE OR REPLACE FUNCTION public.monitored_prune_completed_jobs()
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_log_id uuid;
  v_count integer;
BEGIN
  v_log_id := log_cron_start('prune-completed-jobs');
  BEGIN
    DELETE FROM job_queue WHERE status IN ('completed','dead') AND completed_at < now() - interval '7 days';
    GET DIAGNOSTICS v_count = ROW_COUNT;
    PERFORM log_cron_finish(v_log_id, 'success', v_count);
  EXCEPTION WHEN OTHERS THEN
    PERFORM log_cron_finish(v_log_id, 'failure', 0, SQLERRM);
  END;
END;
$$;

REVOKE ALL ON FUNCTION public.monitored_cleanup_expired_cache() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.monitored_cleanup_rate_limits() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.monitored_cleanup_old_uptime_logs() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.monitored_cleanup_server_events() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.monitored_prune_cron_logs() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.monitored_prune_completed_jobs() FROM PUBLIC, anon, authenticated;

GRANT EXECUTE ON FUNCTION public.monitored_cleanup_expired_cache() TO service_role;
GRANT EXECUTE ON FUNCTION public.monitored_cleanup_rate_limits() TO service_role;
GRANT EXECUTE ON FUNCTION public.monitored_cleanup_old_uptime_logs() TO service_role;
GRANT EXECUTE ON FUNCTION public.monitored_cleanup_server_events() TO service_role;
GRANT EXECUTE ON FUNCTION public.monitored_prune_cron_logs() TO service_role;
GRANT EXECUTE ON FUNCTION public.monitored_prune_completed_jobs() TO service_role;

-- ── Schedule monitored cron jobs ───────────────────────────────────────────
DO $cron_monitored$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN
    PERFORM cron.unschedule('prune-cron-execution-log');
    PERFORM cron.schedule(
      'prune-cron-execution-log',
      '0 4 * * *',
      $cron_body$SELECT public.monitored_prune_cron_logs()$cron_body$
    );

    PERFORM cron.unschedule('prune-completed-jobs');
    PERFORM cron.schedule(
      'prune-completed-jobs',
      '0 5 * * *',
      $cron_body2$SELECT public.monitored_prune_completed_jobs()$cron_body2$
    );

    BEGIN
      PERFORM cron.unschedule('server-events-cleanup');
    EXCEPTION WHEN OTHERS THEN NULL;
    END;
    PERFORM cron.schedule(
      'server-events-cleanup',
      '0 * * * *',
      $cron_body3$SELECT public.monitored_cleanup_server_events()$cron_body3$
    );

    PERFORM cron.schedule(
      'cache-cleanup',
      '*/30 * * * *',
      $cron_body4$SELECT public.monitored_cleanup_expired_cache()$cron_body4$
    );

    PERFORM cron.schedule(
      'rate-limit-cleanup',
      '*/5 * * * *',
      $cron_body5$SELECT public.monitored_cleanup_rate_limits()$cron_body5$
    );

    PERFORM cron.schedule(
      'uptime-log-cleanup',
      '0 3 * * *',
      $cron_body6$SELECT public.monitored_cleanup_old_uptime_logs()$cron_body6$
    );
  END IF;
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'pg_cron scheduling failed: %', SQLERRM;
END;
$cron_monitored$;

-- ── Supavisor connection pooling settings ──────────────────────────────────
-- These are reference settings; actual Supavisor config is managed via
-- Supabase dashboard (Database > Connection Pooling). Recommended:
--   Pool Mode: transaction
--   Pool Size: 15 (free tier) / 50 (pro tier)
--   Statement Timeout: 30s for API, 120s for cron jobs
--   Default Pool Size: 15
-- Application should use port 6543 (pooler) instead of 5432 (direct)
-- for all non-migration connections.

DO $pooling_note$
BEGIN
  RAISE NOTICE 'Supavisor pooling: use port 6543 (transaction mode) for API connections, port 5432 for migrations only';
END;
$pooling_note$;

ALTER DATABASE postgres SET statement_timeout = '30s';
