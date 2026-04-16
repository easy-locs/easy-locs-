CREATE TABLE IF NOT EXISTS analytics.dld_sync_log (
  id            BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  status        TEXT NOT NULL,
  mode          TEXT,
  affected      INTEGER NOT NULL DEFAULT 0,
  errors        INTEGER NOT NULL DEFAULT 0,
  source        TEXT,
  error_message TEXT,
  started_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at  TIMESTAMPTZ,
  duration_ms   INTEGER,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_dld_sync_log_created_at
  ON analytics.dld_sync_log (created_at DESC);

CREATE INDEX IF NOT EXISTS idx_dld_sync_log_status
  ON analytics.dld_sync_log (status);

DO $outer$
BEGIN
  IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'dld-sync-daily') THEN
    PERFORM cron.unschedule('dld-sync-daily');
  END IF;
EXCEPTION WHEN OTHERS THEN NULL;
END;
$outer$;

DO $outer$
BEGIN
  IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'dld-sync-hourly') THEN
    PERFORM cron.unschedule('dld-sync-hourly');
  END IF;
EXCEPTION WHEN OTHERS THEN NULL;
END;
$outer$;

DO $outer$
BEGIN
  IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'dld-sync-monthly') THEN
    PERFORM cron.unschedule('dld-sync-monthly');
  END IF;
EXCEPTION WHEN OTHERS THEN NULL;
END;
$outer$;

SELECT cron.schedule(
  'dld-sync-monthly',
  '0 3 1 * *',
  $$SELECT net.http_post(
    url := current_setting('app.settings.supabase_url') || '/functions/v1/dld-sync-cron',
    headers := jsonb_build_object(
      'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key'),
      'Content-Type', 'application/json'
    ),
    body := '{"mode":"full"}'::jsonb
  )$$
);
