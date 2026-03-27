
-- Add missing indexes for orbit_contacts_v2 (table already exists)
CREATE INDEX IF NOT EXISTS idx_orbit_contacts_v2_owner_favorite
  ON public.orbit_contacts_v2(owner_user_id, is_favorite);

CREATE INDEX IF NOT EXISTS idx_orbit_contacts_v2_owner_blocked
  ON public.orbit_contacts_v2(owner_user_id, is_blocked);

-- Add delete policy if missing
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'orbit_contacts_v2'
      AND policyname = 'orbit_contacts_v2_delete_own'
  ) THEN
    CREATE POLICY orbit_contacts_v2_delete_own
    ON public.orbit_contacts_v2
    FOR DELETE
    TO authenticated
    USING (auth.uid() = owner_user_id);
  END IF;
END $$;
