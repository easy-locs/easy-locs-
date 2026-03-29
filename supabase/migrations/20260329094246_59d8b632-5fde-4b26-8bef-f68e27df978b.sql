
-- WAVE 12: Final security hardening (verified all column names)

CREATE OR REPLACE FUNCTION public.get_published_reviews(p_provider_id uuid, p_limit int DEFAULT 50, p_offset int DEFAULT 0)
RETURNS TABLE(
  id uuid, provider_id uuid, service_id uuid, booking_id uuid,
  reviewer_name text, rating int, comment text, response text,
  responded_at timestamptz, status text, created_at timestamptz, verified boolean
)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT r.id, r.provider_id, r.service_id, r.booking_id,
         r.reviewer_name, r.rating, r.comment, r.response,
         r.responded_at, r.status, r.created_at, r.verified
  FROM public.marketplace_reviews r
  WHERE r.provider_id = p_provider_id AND r.status = 'published'
  ORDER BY r.created_at DESC LIMIT p_limit OFFSET p_offset;
$$;

DROP POLICY IF EXISTS "own_otp_select" ON public.phone_otp_sessions;
DROP POLICY IF EXISTS "strict_own_otp_select" ON public.phone_otp_sessions;

DROP POLICY IF EXISTS "Anyone can read engine logs" ON public.engine_run_logs;
DROP POLICY IF EXISTS "Authenticated read access" ON public.engine_run_logs;

DROP POLICY IF EXISTS "Authenticated users can read driver stats" ON public.mobility_driver_stats;
DROP POLICY IF EXISTS "owner_read_driver_stats" ON public.mobility_driver_stats;
CREATE POLICY "owner_read_driver_stats_v2" ON public.mobility_driver_stats
  FOR SELECT TO authenticated USING (rider_user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Authenticated users can read driver scores" ON public.mobility_driver_scores;
DROP POLICY IF EXISTS "owner_read_driver_scores" ON public.mobility_driver_scores;
CREATE POLICY "owner_read_driver_scores_v2" ON public.mobility_driver_scores
  FOR SELECT TO authenticated USING (rider_user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Authenticated users can read dispatch runs" ON public.mobility_dispatch_runs;
CREATE POLICY "admin_read_dispatch_runs" ON public.mobility_dispatch_runs
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Authenticated users read order status history" ON public.order_status_history;
DROP POLICY IF EXISTS "participants_read_order_history" ON public.order_status_history;
CREATE POLICY "participants_read_order_history_v2" ON public.order_status_history
  FOR SELECT TO authenticated USING (
    EXISTS (
      SELECT 1 FROM public.storefront_orders o
      WHERE o.id = order_status_history.order_id
        AND (o.buyer_id = auth.uid() OR o.seller_id = auth.uid() OR o.shop_id IN (
          SELECT sp.id FROM public.storefront_pages sp WHERE sp.user_id = auth.uid()
        ))
    ) OR public.has_role(auth.uid(), 'admin')
  );

DROP POLICY IF EXISTS "authenticated_read_call_transcripts" ON public.call_transcripts;
CREATE POLICY "participant_read_transcripts" ON public.call_transcripts
  FOR SELECT TO authenticated USING (
    speaker_user_id = auth.uid() OR public.has_role(auth.uid(), 'admin')
  );

DROP POLICY IF EXISTS "orbit_media_open_logs_select_auth" ON public.orbit_media_open_logs;
CREATE POLICY "participant_read_media_logs" ON public.orbit_media_open_logs
  FOR SELECT TO authenticated USING (opened_by_user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Anon read browser_repair_events" ON public.browser_repair_events;
DROP POLICY IF EXISTS "Auth read browser_repair_events" ON public.browser_repair_events;
DROP POLICY IF EXISTS "browser_repair_events_select_auth" ON public.browser_repair_events;
CREATE POLICY "admin_read_repair_events" ON public.browser_repair_events
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "browser_repair_actions_select_auth" ON public.browser_repair_actions;
CREATE POLICY "admin_read_repair_actions" ON public.browser_repair_actions
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "browser_repair_issues_select_auth" ON public.browser_repair_issues;
CREATE POLICY "admin_read_repair_issues" ON public.browser_repair_issues
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "browser_repair_runs_select_auth" ON public.browser_repair_runs;
CREATE POLICY "admin_read_repair_runs" ON public.browser_repair_runs
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Anon read browser_repair_watchdog" ON public.browser_repair_watchdog;
DROP POLICY IF EXISTS "Auth read browser_repair_watchdog" ON public.browser_repair_watchdog;
DROP POLICY IF EXISTS "browser_repair_watchdog_select_auth" ON public.browser_repair_watchdog;
CREATE POLICY "admin_read_repair_watchdog" ON public.browser_repair_watchdog
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Allow anon read ranking_snapshots" ON public.ranking_snapshots;
DROP POLICY IF EXISTS "Allow authenticated read ranking_snapshots" ON public.ranking_snapshots;
CREATE POLICY "admin_read_ranking_snapshots" ON public.ranking_snapshots
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "browser_telemetry_select_authenticated" ON public.browser_telemetry_events;
CREATE POLICY "admin_read_telemetry" ON public.browser_telemetry_events
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));
