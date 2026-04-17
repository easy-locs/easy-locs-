-- Task #973: Schedule the merge-conflict recovery spike alert evaluator.
--
-- Calls the `merge-conflict-recovery-alerts-cron` edge function once an
-- hour. The function pulls the last 14 days of merge-conflict recovery
-- audits, projects them, evaluates env-configured thresholds, and fans
-- matching alerts out via the existing `alert-dispatcher`.
--
-- Auth model mirrors `command-monitoring-cron`: an internal secret is
-- carried in `x-internal-secret`, constant-time compared on the edge.
-- We therefore call `net.http_post` directly (bypassing the generic
-- `monitored_http_dispatch`, which only knows how to send Bearer auth)
-- but still write a row into `cron_execution_log` so failures surface in
-- the operator dashboards alongside every other cron job.

CREATE OR REPLACE FUNCTION public.monitored_merge_conflict_recovery_alerts_cron()
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_log_id uuid;
  v_request_id bigint;
BEGIN
  v_log_id := log_cron_start('merge-conflict-recovery-alerts-cron');
  BEGIN
    SELECT net.http_post(
      current_setting('app.settings.supabase_url') || '/functions/v1/merge-conflict-recovery-alerts-cron',
      '{}'::text,
      '{}'::text,
      jsonb_build_object(
        'Content-Type', 'application/json',
        'x-internal-secret', current_setting('app.settings.internal_secret')
      )
    ) INTO v_request_id;

    IF v_request_id IS NULL THEN
      PERFORM log_cron_finish(v_log_id, 'failure', 0, 'pg_net returned NULL request_id');
      PERFORM insert_into_dlq(
        'pg_cron',
        'merge-conflict-recovery-alerts-cron',
        jsonb_build_object('trigger', 'pg_cron', 'endpoint', 'merge-conflict-recovery-alerts-cron'),
        'pg_net returned NULL request_id'
      );
      RETURN;
    END IF;

    UPDATE cron_execution_log
    SET metadata = jsonb_build_object(
      'pg_net_request_id', v_request_id,
      'dispatch_status', 'dispatched',
      'reconciled', false,
      'endpoint', 'merge-conflict-recovery-alerts-cron'
    )
    WHERE id = v_log_id;

    PERFORM log_cron_finish(v_log_id, 'success', 0, NULL::text);
  EXCEPTION WHEN OTHERS THEN
    PERFORM log_cron_finish(v_log_id, 'failure', 0, SQLERRM);
    PERFORM insert_into_dlq(
      'pg_cron',
      'merge-conflict-recovery-alerts-cron',
      jsonb_build_object('trigger', 'pg_cron', 'endpoint', 'merge-conflict-recovery-alerts-cron'),
      SQLERRM
    );
  END;
END;
$$;

REVOKE ALL ON FUNCTION public.monitored_merge_conflict_recovery_alerts_cron() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.monitored_merge_conflict_recovery_alerts_cron() TO service_role;

-- ── Schedule hourly via pg_cron ─────────────────────────────────────────────
DO $cron_mcra$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron')
     AND EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_net') THEN
    BEGIN
      PERFORM cron.unschedule('merge-conflict-recovery-alerts-cron');
    EXCEPTION WHEN OTHERS THEN NULL;
    END;

    PERFORM cron.schedule(
      'merge-conflict-recovery-alerts-cron',
      '0 * * * *',
      $cron_body$SELECT public.monitored_merge_conflict_recovery_alerts_cron()$cron_body$
    );
  END IF;
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'merge-conflict-recovery-alerts-cron schedule failed: %', SQLERRM;
END;
$cron_mcra$;
