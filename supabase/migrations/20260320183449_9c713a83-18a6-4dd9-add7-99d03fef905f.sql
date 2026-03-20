
-- call_transcripts: call_session_id is uuid, call_sessions.id is uuid — OK
DROP POLICY IF EXISTS "Authenticated users can read call_transcripts" ON public.call_transcripts;
DROP POLICY IF EXISTS "Authenticated users can insert call_transcripts" ON public.call_transcripts;
CREATE POLICY "call_transcripts_select_participant"
ON public.call_transcripts FOR SELECT TO authenticated
USING (EXISTS (SELECT 1 FROM public.call_sessions cs WHERE cs.id = call_transcripts.call_session_id AND (cs.initiator_id = auth.uid() OR cs.recipient_id = auth.uid())));

-- ai_chat_messages
DROP POLICY IF EXISTS "ai_messages_select_auth" ON public.ai_chat_messages;
DROP POLICY IF EXISTS "ai_messages_insert_auth" ON public.ai_chat_messages;
CREATE POLICY "ai_messages_select_thread_owner" ON public.ai_chat_messages FOR SELECT TO authenticated
USING (EXISTS (SELECT 1 FROM public.ai_chat_threads t WHERE t.id = ai_chat_messages.thread_id AND t.created_by = auth.uid()));
CREATE POLICY "ai_messages_insert_thread_owner" ON public.ai_chat_messages FOR INSERT TO authenticated
WITH CHECK (EXISTS (SELECT 1 FROM public.ai_chat_threads t WHERE t.id = ai_chat_messages.thread_id AND t.created_by = auth.uid()));

-- device_fingerprints
DROP POLICY IF EXISTS "device_fingerprints_select_auth" ON public.device_fingerprints;
DROP POLICY IF EXISTS "device_fingerprints_insert_auth" ON public.device_fingerprints;
CREATE POLICY "device_fingerprints_select_own" ON public.device_fingerprints FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "device_fingerprints_insert_own" ON public.device_fingerprints FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());

-- security_reviews (created_by is text)
DROP POLICY IF EXISTS "Authenticated users can read security reviews" ON public.security_reviews;
DROP POLICY IF EXISTS "Authenticated users can insert security reviews" ON public.security_reviews;
CREATE POLICY "security_reviews_select_own" ON public.security_reviews FOR SELECT TO authenticated USING (created_by = auth.uid()::text);
CREATE POLICY "security_reviews_insert_own" ON public.security_reviews FOR INSERT TO authenticated WITH CHECK (created_by = auth.uid()::text);

-- security_nonces — service role only
DROP POLICY IF EXISTS "Authenticated users can manage nonces" ON public.security_nonces;

-- sales_ai_leads — workspace scoped
DROP POLICY IF EXISTS "sales_ai_leads_select_auth" ON public.sales_ai_leads;
DROP POLICY IF EXISTS "sales_ai_leads_insert_auth" ON public.sales_ai_leads;
DROP POLICY IF EXISTS "sales_ai_leads_update_auth" ON public.sales_ai_leads;
CREATE POLICY "sales_ai_leads_select_ws" ON public.sales_ai_leads FOR SELECT TO authenticated
USING (EXISTS (SELECT 1 FROM public.workspace_members wm WHERE wm.workspace_id = sales_ai_leads.workspace_id AND wm.user_id = auth.uid()));
CREATE POLICY "sales_ai_leads_insert_ws" ON public.sales_ai_leads FOR INSERT TO authenticated
WITH CHECK (EXISTS (SELECT 1 FROM public.workspace_members wm WHERE wm.workspace_id = sales_ai_leads.workspace_id AND wm.user_id = auth.uid()));
CREATE POLICY "sales_ai_leads_update_ws" ON public.sales_ai_leads FOR UPDATE TO authenticated
USING (EXISTS (SELECT 1 FROM public.workspace_members wm WHERE wm.workspace_id = sales_ai_leads.workspace_id AND wm.user_id = auth.uid()))
WITH CHECK (EXISTS (SELECT 1 FROM public.workspace_members wm WHERE wm.workspace_id = sales_ai_leads.workspace_id AND wm.user_id = auth.uid()));

-- merchant_onboarding_profiles
DROP POLICY IF EXISTS "merchant_onboarding_profiles_select_auth" ON public.merchant_onboarding_profiles;
DROP POLICY IF EXISTS "merchant_onboarding_profiles_insert_auth" ON public.merchant_onboarding_profiles;
DROP POLICY IF EXISTS "merchant_onboarding_profiles_update_auth" ON public.merchant_onboarding_profiles;
CREATE POLICY "merchant_profiles_select_own" ON public.merchant_onboarding_profiles FOR SELECT TO authenticated USING (claimed_by = auth.uid());
CREATE POLICY "merchant_profiles_insert_own" ON public.merchant_onboarding_profiles FOR INSERT TO authenticated WITH CHECK (claimed_by = auth.uid());

-- financial_reconciliation — workspace scoped
DROP POLICY IF EXISTS "recon_select_auth" ON public.financial_reconciliation;
DROP POLICY IF EXISTS "recon_insert_auth" ON public.financial_reconciliation;
DROP POLICY IF EXISTS "recon_update_auth" ON public.financial_reconciliation;
CREATE POLICY "recon_select_ws" ON public.financial_reconciliation FOR SELECT TO authenticated
USING (EXISTS (SELECT 1 FROM public.workspace_members wm WHERE wm.workspace_id = financial_reconciliation.workspace_id AND wm.user_id = auth.uid()));

-- dispatch_jobs_v2 — participant scoped (both uuid)
DROP POLICY IF EXISTS "Authenticated can read dispatch_jobs_v2" ON public.dispatch_jobs_v2;
DROP POLICY IF EXISTS "Authenticated can insert dispatch_jobs_v2" ON public.dispatch_jobs_v2;
DROP POLICY IF EXISTS "Authenticated can update dispatch_jobs_v2" ON public.dispatch_jobs_v2;
CREATE POLICY "dispatch_v2_select" ON public.dispatch_jobs_v2 FOR SELECT TO authenticated
USING (customer_user_id = auth.uid() OR assigned_driver_id = auth.uid());
CREATE POLICY "dispatch_v2_insert" ON public.dispatch_jobs_v2 FOR INSERT TO authenticated WITH CHECK (customer_user_id = auth.uid());
CREATE POLICY "dispatch_v2_update" ON public.dispatch_jobs_v2 FOR UPDATE TO authenticated
USING (customer_user_id = auth.uid() OR assigned_driver_id = auth.uid())
WITH CHECK (customer_user_id = auth.uid() OR assigned_driver_id = auth.uid());

-- stealth_notification_routes — workspace scoped
DROP POLICY IF EXISTS "stealth_notification_routes_select_auth" ON public.stealth_notification_routes;
DROP POLICY IF EXISTS "stealth_notification_routes_insert_auth" ON public.stealth_notification_routes;
DROP POLICY IF EXISTS "stealth_notification_routes_update_auth" ON public.stealth_notification_routes;
CREATE POLICY "stealth_routes_select_ws" ON public.stealth_notification_routes FOR SELECT TO authenticated
USING (EXISTS (SELECT 1 FROM public.workspace_members wm WHERE wm.workspace_id = stealth_notification_routes.workspace_id AND wm.user_id = auth.uid()));
CREATE POLICY "stealth_routes_insert_ws" ON public.stealth_notification_routes FOR INSERT TO authenticated
WITH CHECK (EXISTS (SELECT 1 FROM public.workspace_members wm WHERE wm.workspace_id = stealth_notification_routes.workspace_id AND wm.user_id = auth.uid()));

-- churn_risk_profiles — workspace scoped
DROP POLICY IF EXISTS "churn_risk_profiles_select_auth" ON public.churn_risk_profiles;
DROP POLICY IF EXISTS "churn_risk_profiles_insert_auth" ON public.churn_risk_profiles;
DROP POLICY IF EXISTS "churn_risk_profiles_update_auth" ON public.churn_risk_profiles;
CREATE POLICY "churn_select_ws" ON public.churn_risk_profiles FOR SELECT TO authenticated
USING (EXISTS (SELECT 1 FROM public.workspace_members wm WHERE wm.workspace_id = churn_risk_profiles.workspace_id AND wm.user_id = auth.uid()));

-- message_translations — restrict via message participation
DROP POLICY IF EXISTS "Authenticated users can manage message_translations" ON public.message_translations;
CREATE POLICY "msg_translations_select" ON public.message_translations FOR SELECT TO authenticated
USING (EXISTS (SELECT 1 FROM public.chat_messages_v2 cm WHERE cm.id = message_translations.message_id AND cm.sender_orbit_id IN (SELECT orbit_id FROM public.orbit_profiles_v2 WHERE id = auth.uid())));

-- admin_alerts — workspace scoped
DROP POLICY IF EXISTS "admin_alerts_select_authenticated" ON public.admin_alerts;
DROP POLICY IF EXISTS "admin_alerts_insert_authenticated" ON public.admin_alerts;
DROP POLICY IF EXISTS "admin_alerts_update_authenticated" ON public.admin_alerts;
DROP POLICY IF EXISTS "alerts_select_auth" ON public.admin_alerts;
DROP POLICY IF EXISTS "alerts_insert_auth" ON public.admin_alerts;
DROP POLICY IF EXISTS "alerts_update_auth" ON public.admin_alerts;
CREATE POLICY "admin_alerts_select_ws" ON public.admin_alerts FOR SELECT TO authenticated
USING (workspace_id IS NULL OR EXISTS (SELECT 1 FROM public.workspace_members wm WHERE wm.workspace_id = admin_alerts.workspace_id AND wm.user_id = auth.uid()));
