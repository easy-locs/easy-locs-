-- Task #398: Real-time notifications when cron jobs fail
-- Adds admin cron alert preferences table and a trigger that inserts
-- app_notifications for admin users whenever a cron job status becomes 'failure'.

-- ── admin_cron_alert_prefs ──────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.admin_cron_alert_prefs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  in_app_enabled boolean NOT NULL DEFAULT true,
  email_enabled boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id)
);

CREATE INDEX IF NOT EXISTS idx_admin_cron_alert_user ON public.admin_cron_alert_prefs (user_id);

ALTER TABLE public.admin_cron_alert_prefs ENABLE ROW LEVEL SECURITY;

DO $guard_cron_alert$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'admin_cron_alert_prefs' AND policyname = 'admin_manage_cron_alert_prefs'
  ) THEN
    CREATE POLICY admin_manage_cron_alert_prefs ON public.admin_cron_alert_prefs
      FOR ALL USING (
        auth.uid() = user_id AND public.is_admin(auth.uid())
      );
  END IF;
END;
$guard_cron_alert$;

-- ── Trigger function: notify admins on cron failure ─────────────────────────
CREATE OR REPLACE FUNCTION public.notify_cron_failure()
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_admin RECORD;
  v_job_label text;
BEGIN
  IF NEW.status = 'failure' AND (OLD.status IS DISTINCT FROM 'failure') THEN
    v_job_label := replace(initcap(replace(NEW.job_name, '-', ' ')), '_', ' ');

    FOR v_admin IN
      SELECT DISTINCT u.id AS user_id
      FROM auth.users u
      INNER JOIN user_roles ur ON ur.user_id = u.id
      WHERE ur.role IN ('admin', 'owner')
        AND NOT EXISTS (
          SELECT 1 FROM admin_cron_alert_prefs p
          WHERE p.user_id = u.id AND p.in_app_enabled = false
        )
    LOOP
      INSERT INTO app_notifications (
        user_id, scope, category, title, body, severity, route,
        entity_type, metadata
      ) VALUES (
        v_admin.user_id,
        'admin',
        'cron_failure',
        'Cron Job Failed: ' || v_job_label,
        COALESCE(
          'Job "' || NEW.job_name || '" failed: ' || LEFT(NEW.error_message, 200),
          'Job "' || NEW.job_name || '" failed with no error message.'
        ),
        'critical',
        '/admin',
        'cron_job',
        jsonb_build_object(
          'actor', 'system',
          'domain', 'admin',
          'data', jsonb_build_object(
            'job_name', NEW.job_name,
            'error_message', NEW.error_message,
            'log_id', NEW.id,
            'started_at', NEW.started_at,
            'finished_at', NEW.finished_at,
            'duration_ms', NEW.duration_ms
          ),
          'delivery_mode', '["in_app"]'::jsonb,
          'dedupe_key', 'cron-fail-' || NEW.id::text
        )
      );
    END LOOP;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_cron_failure_notify ON public.cron_execution_log;
CREATE TRIGGER trg_cron_failure_notify
  AFTER UPDATE ON public.cron_execution_log
  FOR EACH ROW
  WHEN (NEW.status = 'failure')
  EXECUTE FUNCTION public.notify_cron_failure();
