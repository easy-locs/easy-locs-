
-- Fix: drop and recreate the conflicting policy
DROP POLICY IF EXISTS "Users can update own AI profile" ON public.user_ai_profiles;
CREATE POLICY "Users can update own AI profile"
  ON public.user_ai_profiles
  FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid());
