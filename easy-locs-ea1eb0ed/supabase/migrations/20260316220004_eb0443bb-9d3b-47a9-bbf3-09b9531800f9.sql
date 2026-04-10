
-- =============================================
-- ORBIT V1: Subscription Boxes, Reverse Auctions, Digital Products, P2P Marketplace
-- =============================================

-- 1. Subscription Boxes
CREATE TABLE IF NOT EXISTS public.storefront_sub_boxes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id UUID REFERENCES public.storefront_pages(id) ON DELETE CASCADE NOT NULL,
  user_id UUID NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  price NUMERIC NOT NULL DEFAULT 0,
  currency TEXT DEFAULT 'EUR',
  frequency TEXT NOT NULL DEFAULT 'monthly',
  item_count INTEGER DEFAULT 3,
  photo_url TEXT,
  active BOOLEAN DEFAULT true,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.storefront_sub_box_enrollments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  box_id UUID REFERENCES public.storefront_sub_boxes(id) ON DELETE CASCADE NOT NULL,
  shop_id UUID REFERENCES public.storefront_pages(id) ON DELETE CASCADE NOT NULL,
  subscriber_id UUID NOT NULL,
  status TEXT NOT NULL DEFAULT 'active',
  shipping_address TEXT,
  next_delivery_at TIMESTAMPTZ,
  last_delivery_at TIMESTAMPTZ,
  delivery_count INTEGER DEFAULT 0,
  paused_at TIMESTAMPTZ,
  cancelled_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.storefront_sub_boxes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.storefront_sub_box_enrollments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "sub_boxes_read" ON public.storefront_sub_boxes FOR SELECT USING (true);
CREATE POLICY "sub_boxes_manage" ON public.storefront_sub_boxes FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "box_enroll_own" ON public.storefront_sub_box_enrollments FOR SELECT USING (auth.uid() = subscriber_id);
CREATE POLICY "box_enroll_insert" ON public.storefront_sub_box_enrollments FOR INSERT WITH CHECK (auth.uid() = subscriber_id);
CREATE POLICY "box_enroll_update" ON public.storefront_sub_box_enrollments FOR UPDATE USING (auth.uid() = subscriber_id);
CREATE POLICY "box_enroll_seller" ON public.storefront_sub_box_enrollments FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.storefront_pages sp WHERE sp.id = shop_id AND sp.user_id = auth.uid())
);

-- 2. Reverse Auctions / RFQ
CREATE TABLE IF NOT EXISTS public.storefront_rfqs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id UUID REFERENCES public.storefront_pages(id) ON DELETE CASCADE NOT NULL,
  buyer_id UUID NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  category TEXT,
  budget_max NUMERIC,
  currency TEXT DEFAULT 'EUR',
  quantity INTEGER DEFAULT 1,
  deadline TIMESTAMPTZ,
  status TEXT NOT NULL DEFAULT 'open',
  winning_quote_id UUID,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.storefront_rfq_quotes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  rfq_id UUID REFERENCES public.storefront_rfqs(id) ON DELETE CASCADE NOT NULL,
  vendor_id UUID NOT NULL,
  vendor_name TEXT,
  price NUMERIC NOT NULL,
  currency TEXT DEFAULT 'EUR',
  delivery_days INTEGER,
  message TEXT,
  status TEXT DEFAULT 'submitted',
  selected BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.storefront_rfqs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.storefront_rfq_quotes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "rfq_read" ON public.storefront_rfqs FOR SELECT USING (true);
CREATE POLICY "rfq_create" ON public.storefront_rfqs FOR INSERT WITH CHECK (auth.uid() = buyer_id);
CREATE POLICY "rfq_update" ON public.storefront_rfqs FOR UPDATE USING (auth.uid() = buyer_id);
CREATE POLICY "rfq_seller" ON public.storefront_rfqs FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.storefront_pages sp WHERE sp.id = shop_id AND sp.user_id = auth.uid())
);
CREATE POLICY "rfq_quotes_read" ON public.storefront_rfq_quotes FOR SELECT USING (true);
CREATE POLICY "rfq_quotes_create" ON public.storefront_rfq_quotes FOR INSERT WITH CHECK (auth.uid() = vendor_id);
CREATE POLICY "rfq_quotes_update" ON public.storefront_rfq_quotes FOR UPDATE USING (auth.uid() = vendor_id);

-- 3. Digital Products
CREATE TABLE IF NOT EXISTS public.storefront_digital_products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id UUID REFERENCES public.storefront_pages(id) ON DELETE CASCADE NOT NULL,
  user_id UUID NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  product_type TEXT DEFAULT 'download',
  price NUMERIC NOT NULL DEFAULT 0,
  currency TEXT DEFAULT 'EUR',
  file_url TEXT,
  file_size_bytes BIGINT,
  preview_url TEXT,
  download_limit INTEGER,
  license_type TEXT DEFAULT 'personal',
  active BOOLEAN DEFAULT true,
  total_sales INTEGER DEFAULT 0,
  photo_url TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.storefront_digital_purchases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID REFERENCES public.storefront_digital_products(id) ON DELETE CASCADE NOT NULL,
  buyer_id UUID NOT NULL,
  shop_id UUID REFERENCES public.storefront_pages(id) ON DELETE CASCADE NOT NULL,
  license_key TEXT DEFAULT upper(substr(md5(random()::text), 1, 16)),
  download_count INTEGER DEFAULT 0,
  max_downloads INTEGER DEFAULT 5,
  expires_at TIMESTAMPTZ,
  status TEXT DEFAULT 'active',
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.storefront_digital_products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.storefront_digital_purchases ENABLE ROW LEVEL SECURITY;

CREATE POLICY "dp_read" ON public.storefront_digital_products FOR SELECT USING (true);
CREATE POLICY "dp_manage" ON public.storefront_digital_products FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "dp_purchase_own" ON public.storefront_digital_purchases FOR SELECT USING (auth.uid() = buyer_id);
CREATE POLICY "dp_purchase_insert" ON public.storefront_digital_purchases FOR INSERT WITH CHECK (auth.uid() = buyer_id);
CREATE POLICY "dp_purchase_seller" ON public.storefront_digital_purchases FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.storefront_pages sp WHERE sp.id = shop_id AND sp.user_id = auth.uid())
);

-- 4. P2P Marketplace
CREATE TABLE IF NOT EXISTS public.storefront_p2p_listings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id UUID REFERENCES public.storefront_pages(id) ON DELETE CASCADE NOT NULL,
  seller_id UUID NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  price NUMERIC NOT NULL,
  currency TEXT DEFAULT 'EUR',
  category TEXT,
  condition TEXT DEFAULT 'used_good',
  photo_urls JSONB DEFAULT '[]',
  location_city TEXT,
  location_country TEXT,
  status TEXT DEFAULT 'active',
  views_count INTEGER DEFAULT 0,
  verified_seller BOOLEAN DEFAULT false,
  escrow_enabled BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.storefront_p2p_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  listing_id UUID REFERENCES public.storefront_p2p_listings(id) ON DELETE CASCADE NOT NULL,
  buyer_id UUID NOT NULL,
  seller_id UUID NOT NULL,
  amount NUMERIC NOT NULL,
  currency TEXT DEFAULT 'EUR',
  escrow_status TEXT DEFAULT 'pending',
  status TEXT DEFAULT 'initiated',
  buyer_confirmed BOOLEAN DEFAULT false,
  seller_shipped BOOLEAN DEFAULT false,
  tracking_number TEXT,
  dispute_reason TEXT,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.storefront_p2p_listings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.storefront_p2p_transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "p2p_listings_read" ON public.storefront_p2p_listings FOR SELECT USING (true);
CREATE POLICY "p2p_listings_manage" ON public.storefront_p2p_listings FOR ALL USING (auth.uid() = seller_id);
CREATE POLICY "p2p_tx_parties" ON public.storefront_p2p_transactions FOR SELECT USING (auth.uid() = buyer_id OR auth.uid() = seller_id);
CREATE POLICY "p2p_tx_create" ON public.storefront_p2p_transactions FOR INSERT WITH CHECK (auth.uid() = buyer_id);
CREATE POLICY "p2p_tx_update" ON public.storefront_p2p_transactions FOR UPDATE USING (auth.uid() = buyer_id OR auth.uid() = seller_id);
CREATE POLICY "p2p_seller_view" ON public.storefront_p2p_listings FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.storefront_pages sp WHERE sp.id = shop_id AND sp.user_id = auth.uid())
);
