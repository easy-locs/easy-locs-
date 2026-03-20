
-- =====================================================================
-- SECURITY HARDENING: RLS + Policies
-- =====================================================================

-- 1) Enable RLS
ALTER TABLE IF EXISTS public.seed_merchant_promos ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.delivery_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.storefront_loyalty_points ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.storefront_inventory_alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.storefront_stock_movements ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.chat_messages_v2 ENABLE ROW LEVEL SECURITY;

-- 2) seed_merchant_promos
DROP POLICY IF EXISTS "read_active_promos" ON public.seed_merchant_promos;
CREATE POLICY "read_active_promos"
ON public.seed_merchant_promos FOR SELECT TO authenticated
USING (is_active = true);

-- 3) delivery_jobs
DROP POLICY IF EXISTS "delivery_jobs_participant_select" ON public.delivery_jobs;
CREATE POLICY "delivery_jobs_participant_select"
ON public.delivery_jobs FOR SELECT TO authenticated
USING (
  auth.uid() = seller_id OR auth.uid() = driver_id
  OR EXISTS (SELECT 1 FROM public.org_members om WHERE om.user_id = auth.uid() AND om.org_id = delivery_jobs.org_id)
);

DROP POLICY IF EXISTS "delivery_jobs_seller_insert" ON public.delivery_jobs;
CREATE POLICY "delivery_jobs_seller_insert"
ON public.delivery_jobs FOR INSERT TO authenticated
WITH CHECK (auth.uid() = seller_id);

DROP POLICY IF EXISTS "delivery_jobs_participant_update" ON public.delivery_jobs;
CREATE POLICY "delivery_jobs_participant_update"
ON public.delivery_jobs FOR UPDATE TO authenticated
USING (
  auth.uid() = seller_id OR auth.uid() = driver_id
  OR EXISTS (SELECT 1 FROM public.org_members om WHERE om.user_id = auth.uid() AND om.org_id = delivery_jobs.org_id AND om.role IN ('owner','admin'))
);

-- 4) storefront_loyalty_points
DROP POLICY IF EXISTS "loyalty_user_owns" ON public.storefront_loyalty_points;
CREATE POLICY "loyalty_user_owns"
ON public.storefront_loyalty_points FOR ALL TO authenticated
USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- 5) storefront_inventory_alerts
DROP POLICY IF EXISTS "inventory_alerts_shop_member" ON public.storefront_inventory_alerts;
CREATE POLICY "inventory_alerts_shop_member"
ON public.storefront_inventory_alerts FOR ALL TO authenticated
USING (EXISTS (SELECT 1 FROM public.storefront_pages sp WHERE sp.id = storefront_inventory_alerts.shop_id AND sp.user_id = auth.uid()))
WITH CHECK (EXISTS (SELECT 1 FROM public.storefront_pages sp WHERE sp.id = storefront_inventory_alerts.shop_id AND sp.user_id = auth.uid()));

-- 6) storefront_stock_movements
DROP POLICY IF EXISTS "stock_movements_shop_member" ON public.storefront_stock_movements;
CREATE POLICY "stock_movements_shop_member"
ON public.storefront_stock_movements FOR ALL TO authenticated
USING (auth.uid() = user_id OR EXISTS (SELECT 1 FROM public.storefront_pages sp WHERE sp.id = storefront_stock_movements.shop_id AND sp.user_id = auth.uid()))
WITH CHECK (auth.uid() = user_id OR EXISTS (SELECT 1 FROM public.storefront_pages sp WHERE sp.id = storefront_stock_movements.shop_id AND sp.user_id = auth.uid()));

-- 7) chat_messages_v2
DROP POLICY IF EXISTS "chat_messages_v2_sender_access" ON public.chat_messages_v2;
CREATE POLICY "chat_messages_v2_sender_access"
ON public.chat_messages_v2 FOR ALL TO authenticated
USING (auth.uid() = sender_user_id) WITH CHECK (auth.uid() = sender_user_id);

DROP POLICY IF EXISTS "chat_messages_v2_conversation_read" ON public.chat_messages_v2;
CREATE POLICY "chat_messages_v2_conversation_read"
ON public.chat_messages_v2 FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.conversations_v2 c
    WHERE c.id = chat_messages_v2.conversation_id
      AND c.participants::text LIKE '%' || auth.uid()::text || '%'
  )
);
