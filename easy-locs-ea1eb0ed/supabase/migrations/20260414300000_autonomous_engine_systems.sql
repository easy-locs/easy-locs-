-- ============================================================
-- Autonomous 24/7 Non-Stop Engine Systems
-- 10 interconnected systems for fully autonomous operation
-- ============================================================

-- 1. Push Notification Tokens
CREATE TABLE IF NOT EXISTS push_tokens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  token text NOT NULL,
  platform text NOT NULL CHECK (platform IN ('web', 'android', 'ios')),
  device_name text,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, token)
);
CREATE INDEX IF NOT EXISTS idx_push_tokens_user ON push_tokens(user_id) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_push_tokens_platform ON push_tokens(platform);

-- 2. Dead Letter Queue
CREATE TABLE IF NOT EXISTS dead_letter_queue (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  source_system text NOT NULL,
  operation_type text NOT NULL,
  payload jsonb NOT NULL DEFAULT '{}',
  error text,
  retry_count integer NOT NULL DEFAULT 0,
  max_retries integer NOT NULL DEFAULT 5,
  next_retry_at timestamptz,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'retrying', 'resolved', 'dead')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  resolved_at timestamptz
);
CREATE INDEX IF NOT EXISTS idx_dlq_status ON dead_letter_queue(status) WHERE status IN ('pending', 'retrying');
CREATE INDEX IF NOT EXISTS idx_dlq_next_retry ON dead_letter_queue(next_retry_at) WHERE status IN ('pending', 'retrying');
CREATE INDEX IF NOT EXISTS idx_dlq_source ON dead_letter_queue(source_system);

-- 3. Admin Alert Channels
CREATE TABLE IF NOT EXISTS admin_alert_channels (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  channel_type text NOT NULL CHECK (channel_type IN ('email', 'sms', 'telegram', 'webhook')),
  channel_target text NOT NULL,
  is_active boolean NOT NULL DEFAULT true,
  severity_filter text[] NOT NULL DEFAULT ARRAY['critical', 'high'],
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_alert_channels_admin ON admin_alert_channels(admin_user_id) WHERE is_active = true;

CREATE TABLE IF NOT EXISTS admin_alert_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  alert_type text NOT NULL,
  severity text NOT NULL DEFAULT 'high',
  title text NOT NULL,
  message text,
  source_system text,
  channel_type text,
  channel_target text,
  status text NOT NULL DEFAULT 'sent' CHECK (status IN ('sent', 'failed', 'throttled')),
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_alert_log_type ON admin_alert_log(alert_type, created_at DESC);

-- 4. System Uptime Log
CREATE TABLE IF NOT EXISTS system_uptime_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  check_type text NOT NULL DEFAULT 'full',
  status text NOT NULL CHECK (status IN ('healthy', 'degraded', 'down')),
  checks_json jsonb NOT NULL DEFAULT '[]',
  total_ms integer NOT NULL DEFAULT 0,
  consecutive_failures integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_uptime_log_status ON system_uptime_log(status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_uptime_log_created ON system_uptime_log(created_at DESC);

-- 5. Server-side Rate Limits
CREATE TABLE IF NOT EXISTS rate_limits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  endpoint text NOT NULL,
  client_ip text NOT NULL,
  window_start timestamptz NOT NULL DEFAULT now(),
  request_count integer NOT NULL DEFAULT 1,
  UNIQUE(endpoint, client_ip, window_start)
);
CREATE INDEX IF NOT EXISTS idx_rate_limits_lookup ON rate_limits(endpoint, client_ip, window_start DESC);
CREATE INDEX IF NOT EXISTS idx_rate_limits_cleanup ON rate_limits(window_start);

CREATE OR REPLACE FUNCTION atomic_rate_limit_increment(
  p_endpoint text,
  p_client_ip text,
  p_window_start timestamptz
)
RETURNS integer AS $$
DECLARE
  v_count integer;
BEGIN
  INSERT INTO rate_limits (endpoint, client_ip, window_start, request_count)
  VALUES (p_endpoint, p_client_ip, p_window_start, 1)
  ON CONFLICT (endpoint, client_ip, window_start)
  DO UPDATE SET request_count = rate_limits.request_count + 1
  RETURNING request_count INTO v_count;
  RETURN v_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 6. Unified Job Queue
CREATE TABLE IF NOT EXISTS job_queue (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  queue_name text NOT NULL,
  payload jsonb NOT NULL DEFAULT '{}',
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed', 'dead')),
  priority integer NOT NULL DEFAULT 0,
  scheduled_at timestamptz NOT NULL DEFAULT now(),
  started_at timestamptz,
  completed_at timestamptz,
  error text,
  retry_count integer NOT NULL DEFAULT 0,
  max_retries integer NOT NULL DEFAULT 3,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_job_queue_pending ON job_queue(queue_name, priority DESC, scheduled_at ASC) WHERE status = 'pending';
CREATE INDEX IF NOT EXISTS idx_job_queue_status ON job_queue(status);
CREATE INDEX IF NOT EXISTS idx_job_queue_scheduled ON job_queue(scheduled_at) WHERE status = 'pending';

-- 7. Server-side State Cache
CREATE TABLE IF NOT EXISTS server_cache (
  cache_key text PRIMARY KEY,
  value_json jsonb NOT NULL DEFAULT '{}',
  domain text NOT NULL DEFAULT 'general',
  expires_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_server_cache_domain ON server_cache(domain);
CREATE INDEX IF NOT EXISTS idx_server_cache_expires ON server_cache(expires_at) WHERE expires_at IS NOT NULL;

-- 8. Storage Backup Manifests
CREATE TABLE IF NOT EXISTS storage_backup_manifests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  bucket_name text NOT NULL,
  file_count integer NOT NULL DEFAULT 0,
  total_size_bytes bigint NOT NULL DEFAULT 0,
  manifest_json jsonb NOT NULL DEFAULT '[]',
  backup_status text NOT NULL DEFAULT 'completed' CHECK (backup_status IN ('running', 'completed', 'failed')),
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_backup_manifests_bucket ON storage_backup_manifests(bucket_name, created_at DESC);

-- 9. Config Snapshots
CREATE TABLE IF NOT EXISTS config_snapshots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  snapshot_type text NOT NULL,
  table_name text NOT NULL,
  row_count integer NOT NULL DEFAULT 0,
  data_json jsonb NOT NULL DEFAULT '[]',
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_config_snapshots_type ON config_snapshots(snapshot_type, created_at DESC);

-- 10. Autonomy System Status (for dashboard)
CREATE TABLE IF NOT EXISTS autonomy_system_status (
  system_name text PRIMARY KEY,
  display_name text NOT NULL,
  status text NOT NULL DEFAULT 'unknown' CHECK (status IN ('green', 'yellow', 'red', 'unknown')),
  last_run_at timestamptz,
  last_success_at timestamptz,
  last_error_at timestamptz,
  success_count_24h integer NOT NULL DEFAULT 0,
  fail_count_24h integer NOT NULL DEFAULT 0,
  last_error_message text,
  metadata_json jsonb NOT NULL DEFAULT '{}',
  updated_at timestamptz NOT NULL DEFAULT now()
);

INSERT INTO autonomy_system_status (system_name, display_name) VALUES
  ('pg_cron_dispatcher', 'Server-Side Cron Dispatcher'),
  ('push_notifications', 'Push Notification Engine'),
  ('dead_letter_queue', 'Dead Letter Queue Processor'),
  ('alert_engine', 'External Alert Engine'),
  ('uptime_watchdog', 'Uptime Watchdog'),
  ('rate_limiter', 'API Rate Limiter'),
  ('job_queue', 'Job Queue Worker'),
  ('state_cache', 'Server State Cache'),
  ('storage_backup', 'Storage Backup Engine'),
  ('autonomy_dashboard', 'Autonomy Dashboard'),
  ('sentinel_server', 'Sentinel Server')
ON CONFLICT (system_name) DO NOTHING;

-- Enable RLS
ALTER TABLE push_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE dead_letter_queue ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_alert_channels ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_alert_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE system_uptime_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE rate_limits ENABLE ROW LEVEL SECURITY;
ALTER TABLE job_queue ENABLE ROW LEVEL SECURITY;
ALTER TABLE server_cache ENABLE ROW LEVEL SECURITY;
ALTER TABLE storage_backup_manifests ENABLE ROW LEVEL SECURITY;
ALTER TABLE config_snapshots ENABLE ROW LEVEL SECURITY;
ALTER TABLE autonomy_system_status ENABLE ROW LEVEL SECURITY;

-- RLS Policies: service role has full access, users see own push tokens
CREATE POLICY "push_tokens_own" ON push_tokens FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "push_tokens_service" ON push_tokens FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "dlq_service" ON dead_letter_queue FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "dlq_admin_read" ON dead_letter_queue FOR SELECT USING (public.is_admin(auth.uid()));
CREATE POLICY "alert_channels_own" ON admin_alert_channels FOR ALL USING (auth.uid() = admin_user_id);
CREATE POLICY "alert_channels_service" ON admin_alert_channels FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "alert_log_service" ON admin_alert_log FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "uptime_log_service" ON system_uptime_log FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "uptime_log_admin_read" ON system_uptime_log FOR SELECT USING (public.is_admin(auth.uid()));
CREATE POLICY "rate_limits_service" ON rate_limits FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "job_queue_service" ON job_queue FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "job_queue_admin_read" ON job_queue FOR SELECT USING (public.is_admin(auth.uid()));
CREATE POLICY "server_cache_service" ON server_cache FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "server_cache_admin_read" ON server_cache FOR SELECT USING (public.is_admin(auth.uid()));
CREATE POLICY "backup_manifests_service" ON storage_backup_manifests FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "config_snapshots_service" ON config_snapshots FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "autonomy_status_service" ON autonomy_system_status FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "autonomy_status_admin_read" ON autonomy_system_status FOR SELECT USING (public.is_admin(auth.uid()));

-- Cleanup function for expired rate limit windows
CREATE OR REPLACE FUNCTION cleanup_expired_rate_limits()
RETURNS void AS $$
BEGIN
  DELETE FROM rate_limits WHERE window_start < now() - interval '5 minutes';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Cleanup function for expired cache entries
CREATE OR REPLACE FUNCTION cleanup_expired_cache()
RETURNS void AS $$
BEGIN
  DELETE FROM server_cache WHERE expires_at IS NOT NULL AND expires_at < now();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Cleanup old uptime logs (keep 7 days)
CREATE OR REPLACE FUNCTION cleanup_old_uptime_logs()
RETURNS void AS $$
BEGIN
  DELETE FROM system_uptime_log WHERE created_at < now() - interval '7 days';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Cleanup old config snapshots (keep 30 days)
CREATE OR REPLACE FUNCTION cleanup_old_config_snapshots()
RETURNS void AS $$
BEGIN
  DELETE FROM config_snapshots WHERE created_at < now() - interval '30 days';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Helper: Insert into DLQ from any system
CREATE OR REPLACE FUNCTION insert_into_dlq(
  p_source_system text,
  p_operation_type text,
  p_payload jsonb,
  p_error text,
  p_max_retries integer DEFAULT 5
)
RETURNS uuid AS $$
DECLARE
  v_id uuid;
BEGIN
  INSERT INTO dead_letter_queue (source_system, operation_type, payload, error, max_retries, next_retry_at)
  VALUES (p_source_system, p_operation_type, p_payload, p_error, p_max_retries, now() + interval '2 minutes')
  RETURNING id INTO v_id;
  RETURN v_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Helper: Enqueue a job
CREATE OR REPLACE FUNCTION enqueue_job(
  p_queue_name text,
  p_payload jsonb,
  p_priority integer DEFAULT 0,
  p_scheduled_at timestamptz DEFAULT now(),
  p_max_retries integer DEFAULT 3
)
RETURNS uuid AS $$
DECLARE
  v_id uuid;
BEGIN
  INSERT INTO job_queue (queue_name, payload, priority, scheduled_at, max_retries)
  VALUES (p_queue_name, p_payload, p_priority, p_scheduled_at, p_max_retries)
  RETURNING id INTO v_id;
  RETURN v_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Helper: Update autonomy system status
CREATE OR REPLACE FUNCTION update_autonomy_status(
  p_system_name text,
  p_status text,
  p_error_message text DEFAULT NULL
)
RETURNS void AS $$
BEGIN
  UPDATE autonomy_system_status SET
    status = p_status,
    last_run_at = now(),
    last_success_at = CASE WHEN p_status = 'green' THEN now() ELSE last_success_at END,
    last_error_at = CASE WHEN p_status = 'red' THEN now() ELSE last_error_at END,
    last_error_message = COALESCE(p_error_message, last_error_message),
    success_count_24h = CASE WHEN p_status = 'green' THEN success_count_24h + 1 ELSE success_count_24h END,
    fail_count_24h = CASE WHEN p_status = 'red' THEN fail_count_24h + 1 ELSE fail_count_24h END,
    updated_at = now()
  WHERE system_name = p_system_name;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================
-- Server-side push notification triggers
-- These DB triggers enqueue push jobs automatically when critical
-- events occur, ensuring push delivery without browser dependency.
-- ============================================================

CREATE OR REPLACE FUNCTION push_on_booking_status_change()
RETURNS trigger AS $$
BEGIN
  IF NEW.status IN ('confirmed', 'rejected', 'completed') AND OLD.status IS DISTINCT FROM NEW.status THEN
    INSERT INTO job_queue (queue_name, payload, priority, max_retries)
    VALUES (
      'push',
      jsonb_build_object(
        'user_id', NEW.user_id,
        'title', CASE NEW.status
          WHEN 'confirmed' THEN 'Booking Confirmed'
          WHEN 'rejected' THEN 'Booking Update'
          WHEN 'completed' THEN 'Booking Completed'
        END,
        'body', CASE NEW.status
          WHEN 'confirmed' THEN 'Your booking has been confirmed'
          WHEN 'rejected' THEN 'Your booking request was declined'
          WHEN 'completed' THEN 'Your booking has been completed'
        END,
        'event_type', 'booking_' || NEW.status,
        'data', jsonb_build_object('booking_id', NEW.id::text)
      ),
      5, 3
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_push_booking_status ON bookings;
CREATE TRIGGER trg_push_booking_status
  AFTER UPDATE OF status ON bookings
  FOR EACH ROW
  EXECUTE FUNCTION push_on_booking_status_change();

CREATE OR REPLACE FUNCTION push_on_wallet_transaction()
RETURNS trigger AS $$
BEGIN
  IF NEW.status = 'completed' AND NEW.transaction_type IN ('credit', 'transfer_in') THEN
    INSERT INTO job_queue (queue_name, payload, priority, max_retries)
    VALUES (
      'push',
      jsonb_build_object(
        'user_id', COALESCE(NEW.destination_wallet_owner_id, NEW.wallet_owner_id),
        'title', 'Payment Received',
        'body', 'You received ' || COALESCE(NEW.amount::text, '0') || ' ' || COALESCE(NEW.currency, 'AED'),
        'event_type', 'payment_received',
        'data', jsonb_build_object('transaction_id', NEW.id::text, 'amount', NEW.amount::text)
      ),
      5, 3
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'wallet_transactions') THEN
    EXECUTE 'DROP TRIGGER IF EXISTS trg_push_wallet_transaction ON wallet_transactions';
    EXECUTE 'CREATE TRIGGER trg_push_wallet_transaction AFTER INSERT OR UPDATE OF status ON wallet_transactions FOR EACH ROW EXECUTE FUNCTION push_on_wallet_transaction()';
  END IF;
END $$;

CREATE OR REPLACE FUNCTION push_on_order_status_change()
RETURNS trigger AS $$
BEGIN
  IF NEW.status IN ('paid', 'shipped', 'delivered', 'cancelled') AND OLD.status IS DISTINCT FROM NEW.status THEN
    INSERT INTO job_queue (queue_name, payload, priority, max_retries)
    VALUES (
      'push',
      jsonb_build_object(
        'user_id', NEW.user_id,
        'title', 'Order Update',
        'body', 'Your order status: ' || NEW.status,
        'event_type', 'order_' || NEW.status,
        'data', jsonb_build_object('order_id', NEW.id::text)
      ),
      5, 3
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_push_order_status ON orders;
CREATE TRIGGER trg_push_order_status
  AFTER UPDATE OF status ON orders
  FOR EACH ROW
  EXECUTE FUNCTION push_on_order_status_change();

CREATE OR REPLACE FUNCTION push_on_message_received()
RETURNS trigger AS $$
BEGIN
  IF NEW.sender_id IS DISTINCT FROM NEW.receiver_id THEN
    INSERT INTO job_queue (queue_name, payload, priority, max_retries)
    VALUES (
      'push',
      jsonb_build_object(
        'user_id', NEW.receiver_id,
        'title', 'New Message',
        'body', 'You have a new message',
        'event_type', 'message_received',
        'data', jsonb_build_object('conversation_id', COALESCE(NEW.conversation_id::text, ''), 'message_id', NEW.id::text)
      ),
      5, 3
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'messages' AND column_name = 'receiver_id') THEN
    EXECUTE 'DROP TRIGGER IF EXISTS trg_push_message_received ON messages';
    EXECUTE 'CREATE TRIGGER trg_push_message_received AFTER INSERT ON messages FOR EACH ROW EXECUTE FUNCTION push_on_message_received()';
  END IF;
END $$;

CREATE OR REPLACE FUNCTION push_on_service_degraded()
RETURNS trigger AS $$
BEGIN
  IF NEW.status IN ('red', 'yellow') AND OLD.status IS DISTINCT FROM NEW.status THEN
    INSERT INTO job_queue (queue_name, payload, priority, max_retries)
    SELECT
      'push',
      jsonb_build_object(
        'user_id', p.id,
        'title', 'Service Alert',
        'body', 'System ' || NEW.system_name || ' is ' || NEW.status,
        'event_type', 'service_degraded',
        'data', jsonb_build_object('system_name', NEW.system_name, 'status', NEW.status)
      ),
      8, 3
    FROM profiles p
    WHERE p.is_admin = true
    LIMIT 20;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_push_service_degraded ON autonomy_system_status;
CREATE TRIGGER trg_push_service_degraded
  AFTER UPDATE OF status ON autonomy_system_status
  FOR EACH ROW
  EXECUTE FUNCTION push_on_service_degraded();

-- ============================================================
-- Lock down privileged RPC functions: revoke public execute
-- Only service_role (used by Edge Functions) can call these
-- ============================================================
REVOKE EXECUTE ON FUNCTION insert_into_dlq FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION enqueue_job FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION update_autonomy_status FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION atomic_rate_limit_increment FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION cleanup_expired_rate_limits FROM PUBLIC, anon, authenticated;

GRANT EXECUTE ON FUNCTION insert_into_dlq TO service_role;
GRANT EXECUTE ON FUNCTION enqueue_job TO service_role;
GRANT EXECUTE ON FUNCTION update_autonomy_status TO service_role;
GRANT EXECUTE ON FUNCTION atomic_rate_limit_increment TO service_role;
GRANT EXECUTE ON FUNCTION cleanup_expired_rate_limits TO service_role;

-- Push trigger functions are SECURITY DEFINER and need service_role only
REVOKE EXECUTE ON FUNCTION push_on_booking_status_change FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION push_on_wallet_transaction FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION push_on_order_status_change FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION push_on_message_received FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION push_on_service_degraded FROM PUBLIC, anon, authenticated;

-- ============================================================
-- pg_cron schedule entries for autonomous server-side operation
-- These run independently of any browser being open
-- Note: pg_cron extension must be enabled in Supabase dashboard
-- ============================================================
DO $outer$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN
    -- Core autonomous dispatcher: every 5 minutes
    PERFORM cron.schedule('autonomous-cron-dispatcher', '*/5 * * * *',
      $cron$SELECT net.http_post(
        current_setting('app.settings.supabase_url') || '/functions/v1/autonomous-cron-dispatcher',
        '{}',
        '{"Content-Type":"application/json","Authorization":"Bearer ' || current_setting('app.settings.service_role_key') || '"}'
      )$cron$
    );

    -- DLQ processor: every 2 minutes
    PERFORM cron.schedule('dlq-processor', '*/2 * * * *',
      $cron$SELECT net.http_post(
        current_setting('app.settings.supabase_url') || '/functions/v1/dlq-processor',
        '{}',
        '{"Content-Type":"application/json","Authorization":"Bearer ' || current_setting('app.settings.service_role_key') || '"}'
      )$cron$
    );

    -- Watchdog ping: every minute
    PERFORM cron.schedule('watchdog-ping', '* * * * *',
      $cron$SELECT net.http_post(
        current_setting('app.settings.supabase_url') || '/functions/v1/watchdog-ping',
        '{}',
        '{"Content-Type":"application/json","Authorization":"Bearer ' || current_setting('app.settings.service_role_key') || '"}'
      )$cron$
    );

    -- Job queue worker: every minute
    PERFORM cron.schedule('job-queue-worker', '* * * * *',
      $cron$SELECT net.http_post(
        current_setting('app.settings.supabase_url') || '/functions/v1/job-queue-worker',
        '{}',
        '{"Content-Type":"application/json","Authorization":"Bearer ' || current_setting('app.settings.service_role_key') || '"}'
      )$cron$
    );

    -- Cache refresh: every 5 minutes
    PERFORM cron.schedule('cache-manager-refresh', '*/5 * * * *',
      $cron$SELECT net.http_post(
        current_setting('app.settings.supabase_url') || '/functions/v1/cache-manager',
        '{"action":"refresh_all"}',
        '{"Content-Type":"application/json","Authorization":"Bearer ' || current_setting('app.settings.service_role_key') || '"}'
      )$cron$
    );

    -- Rate limit cleanup: every 5 minutes
    PERFORM cron.schedule('rate-limit-cleanup', '*/5 * * * *',
      $cron$SELECT cleanup_expired_rate_limits()$cron$
    );

    -- Backup storage: daily at 3 AM UTC
    PERFORM cron.schedule('backup-storage-nightly', '0 3 * * *',
      $cron$SELECT net.http_post(
        current_setting('app.settings.supabase_url') || '/functions/v1/backup-storage',
        '{}',
        '{"Content-Type":"application/json","Authorization":"Bearer ' || current_setting('app.settings.service_role_key') || '"}'
      )$cron$
    );

    -- Uptime log cleanup: daily at 4 AM UTC
    PERFORM cron.schedule('uptime-log-cleanup', '0 4 * * *',
      $cron$SELECT cleanup_old_uptime_logs()$cron$
    );

    -- Cache TTL cleanup: every 10 minutes
    PERFORM cron.schedule('cache-ttl-cleanup', '*/10 * * * *',
      $cron$SELECT cleanup_expired_cache()$cron$
    );

    -- Config snapshot cleanup: daily at 5 AM UTC
    PERFORM cron.schedule('config-snapshot-cleanup', '0 5 * * *',
      $cron$SELECT cleanup_old_config_snapshots()$cron$
    );

    -- Reset 24h counters daily at midnight
    PERFORM cron.schedule('autonomy-counter-reset', '0 0 * * *',
      $cron$UPDATE autonomy_system_status SET success_count_24h = 0, fail_count_24h = 0$cron$
    );

    -- External health check: every 1 minute (unauthenticated, external-facing)
    PERFORM cron.schedule('external-health-check', '* * * * *',
      $cron$SELECT net.http_post(
        current_setting('app.settings.supabase_url') || '/functions/v1/public-health',
        '{}',
        '{"Content-Type":"application/json"}'
      )$cron$
    );

    -- Email queue processor: every 2 minutes
    PERFORM cron.schedule('email-queue-process', '*/2 * * * *',
      $cron$SELECT net.http_post(
        current_setting('app.settings.supabase_url') || '/functions/v1/email-queue-process',
        '{}',
        '{"Content-Type":"application/json","Authorization":"Bearer ' || current_setting('app.settings.service_role_key') || '"}'
      )$cron$
    );
  END IF;
END
$outer$;
