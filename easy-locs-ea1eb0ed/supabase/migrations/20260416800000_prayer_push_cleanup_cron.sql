CREATE OR REPLACE FUNCTION cleanup_old_prayer_push_schedules()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  rows_deleted integer;
BEGIN
  DELETE FROM prayer_push_schedules
  WHERE schedule_date < CURRENT_DATE - INTERVAL '7 days';

  GET DIAGNOSTICS rows_deleted = ROW_COUNT;
  RETURN rows_deleted;
END;
$$;

REVOKE ALL ON FUNCTION cleanup_old_prayer_push_schedules() FROM anon, authenticated;
GRANT EXECUTE ON FUNCTION cleanup_old_prayer_push_schedules() TO service_role;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_extension WHERE extname = 'pg_cron'
  ) THEN
    RAISE WARNING 'pg_cron extension not available — skipping prayer push cleanup cron job';
    RETURN;
  END IF;

  BEGIN
    PERFORM cron.unschedule('cleanup-prayer-push-schedules');
  EXCEPTION
    WHEN OTHERS THEN
      RAISE NOTICE 'No existing cleanup-prayer-push-schedules job to unschedule';
  END;

  PERFORM cron.schedule(
    'cleanup-prayer-push-schedules',
    '0 3 * * *',
    'SELECT cleanup_old_prayer_push_schedules()'
  );

  RAISE NOTICE 'Scheduled cleanup-prayer-push-schedules cron job at 03:00 UTC daily';
END;
$$;
