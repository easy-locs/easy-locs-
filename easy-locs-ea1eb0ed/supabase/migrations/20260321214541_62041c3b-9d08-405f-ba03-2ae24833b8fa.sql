-- Allow authenticated users to look up other profiles for contact resolution, calls, and payments
-- The profiles table only contains non-sensitive fields (name, email, phone, avatar_url)
CREATE POLICY "Authenticated users can look up profiles"
ON public.profiles
FOR SELECT
TO authenticated
USING (true);

-- Drop the old restrictive policy since the new one is a superset
DROP POLICY IF EXISTS "Users can read own profile" ON public.profiles;