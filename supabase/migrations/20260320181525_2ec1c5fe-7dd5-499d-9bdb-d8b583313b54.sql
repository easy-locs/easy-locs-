
-- 1) Email column + unique index
ALTER TABLE public.orbit_profiles_v2
ADD COLUMN IF NOT EXISTS email text;

CREATE UNIQUE INDEX IF NOT EXISTS idx_orbit_profiles_v2_email_lower
ON public.orbit_profiles_v2 (lower(email));

-- 2) RLS + lookup policy
ALTER TABLE public.orbit_profiles_v2 ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "authenticated can lookup orbit profiles" ON public.orbit_profiles_v2;
CREATE POLICY "authenticated can lookup orbit profiles"
ON public.orbit_profiles_v2
FOR SELECT
TO authenticated
USING (true);

DROP POLICY IF EXISTS "authenticated users can lookup profiles" ON public.orbit_profiles_v2;

-- 3) Users can update their own profile
DROP POLICY IF EXISTS "users can update own orbit profile" ON public.orbit_profiles_v2;
CREATE POLICY "users can update own orbit profile"
ON public.orbit_profiles_v2
FOR UPDATE
TO authenticated
USING (auth.uid() = id)
WITH CHECK (auth.uid() = id);

-- 4) Users can insert their own profile
DROP POLICY IF EXISTS "users can insert own orbit profile" ON public.orbit_profiles_v2;
CREATE POLICY "users can insert own orbit profile"
ON public.orbit_profiles_v2
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = id);
