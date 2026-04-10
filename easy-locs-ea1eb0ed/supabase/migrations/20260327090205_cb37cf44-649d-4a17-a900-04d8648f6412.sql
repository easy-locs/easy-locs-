
-- Allow authenticated users to read profiles for contact search
CREATE POLICY "authenticated_read_profiles" ON public.profiles
  FOR SELECT TO authenticated USING (true);
