-- 1. PUBLIC-SAFE VIEW
CREATE OR REPLACE VIEW public.public_marketplace_listings
WITH (security_invoker = true) AS
SELECT ms.id, ms.title, ms.description, ms.category, ms.price, ms.currency, ms.price_type,
  ms.country, ms.city, ms.location, ms.photo_urls, ms.listing_type,
  ms.surface_sqm, ms.rooms, ms.bedrooms, ms.bathrooms, ms.year_built,
  ms.features, ms.condition, ms.brand, ms.model, ms.video_url, ms.badges,
  ms.active, ms.status, ms.lat, ms.lng, ms.boost_tier, ms.boost_until,
  ms.created_at, ms.updated_at, ms.listing_expires_at, ms.auto_expire,
  ms.entity_type, ms.presence_mode, ms.duration_minutes, ms.max_capacity,
  ms.published_at, ms.org_id
FROM public.marketplace_services ms
WHERE ms.active = true AND ms.status = 'published'
  AND (ms.listing_expires_at IS NULL OR ms.listing_expires_at > now());

-- 2. APPROVAL_QUEUES
CREATE POLICY "admin_read_approval_queues" ON public.approval_queues FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.org_members om WHERE om.user_id = auth.uid() AND om.org_id = approval_queues.workspace_id AND om.role IN ('owner','admin')));
CREATE POLICY "admin_insert_approval_queues" ON public.approval_queues FOR INSERT TO authenticated
  WITH CHECK (requested_by = auth.uid());
CREATE POLICY "admin_update_approval_queues" ON public.approval_queues FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.org_members om WHERE om.user_id = auth.uid() AND om.org_id = approval_queues.workspace_id AND om.role IN ('owner','admin')));

-- 3. APPROVAL_ACTIONS
CREATE POLICY "admin_read_approval_actions" ON public.approval_actions FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.approval_queues aq JOIN public.org_members om ON om.org_id = aq.workspace_id AND om.user_id = auth.uid() WHERE aq.id = approval_actions.queue_id AND om.role IN ('owner','admin')));
CREATE POLICY "admin_insert_approval_actions" ON public.approval_actions FOR INSERT TO authenticated
  WITH CHECK (actor_id = auth.uid());

-- 4. Reference tables - authenticated read
DO $$ DECLARE tbl text; BEGIN
  FOR tbl IN SELECT unnest(ARRAY['automation_workflows','categories','subcategories','verticals','commission_rules','delivery_pricing_rules','demand_zones','surge_pricing_rules','surge_pricing_events','fx_rates_cache','rtc_config','featured_shops','growth_city_pages','permission_templates','category_attributes','live_translation_stream','rtc_signaling_messages','media_assets','exchange_connectors']) LOOP
    EXECUTE format('CREATE POLICY "authenticated_read_%s" ON public.%I FOR SELECT TO authenticated USING (true)', tbl, tbl);
  END LOOP;
END $$;

-- 5. Deny-all tables
DO $$ DECLARE tbl text; BEGIN
  FOR tbl IN SELECT unnest(ARRAY['fraud_edges','fraud_entities','device_attestations','incident_cases','incident_case_events','recon_alerts','log_export_jobs','ops_sla_events','executive_kpi_snapshots','city_supply_balancer_logs','dino_entity_state','dino_issues','dino_media_rules','dino_notifications','dino_page_audits','dino_quality_scores','dino_route_registry','dino_runs','dino_sync_jobs','import_test_batches','category_cleanup_tasks','onboarding_audit','dispatch_candidate_drivers','dispatch_offers','dispatch_prediction_jobs','driver_clusters','driver_live_locations','driver_metrics','driver_mission_offers','ride_eta_snapshots','ops_live_metrics','order_payout_locks','merchant_activation_events','merchant_menu_import_items','merchant_onboarding_sources','merchant_outreach_campaigns','sales_ai_activities','sales_ai_sequence_runs','sales_ai_sequence_steps','sales_ai_sequences','storefront_affiliate_programs','growth_demand_events','stealth_notifications','exchange_quotes','ghost_call_participants','ghost_call_signals','journey_events','moderation_events','ghost_threads','orbit_device_keys','orbit_session_tokens']) LOOP
    EXECUTE format('CREATE POLICY "service_only_deny_%s" ON public.%I FOR SELECT TO authenticated USING (false)', tbl, tbl);
  END LOOP;
END $$;

-- 6. User-scoped
CREATE POLICY "creator_read_ai_chat_threads" ON public.ai_chat_threads FOR SELECT TO authenticated USING (created_by = auth.uid());
CREATE POLICY "owner_read_ai_chat_usage" ON public.ai_chat_usage FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "owner_read_listing_views" ON public.listing_views FOR SELECT TO authenticated USING (user_id = auth.uid());

-- 7. Workspace-scoped
CREATE POLICY "workspace_read_ai_ops_suggestions" ON public.ai_ops_suggestions FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.org_members om WHERE om.user_id = auth.uid() AND om.org_id = ai_ops_suggestions.workspace_id));
CREATE POLICY "workspace_read_wallet_transfers" ON public.wallet_transfers FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.org_members om WHERE om.user_id = auth.uid() AND om.org_id = wallet_transfers.workspace_id));

-- 8. Participant-scoped
CREATE POLICY "creator_read_ghost_call_sessions" ON public.ghost_call_sessions FOR SELECT TO authenticated USING (created_by = auth.uid());
CREATE POLICY "creator_read_ghost_chat_sessions" ON public.ghost_chat_sessions FOR SELECT TO authenticated USING (created_by = auth.uid());
CREATE POLICY "participant_read_call_participants" ON public.call_participants FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "user_read_orbit_identity_profiles" ON public.orbit_identity_profiles FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "user_read_orbit_call_presence" ON public.orbit_call_presence FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "user_read_exchange_orders" ON public.exchange_orders FOR SELECT TO authenticated USING (user_id = auth.uid());

-- 9. AUTO-EXPIRATION trigger
CREATE OR REPLACE FUNCTION public.set_listing_expiry()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.listing_expires_at IS NULL AND NEW.auto_expire = true THEN
    NEW.listing_expires_at := COALESCE(NEW.published_at, now()) + interval '30 days';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_set_listing_expiry ON public.marketplace_services;
CREATE TRIGGER trg_set_listing_expiry BEFORE INSERT ON public.marketplace_services FOR EACH ROW EXECUTE FUNCTION public.set_listing_expiry();

DROP TRIGGER IF EXISTS trg_set_listing_expiry_update ON public.marketplace_services;
CREATE TRIGGER trg_set_listing_expiry_update BEFORE UPDATE OF published_at ON public.marketplace_services FOR EACH ROW
  WHEN (OLD.published_at IS DISTINCT FROM NEW.published_at AND NEW.auto_expire = true AND NEW.listing_expires_at IS NULL)
  EXECUTE FUNCTION public.set_listing_expiry();