
-- Fix: Replace overly permissive ALL policy on user_key_bundles with specific operations
DROP POLICY IF EXISTS "Users manage own keys" ON public.user_key_bundles;

CREATE POLICY "Users insert own keys" ON public.user_key_bundles
  FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users update own keys" ON public.user_key_bundles
  FOR UPDATE TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users delete own keys" ON public.user_key_bundles
  FOR DELETE TO authenticated USING (user_id = auth.uid());
