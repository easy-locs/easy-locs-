DO $outer$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'referral_clicks'
      AND column_name = 'channel'
  ) THEN
    BEGIN
      ALTER TABLE public.referral_clicks ADD COLUMN channel text DEFAULT 'direct';
    EXCEPTION WHEN undefined_table THEN
      NULL;
    END;
  END IF;
END;
$outer$;

DO $outer$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes
    WHERE tablename = 'referral_clicks'
      AND indexname = 'idx_referral_clicks_channel'
  ) THEN
    BEGIN
      CREATE INDEX idx_referral_clicks_channel ON public.referral_clicks (channel);
    EXCEPTION WHEN undefined_table THEN
      NULL;
    END;
  END IF;
END;
$outer$;

DO $outer$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public'
      AND table_name = 'cron_health_log'
  ) THEN
    CREATE TABLE public.cron_health_log (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      job_name text NOT NULL,
      status text NOT NULL DEFAULT 'ok',
      details jsonb DEFAULT '{}',
      checked_at timestamptz DEFAULT now()
    );
    CREATE INDEX idx_cron_health_log_job_name ON public.cron_health_log (job_name, checked_at DESC);
  END IF;
END;
$outer$;

CREATE OR REPLACE VIEW public.referral_channel_stats AS
SELECT
  (metadata->>'channel')::text AS channel,
  COUNT(*) AS click_count,
  MIN(created_at) AS first_click,
  MAX(created_at) AS last_click
FROM public.activity_logs
WHERE action = 'link_clicked'
  AND metadata->>'referral_code' IS NOT NULL
GROUP BY (metadata->>'channel')::text;

CREATE OR REPLACE FUNCTION public.backfill_referral_clicks_channel()
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE referral_clicks rc
  SET channel = COALESCE(
    (SELECT (al.metadata->>'channel')::text
     FROM activity_logs al
     WHERE al.action = 'link_clicked'
       AND (al.metadata->>'referral_code')::text = rc.referral_code
     ORDER BY al.created_at DESC
     LIMIT 1),
    'direct'
  )
  WHERE rc.channel IS NULL OR rc.channel = 'direct';
EXCEPTION WHEN undefined_table THEN
  NULL;
END;
$$;
