ALTER TABLE adhan_notification_prefs
ADD COLUMN IF NOT EXISTS asr_school integer DEFAULT 0;
