-- Task #981: Operator-tunable merge-conflict alert thresholds.
--
-- The scheduled `merge-conflict-recovery-alerts-cron` (task #973) reads
-- four numeric thresholds (daily / 14d-total / file-count / file-ratio)
-- to decide when to page operators. Until now those values lived only
-- in environment variables, which meant tightening or loosening alerts
-- required redeploying the edge function.
--
-- This migration introduces a small singleton table the dashboard can
-- edit at runtime. The cron reads this row first and falls back to its
-- env vars only if the row is missing. RLS keeps the public read-only
-- so the dashboard can render the current values while restricting
-- writes to administrators (super_admin / owner / admin).

CREATE TABLE IF NOT EXISTS public.merge_conflict_alert_thresholds (
  -- Singleton enforced by a constant primary key — only one row exists.
  id BOOLEAN PRIMARY KEY DEFAULT TRUE CHECK (id = TRUE),
  daily_event_threshold INTEGER NOT NULL DEFAULT 10
    CHECK (daily_event_threshold >= 0),
  total_events_threshold INTEGER NOT NULL DEFAULT 30
    CHECK (total_events_threshold >= 0),
  top_file_min_events INTEGER NOT NULL DEFAULT 5
    CHECK (top_file_min_events >= 0),
  top_file_dominance_ratio NUMERIC(4, 3) NOT NULL DEFAULT 0.5
    CHECK (top_file_dominance_ratio >= 0 AND top_file_dominance_ratio <= 1),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_by UUID REFERENCES auth.users(id) ON DELETE SET NULL
);

-- Seed the singleton row with defaults that match the cron's historical
-- env-var defaults so behaviour is unchanged on first deploy.
INSERT INTO public.merge_conflict_alert_thresholds (id)
VALUES (TRUE)
ON CONFLICT (id) DO NOTHING;

-- Keep updated_at fresh on every write.
CREATE OR REPLACE FUNCTION public.touch_merge_conflict_alert_thresholds()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_touch_merge_conflict_alert_thresholds
  ON public.merge_conflict_alert_thresholds;
CREATE TRIGGER trg_touch_merge_conflict_alert_thresholds
  BEFORE UPDATE ON public.merge_conflict_alert_thresholds
  FOR EACH ROW EXECUTE FUNCTION public.touch_merge_conflict_alert_thresholds();

ALTER TABLE public.merge_conflict_alert_thresholds ENABLE ROW LEVEL SECURITY;

-- Anyone signed in (and the public, for parity with platform_settings)
-- can read the current thresholds — they describe operational behaviour,
-- not user data.
DROP POLICY IF EXISTS "merge_conflict_alert_thresholds_read"
  ON public.merge_conflict_alert_thresholds;
CREATE POLICY "merge_conflict_alert_thresholds_read"
  ON public.merge_conflict_alert_thresholds
  FOR SELECT
  TO anon, authenticated
  USING (TRUE);

-- Only administrators may change the thresholds. We accept any of the
-- three admin-tier roles defined by `public.app_role` so the dashboard
-- works for the same operators who already manage other admin settings.
DROP POLICY IF EXISTS "merge_conflict_alert_thresholds_admin_write"
  ON public.merge_conflict_alert_thresholds;
CREATE POLICY "merge_conflict_alert_thresholds_admin_write"
  ON public.merge_conflict_alert_thresholds
  FOR UPDATE
  TO authenticated
  USING (
    public.has_role(auth.uid(), 'super_admin'::public.app_role)
    OR public.has_role(auth.uid(), 'owner'::public.app_role)
    OR public.has_role(auth.uid(), 'admin'::public.app_role)
  )
  WITH CHECK (
    public.has_role(auth.uid(), 'super_admin'::public.app_role)
    OR public.has_role(auth.uid(), 'owner'::public.app_role)
    OR public.has_role(auth.uid(), 'admin'::public.app_role)
  );

-- INSERT/DELETE intentionally have no policy: the singleton row is
-- seeded by this migration and must not be replaced or removed at
-- runtime. Service role bypasses RLS for any future maintenance.
