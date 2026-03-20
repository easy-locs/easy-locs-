-- Clean up duplicate policies
-- orbit_profiles_v2: remove redundant INSERT and UPDATE policies
DROP POLICY IF EXISTS "System inserts orbit profile" ON public.orbit_profiles_v2;
DROP POLICY IF EXISTS "Users read own orbit profile" ON public.orbit_profiles_v2;
DROP POLICY IF EXISTS "Users update own orbit profile" ON public.orbit_profiles_v2;

-- conversations_v2: remove redundant INSERT policy
DROP POLICY IF EXISTS "Authenticated users create conversations" ON public.conversations_v2;
