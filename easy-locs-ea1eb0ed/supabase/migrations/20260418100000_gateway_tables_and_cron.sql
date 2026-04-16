CREATE TABLE IF NOT EXISTS gateway_connector_state (
  connector_id TEXT PRIMARY KEY,
  connector_name TEXT NOT NULL,
  domain TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  last_sync_at TIMESTAMPTZ,
  last_success_at TIMESTAMPTZ,
  last_error TEXT,
  last_record_count INTEGER DEFAULT 0,
  last_duration_ms INTEGER DEFAULT 0,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS gateway_sync_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  connector_id TEXT NOT NULL,
  domain TEXT NOT NULL,
  record_count INTEGER NOT NULL DEFAULT 0,
  success BOOLEAN NOT NULL DEFAULT false,
  source_type TEXT NOT NULL DEFAULT 'cron',
  synced_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  total_bytes INTEGER DEFAULT 0,
  duration_ms INTEGER DEFAULT 0,
  error TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_gateway_sync_events_connector ON gateway_sync_events (connector_id, synced_at DESC);
CREATE INDEX IF NOT EXISTS idx_gateway_sync_events_synced_at ON gateway_sync_events (synced_at DESC);

CREATE TABLE IF NOT EXISTS gateway_normalized_data (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  connector_id TEXT NOT NULL,
  domain TEXT NOT NULL,
  data JSONB NOT NULL DEFAULT '{}',
  raw_size INTEGER NOT NULL DEFAULT 0,
  ingested_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_gateway_normalized_data_connector ON gateway_normalized_data (connector_id, ingested_at DESC);

CREATE TABLE IF NOT EXISTS gateway_webhook_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source TEXT NOT NULL,
  domain TEXT NOT NULL DEFAULT 'custom',
  record_count INTEGER NOT NULL DEFAULT 0,
  payload_preview TEXT,
  received_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  status TEXT NOT NULL DEFAULT 'received'
);

CREATE INDEX IF NOT EXISTS idx_gateway_webhook_log_source ON gateway_webhook_log (source, received_at DESC);

ALTER TABLE gateway_connector_state ENABLE ROW LEVEL SECURITY;
ALTER TABLE gateway_sync_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE gateway_normalized_data ENABLE ROW LEVEL SECURITY;
ALTER TABLE gateway_webhook_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin read gateway_connector_state"
  ON gateway_connector_state FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role IN ('admin', 'super_admin')
    )
  );

CREATE POLICY "Admin read gateway_sync_events"
  ON gateway_sync_events FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role IN ('admin', 'super_admin')
    )
  );

CREATE POLICY "Admin read gateway_normalized_data"
  ON gateway_normalized_data FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role IN ('admin', 'super_admin')
    )
  );

CREATE POLICY "Admin read gateway_webhook_log"
  ON gateway_webhook_log FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role IN ('admin', 'super_admin')
    )
  );

SELECT cron.schedule(
  'gateway-sync-every-5-min',
  '*/5 * * * *',
  $$
  SELECT net.http_post(
    url := current_setting('app.settings.supabase_url') || '/functions/v1/gateway-cron-sync',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key'),
      'x-cron-secret', current_setting('app.settings.cron_secret')
    ),
    body := '{}'::jsonb
  );
  $$
);

CREATE OR REPLACE FUNCTION gateway_cleanup_old_events()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  DELETE FROM gateway_sync_events WHERE created_at < now() - INTERVAL '30 days';
  DELETE FROM gateway_normalized_data WHERE ingested_at < now() - INTERVAL '30 days';
  DELETE FROM gateway_webhook_log WHERE received_at < now() - INTERVAL '30 days';
END;
$$;

SELECT cron.schedule(
  'gateway-cleanup-old-events',
  '0 3 * * *',
  $$ SELECT gateway_cleanup_old_events(); $$
);
