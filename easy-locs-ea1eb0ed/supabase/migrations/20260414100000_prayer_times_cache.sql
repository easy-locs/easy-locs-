-- Prayer times cache table for Adhan module
-- TTL: 24h per location/date/method combination

CREATE TABLE IF NOT EXISTS prayer_times_cache (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  cache_key text NOT NULL UNIQUE,
  prayer_data jsonb NOT NULL,
  lat numeric(9, 6) NOT NULL,
  lng numeric(9, 6) NOT NULL,
  date date NOT NULL,
  expires_at timestamptz NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Index for fast lookups by cache_key and expiry
CREATE INDEX IF NOT EXISTS idx_prayer_times_cache_key ON prayer_times_cache (cache_key);
CREATE INDEX IF NOT EXISTS idx_prayer_times_expires ON prayer_times_cache (expires_at);

-- Clean up expired rows (run periodically via cron or trigger)
CREATE INDEX IF NOT EXISTS idx_prayer_times_date ON prayer_times_cache (date);

-- RLS: readable by anyone (prayer times are public data), write only via service role
ALTER TABLE prayer_times_cache ENABLE ROW LEVEL SECURITY;

CREATE POLICY "prayer_times_cache_public_read"
  ON prayer_times_cache
  FOR SELECT
  USING (true);

-- User notification preferences for adhan
CREATE TABLE IF NOT EXISTS adhan_notification_prefs (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  enabled boolean DEFAULT false,
  fajr boolean DEFAULT true,
  dhuhr boolean DEFAULT true,
  asr boolean DEFAULT true,
  maghrib boolean DEFAULT true,
  isha boolean DEFAULT true,
  offset_minutes integer DEFAULT 0,
  method integer DEFAULT 2,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE (user_id)
);

ALTER TABLE adhan_notification_prefs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "adhan_prefs_own_user"
  ON adhan_notification_prefs
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
