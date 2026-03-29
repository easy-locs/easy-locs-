
-- Fix remaining critical findings

-- 1. PHONE_OTP_SESSIONS: Remove NULL user_id access
DROP POLICY IF EXISTS "Users can read own OTP sessions" ON public.phone_otp_sessions;
DROP POLICY IF EXISTS "phone_otp_select" ON public.phone_otp_sessions;
CREATE POLICY "own_otp_only" ON public.phone_otp_sessions FOR SELECT TO authenticated
  USING (user_id = auth.uid());

-- 2. RTC_SIGNALING_MESSAGES: Restrict to call participants
DROP POLICY IF EXISTS "authenticated_read_rtc_signaling_messages" ON public.rtc_signaling_messages;
CREATE POLICY "sender_read_rtc" ON public.rtc_signaling_messages FOR SELECT TO authenticated
  USING (sender_id = auth.uid());

-- 3. AUTOMATION_WORKFLOWS: Admin only
DROP POLICY IF EXISTS "Authenticated can read automation_workflows" ON public.automation_workflows;
DROP POLICY IF EXISTS "Auth read automation_workflows" ON public.automation_workflows;
CREATE POLICY "admin_read_workflows" ON public.automation_workflows FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- 4. ONBOARDING_SOURCE_RECORDS: Admin only
DROP POLICY IF EXISTS "Auth read onboarding_source_records" ON public.onboarding_source_records;
DROP POLICY IF EXISTS "Authenticated can read onboarding_source_records" ON public.onboarding_source_records;
CREATE POLICY "admin_read_source_records" ON public.onboarding_source_records FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- 5. ONBOARDING_CANONICAL_RECORDS: Admin only
DROP POLICY IF EXISTS "Auth read onboarding_canonical_records" ON public.onboarding_canonical_records;
DROP POLICY IF EXISTS "Authenticated can read onboarding_canonical_records" ON public.onboarding_canonical_records;
CREATE POLICY "admin_read_canonical_records" ON public.onboarding_canonical_records FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- 6. DRIVER_PROFILES: Restrict location to admin/dispatchers
DROP POLICY IF EXISTS "Anyone can read online drivers" ON public.driver_profiles;
DROP POLICY IF EXISTS "Authenticated can read online drivers" ON public.driver_profiles;
CREATE POLICY "admin_read_drivers" ON public.driver_profiles FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));
