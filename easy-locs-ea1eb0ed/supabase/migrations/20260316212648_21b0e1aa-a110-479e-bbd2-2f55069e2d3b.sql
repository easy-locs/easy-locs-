
-- Wishlists & shares (new tables)
CREATE TABLE IF NOT EXISTS public.storefront_wishlists (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  shop_id UUID REFERENCES public.storefront_pages(id) ON DELETE CASCADE NOT NULL,
  item_id UUID NOT NULL,
  price_at_add NUMERIC,
  notify_price_drop BOOLEAN NOT NULL DEFAULT true,
  notify_back_in_stock BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, item_id)
);

CREATE TABLE IF NOT EXISTS public.storefront_wishlist_shares (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  shop_id UUID REFERENCES public.storefront_pages(id) ON DELETE CASCADE NOT NULL,
  share_token TEXT NOT NULL DEFAULT encode(gen_random_bytes(16), 'hex'),
  item_ids TEXT[] NOT NULL DEFAULT '{}',
  title TEXT DEFAULT 'My Wishlist',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(share_token)
);

-- Enable RLS
ALTER TABLE public.storefront_wishlists ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.storefront_wishlist_shares ENABLE ROW LEVEL SECURITY;

-- Policies
DO $$ BEGIN CREATE POLICY "wishlists_own_v3" ON public.storefront_wishlists FOR ALL TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid()); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE POLICY "wishlist_shares_own_v3" ON public.storefront_wishlist_shares FOR ALL TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid()); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE POLICY "wishlist_shares_read_v3" ON public.storefront_wishlist_shares FOR SELECT USING (true); EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Flash sales: use shop_id based policy (no user_id column)
DO $$ BEGIN CREATE POLICY "flash_sales_manage_v3" ON public.storefront_flash_sales FOR ALL TO authenticated USING (
  EXISTS (SELECT 1 FROM public.storefront_pages sp WHERE sp.id = shop_id AND sp.user_id = auth.uid())
) WITH CHECK (
  EXISTS (SELECT 1 FROM public.storefront_pages sp WHERE sp.id = shop_id AND sp.user_id = auth.uid())
); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE POLICY "flash_sales_read_v3" ON public.storefront_flash_sales FOR SELECT USING (status = 'active'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Analytics events
DO $$ BEGIN CREATE POLICY "analytics_insert_v3" ON public.storefront_analytics_events FOR INSERT WITH CHECK (true); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE POLICY "analytics_read_v3" ON public.storefront_analytics_events FOR SELECT TO authenticated USING (
  EXISTS (SELECT 1 FROM public.storefront_pages sp WHERE sp.id = shop_id AND sp.user_id = auth.uid())
); EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Shipping zones (no user_id)
DO $$ BEGIN CREATE POLICY "szones_manage_v3" ON public.storefront_shipping_zones FOR ALL TO authenticated USING (
  EXISTS (SELECT 1 FROM public.storefront_pages sp WHERE sp.id = shop_id AND sp.user_id = auth.uid())
) WITH CHECK (
  EXISTS (SELECT 1 FROM public.storefront_pages sp WHERE sp.id = shop_id AND sp.user_id = auth.uid())
); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE POLICY "szones_read_v3" ON public.storefront_shipping_zones FOR SELECT USING (active = true); EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Shipments (no user_id)
DO $$ BEGIN CREATE POLICY "shipments_manage_v3" ON public.storefront_shipments FOR ALL TO authenticated USING (
  EXISTS (SELECT 1 FROM public.storefront_pages sp WHERE sp.id = shop_id AND sp.user_id = auth.uid())
) WITH CHECK (
  EXISTS (SELECT 1 FROM public.storefront_pages sp WHERE sp.id = shop_id AND sp.user_id = auth.uid())
); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE POLICY "shipments_read_v3" ON public.storefront_shipments FOR SELECT USING (true); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
