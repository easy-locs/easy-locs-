-- Unified Identity Propagation (Audit Item A-UP1)
-- When identity.profiles is updated, propagate name/avatar to orbit.orbit_profiles_v2

CREATE OR REPLACE FUNCTION identity.propagate_profile_to_orbit()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE orbit.orbit_profiles_v2
  SET
    display_name = COALESCE(NEW.full_name, NEW.raw_user_meta_data->>'full_name', display_name),
    avatar_url = COALESCE(NEW.avatar_url, avatar_url),
    updated_at = NOW()
  WHERE user_id = NEW.id;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'trg_identity_propagate_to_orbit'
  ) THEN
    CREATE TRIGGER trg_identity_propagate_to_orbit
    AFTER UPDATE ON identity.profiles
    FOR EACH ROW
    WHEN (
      OLD.full_name IS DISTINCT FROM NEW.full_name
      OR OLD.avatar_url IS DISTINCT FROM NEW.avatar_url
    )
    EXECUTE FUNCTION identity.propagate_profile_to_orbit();
  END IF;
END $$;

-- Deprecate user_profiles: create a migration view for backward compatibility (A-UP4)
-- Step 1: Ensure any code referencing public.user_profiles reads from identity.profiles

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'user_profiles'
  ) THEN
    IF NOT EXISTS (
      SELECT 1 FROM pg_views WHERE schemaname = 'public' AND viewname = 'user_profiles_legacy_view'
    ) THEN
      EXECUTE 'CREATE VIEW public.user_profiles_legacy_view AS SELECT * FROM public.user_profiles';
    END IF;
  END IF;
END $$;

-- Index for faster orbit profile lookups during propagation
CREATE INDEX IF NOT EXISTS idx_orbit_profiles_v2_user_id
  ON orbit.orbit_profiles_v2 (user_id);

-- Index for identity profiles avatar lookups
CREATE INDEX IF NOT EXISTS idx_identity_profiles_avatar
  ON identity.profiles (id)
  WHERE avatar_url IS NOT NULL;

COMMENT ON FUNCTION identity.propagate_profile_to_orbit() IS
  'Propagates name/avatar changes from identity.profiles to orbit.orbit_profiles_v2 in real-time. Part of Unified Identity Graph (Audit A-UP1).';
