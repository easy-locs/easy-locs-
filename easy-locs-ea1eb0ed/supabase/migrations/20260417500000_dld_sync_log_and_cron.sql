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

SELECT cron.unschedule('dld-sync-daily') WHERE EXISTS (
  SELECT 1 FROM cron.job WHERE jobname = 'dld-sync-daily'
);

SELECT cron.schedule(
  'dld-sync-daily',
  '0 3 * * *',
  $$SELECT net.http_post(
    url := current_setting('app.settings.supabase_url') || '/functions/v1/dld-sync-cron',
    headers := jsonb_build_object(
      'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key'),
      'Content-Type', 'application/json'
    ),
    body := '{"mode":"full"}'::jsonb
  )$$
);

SELECT cron.unschedule('dld-sync-hourly') WHERE EXISTS (
  SELECT 1 FROM cron.job WHERE jobname = 'dld-sync-hourly'
);

SELECT cron.schedule(
  'dld-sync-hourly',
  '15 * * * *',
  $$SELECT net.http_post(
    url := current_setting('app.settings.supabase_url') || '/functions/v1/dld-sync-cron',
    headers := jsonb_build_object(
      'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key'),
      'Content-Type', 'application/json'
    ),
    body := '{"mode":"recent"}'::jsonb
  )$$
);
