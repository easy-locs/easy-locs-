CREATE OR REPLACE FUNCTION public.decrement_referral_use_count(
  p_code_id uuid,
  p_amount integer
)
RETURNS void
LANGUAGE sql SECURITY DEFINER
SET search_path = public
AS $$
  UPDATE referral_codes
  SET use_count = GREATEST(0, use_count - p_amount)
  WHERE id = p_code_id;
$$;

DO $outer$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN
    PERFORM cron.unschedule('expire-pending-referrals');
  END IF;
EXCEPTION WHEN OTHERS THEN
  NULL;
END;
$outer$;

DO $outer$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron')
     AND EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_net') THEN
    PERFORM cron.schedule(
      'expire-pending-referrals',
      '0 2 * * *',
      $cron$SELECT net.http_post(
        url := current_setting('app.settings.supabase_url') || '/functions/v1/expire-pending-referrals',
        body := '{}'::jsonb,
        headers := jsonb_build_object(
          'Content-Type', 'application/json',
          'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key')
        )
      )$cron$
    );
  END IF;
END;
$outer$;
