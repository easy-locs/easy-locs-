
CREATE TABLE IF NOT EXISTS public.orbit_user_settings_v2 (
  user_id uuid PRIMARY KEY,
  read_receipts boolean NOT NULL DEFAULT true,
  typing_indicators boolean NOT NULL DEFAULT true,
  last_seen_visibility text NOT NULL DEFAULT 'contacts',
  profile_photo_visibility text NOT NULL DEFAULT 'contacts',
  disappear_default_seconds integer NOT NULL DEFAULT 0,
  ghost_mode_enabled boolean NOT NULL DEFAULT false,
  calls_enabled boolean NOT NULL DEFAULT true,
  camera_uploads_enabled boolean NOT NULL DEFAULT true,
  location_sharing_enabled boolean NOT NULL DEFAULT true,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_orbit_user_settings_v2_updated_at
  ON public.orbit_user_settings_v2(updated_at DESC);

ALTER TABLE public.orbit_user_settings_v2 ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'orbit_user_settings_v2'
      AND policyname = 'orbit_user_settings_v2_own'
  ) THEN
    CREATE POLICY orbit_user_settings_v2_own
    ON public.orbit_user_settings_v2
    FOR ALL
    TO authenticated
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);
  END IF;
END $$;
