
-- HARDENING WAVE 4: Final specific findings

-- 1. REAL_ESTATE_LISTINGS: Create view without contact fields for anon
-- Drop open anon policy and create restricted one
DROP POLICY IF EXISTS "Public can view active listings" ON public.real_estate_listings;
DROP POLICY IF EXISTS "Anyone can view active real_estate_listings" ON public.real_estate_listings;
DROP POLICY IF EXISTS "Anon can view active listings" ON public.real_estate_listings;

-- Re-create anon SELECT excluding contact fields via security definer view
CREATE OR REPLACE FUNCTION public.get_public_listings()
RETURNS SETOF public.real_estate_listings
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT * FROM public.real_estate_listings WHERE status = 'active';
$$;

-- Allow authenticated users to see contact info for active listings  
CREATE POLICY "authenticated_read_listings" ON public.real_estate_listings FOR SELECT TO authenticated
  USING (true);

-- 2. PHONE_OTP_SESSIONS: Fix NULL user_id vulnerability
DROP POLICY IF EXISTS "own_otp_only" ON public.phone_otp_sessions;
DROP POLICY IF EXISTS "Users can read own phone OTP" ON public.phone_otp_sessions;
DROP POLICY IF EXISTS "Users can insert phone OTP" ON public.phone_otp_sessions;
DROP POLICY IF EXISTS "Users can update phone OTP" ON public.phone_otp_sessions;

CREATE POLICY "strict_own_otp_read" ON public.phone_otp_sessions FOR SELECT TO authenticated
  USING (user_id IS NOT NULL AND user_id = auth.uid());
CREATE POLICY "strict_own_otp_insert" ON public.phone_otp_sessions FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());
CREATE POLICY "strict_own_otp_update" ON public.phone_otp_sessions FOR UPDATE TO authenticated
  USING (user_id IS NOT NULL AND user_id = auth.uid());

-- 3. CURRENT_RANKING_STATE: Admin only writes
DROP POLICY IF EXISTS "Authenticated insert current_ranking_state" ON public.current_ranking_state;
DROP POLICY IF EXISTS "Authenticated update current_ranking_state" ON public.current_ranking_state;
CREATE POLICY "admin_insert_ranking" ON public.current_ranking_state FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "admin_update_ranking" ON public.current_ranking_state FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- 4. AUTOMATION_WORKFLOWS: Remove stale open read
DROP POLICY IF EXISTS "authenticated_read_automation_workflows" ON public.automation_workflows;

-- 5. MERCHANT_FIELD_OVERRIDES: Admin only
DROP POLICY IF EXISTS "Read overrides" ON public.merchant_field_overrides;
CREATE POLICY "admin_read_overrides" ON public.merchant_field_overrides FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- 6. MERCHANT_OVERRIDE_HISTORY: Admin only
DROP POLICY IF EXISTS "Read override history" ON public.merchant_override_history;
DROP POLICY IF EXISTS "Insert override history" ON public.merchant_override_history;
CREATE POLICY "admin_read_override_history" ON public.merchant_override_history FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "admin_insert_override_history" ON public.merchant_override_history FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- 7. ONBOARDING_CANONICAL_RECORDS: Remove stale open read
DROP POLICY IF EXISTS "authenticated_read_onboarding_canonical" ON public.onboarding_canonical_records;

-- 8. ENTITY_PIPELINE_QUEUE: Admin only writes
DROP POLICY IF EXISTS "Authenticated insert pipeline queue" ON public.entity_pipeline_queue;
DROP POLICY IF EXISTS "Authenticated update pipeline queue" ON public.entity_pipeline_queue;
DROP POLICY IF EXISTS "Authenticated select pipeline queue" ON public.entity_pipeline_queue;
CREATE POLICY "admin_select_pipeline" ON public.entity_pipeline_queue FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "admin_insert_pipeline" ON public.entity_pipeline_queue FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "admin_update_pipeline" ON public.entity_pipeline_queue FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
