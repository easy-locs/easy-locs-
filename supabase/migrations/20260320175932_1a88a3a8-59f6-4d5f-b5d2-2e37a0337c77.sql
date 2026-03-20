-- Add email column to orbit_profiles_v2
ALTER TABLE public.orbit_profiles_v2
ADD COLUMN IF NOT EXISTS email text;

-- Unique index on normalized email
CREATE UNIQUE INDEX IF NOT EXISTS idx_orbit_profiles_v2_email
ON public.orbit_profiles_v2 (lower(email));

-- Allow authenticated users to lookup any profile (for contact search)
DROP POLICY IF EXISTS "authenticated users can lookup profiles" ON public.orbit_profiles_v2;
CREATE POLICY "authenticated users can lookup profiles"
ON public.orbit_profiles_v2
FOR SELECT
TO authenticated
USING (true);
