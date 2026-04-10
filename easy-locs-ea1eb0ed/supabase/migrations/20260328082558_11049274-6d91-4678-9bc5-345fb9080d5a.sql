
-- Fix rider_runtime_state: restrict to owner only
DROP POLICY IF EXISTS "rider_runtime_read" ON rider_runtime_state;
CREATE POLICY "rider_runtime_read" ON rider_runtime_state
  FOR SELECT TO authenticated
  USING (rider_user_id = auth.uid());

-- Clean up rtc_config permissive policies
DROP POLICY IF EXISTS "Authenticated can read rtc_config" ON rtc_config;
DROP POLICY IF EXISTS "authenticated_read_rtc_config" ON rtc_config;
