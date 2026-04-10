
-- Fix service_providers with proper cast for app_role enum
DROP POLICY IF EXISTS "Org admins can delete providers" ON public.service_providers;
DROP POLICY IF EXISTS "Org admins can update providers" ON public.service_providers;
DROP POLICY IF EXISTS "Org admins can delete own providers" ON public.service_providers;
DROP POLICY IF EXISTS "Org admins can update own providers" ON public.service_providers;

CREATE POLICY "Org admins can delete own providers" ON public.service_providers FOR DELETE TO authenticated
  USING (EXISTS (SELECT 1 FROM org_members om WHERE om.user_id = auth.uid() AND om.org_id = service_providers.created_by_org_id AND om.role::text = ANY (ARRAY['owner', 'admin'])));
CREATE POLICY "Org admins can update own providers" ON public.service_providers FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM org_members om WHERE om.user_id = auth.uid() AND om.org_id = service_providers.created_by_org_id AND om.role::text = ANY (ARRAY['owner', 'admin'])))
  WITH CHECK (EXISTS (SELECT 1 FROM org_members om WHERE om.user_id = auth.uid() AND om.org_id = service_providers.created_by_org_id AND om.role::text = ANY (ARRAY['owner', 'admin'])));

-- Fix shipments and RFQ quotes
DROP POLICY IF EXISTS "shipments_read_v3" ON public.storefront_shipments;
DROP POLICY IF EXISTS "Buyer reads own shipments" ON public.storefront_shipments;
CREATE POLICY "Buyer reads own shipments" ON public.storefront_shipments FOR SELECT TO authenticated
  USING (buyer_id = auth.uid() OR EXISTS (SELECT 1 FROM storefront_pages sp WHERE sp.id = storefront_shipments.shop_id AND sp.user_id = auth.uid()));

DROP POLICY IF EXISTS "rfq_quotes_read" ON public.storefront_rfq_quotes;
DROP POLICY IF EXISTS "RFQ participants read quotes" ON public.storefront_rfq_quotes;
CREATE POLICY "RFQ participants read quotes" ON public.storefront_rfq_quotes FOR SELECT TO authenticated
  USING (vendor_id = auth.uid() OR EXISTS (SELECT 1 FROM storefront_rfqs r WHERE r.id = storefront_rfq_quotes.rfq_id AND r.buyer_id = auth.uid()));
