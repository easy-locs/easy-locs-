-- Task #100: Infrastructure Backend — Cron Monitoring
-- NOTE: job_queue table already exists in 20260414300000_autonomous_engine_systems.sql
-- This migration only creates cron_execution_log and monitoring RPCs.

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

DO $guard_cron_log_read$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'cron_execution_log' AND policyname = 'authenticated_read_cron_log'
  ) THEN
    CREATE POLICY authenticated_read_cron_log ON public.cron_execution_log
      FOR SELECT USING (auth.role() = 'authenticated');
  END IF;
END;
$guard_cron_log_read$;

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
REVOKE ALL ON FUNCTION public.log_cron_finish(uuid, text, integer, text) FROM PUBLIC, anon, authenticated;

-- ── Auto-prune old logs (keep 30 days) ─────────────────────────────────────
DO $cron_prune$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN
    PERFORM cron.unschedule('prune-cron-execution-log');
    PERFORM cron.schedule(
      'prune-cron-execution-log',
      '0 4 * * *',
      $cron_body$DELETE FROM public.cron_execution_log WHERE created_at < now() - interval '30 days';$cron_body$
    );
  END IF;
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'pg_cron not available, skipping auto-prune schedule';
END;
$cron_prune$;

-- ── Auto-prune completed/dead jobs (keep 7 days) ───────────────────────────
DO $cron_prune_jobs$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN
    PERFORM cron.unschedule('prune-completed-jobs');
    PERFORM cron.schedule(
      'prune-completed-jobs',
      '0 5 * * *',
      $cron_jobs_body$DELETE FROM public.job_queue WHERE status IN ('completed','dead') AND completed_at < now() - interval '7 days';$cron_jobs_body$
    );
  END IF;
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'pg_cron not available, skipping job prune schedule';
END;
$cron_prune_jobs$;
