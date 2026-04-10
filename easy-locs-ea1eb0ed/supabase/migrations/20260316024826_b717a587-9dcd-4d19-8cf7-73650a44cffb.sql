
-- Add email digest and quiet hours columns to notification_preferences
ALTER TABLE public.notification_preferences
  ADD COLUMN IF NOT EXISTS email_digest_frequency text NOT NULL DEFAULT 'none',
  ADD COLUMN IF NOT EXISTS email_digest_day text NOT NULL DEFAULT 'monday',
  ADD COLUMN IF NOT EXISTS email_digest_hour integer NOT NULL DEFAULT 9,
  ADD COLUMN IF NOT EXISTS quiet_hours_enabled boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS quiet_hours_start text NOT NULL DEFAULT '22:00',
  ADD COLUMN IF NOT EXISTS quiet_hours_end text NOT NULL DEFAULT '07:00',
  ADD COLUMN IF NOT EXISTS email_deals boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS email_bookings boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS in_app_deals boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS in_app_bookings boolean NOT NULL DEFAULT true;

COMMENT ON COLUMN public.notification_preferences.email_digest_frequency IS 'none, daily, weekly';
COMMENT ON COLUMN public.notification_preferences.email_digest_day IS 'Day of week for weekly digest';
COMMENT ON COLUMN public.notification_preferences.quiet_hours_start IS 'HH:MM format';
