
-- Live chat
CREATE TABLE IF NOT EXISTS public.storefront_live_chat (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID REFERENCES public.storefront_live_sessions(id) ON DELETE CASCADE NOT NULL,
  user_id UUID NOT NULL,
  user_name TEXT NOT NULL DEFAULT 'User',
  message TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE public.storefront_live_chat ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can read live chat" ON public.storefront_live_chat FOR SELECT USING (true);
CREATE POLICY "Auth users can send chat" ON public.storefront_live_chat FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());

-- Affiliate programs
CREATE TABLE IF NOT EXISTS public.storefront_affiliate_programs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id UUID REFERENCES public.storefront_pages(id) ON DELETE CASCADE NOT NULL UNIQUE,
  default_commission_rate NUMERIC DEFAULT 10,
  cookie_days INTEGER DEFAULT 30,
  min_payout NUMERIC DEFAULT 50,
  enabled BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE public.storefront_affiliate_programs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view aff programs" ON public.storefront_affiliate_programs FOR SELECT USING (true);
CREATE POLICY "Shop owner manages aff program" ON public.storefront_affiliate_programs FOR ALL TO authenticated USING (true);

-- Affiliates
CREATE TABLE IF NOT EXISTS public.storefront_affiliates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id UUID REFERENCES public.storefront_pages(id) ON DELETE CASCADE NOT NULL,
  user_id UUID NOT NULL,
  referral_code TEXT NOT NULL,
  commission_rate NUMERIC DEFAULT 10,
  status TEXT DEFAULT 'active',
  total_earned NUMERIC DEFAULT 0,
  total_clicks INTEGER DEFAULT 0,
  total_conversions INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(shop_id, user_id)
);
ALTER TABLE public.storefront_affiliates ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Affiliates can view own aff" ON public.storefront_affiliates FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "Auth can join aff" ON public.storefront_affiliates FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "Seller can view all aff" ON public.storefront_affiliates FOR SELECT TO authenticated USING (true);

-- Affiliate conversions
CREATE TABLE IF NOT EXISTS public.storefront_affiliate_conversions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  affiliate_id UUID REFERENCES public.storefront_affiliates(id) ON DELETE CASCADE NOT NULL,
  order_id UUID,
  order_amount NUMERIC DEFAULT 0,
  commission_amount NUMERIC DEFAULT 0,
  status TEXT DEFAULT 'pending',
  created_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE public.storefront_affiliate_conversions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Affiliate can view own conv" ON public.storefront_affiliate_conversions FOR SELECT TO authenticated USING (
  affiliate_id IN (SELECT id FROM public.storefront_affiliates WHERE user_id = auth.uid())
);

-- Return requests
CREATE TABLE IF NOT EXISTS public.storefront_return_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id UUID REFERENCES public.storefront_pages(id) ON DELETE CASCADE NOT NULL,
  order_id UUID,
  buyer_id UUID NOT NULL,
  reason TEXT NOT NULL DEFAULT 'Defective',
  description TEXT,
  preferred_resolution TEXT DEFAULT 'refund',
  status TEXT NOT NULL DEFAULT 'requested',
  resolved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE public.storefront_return_requests ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Buyer can view own returns rr" ON public.storefront_return_requests FOR SELECT TO authenticated USING (buyer_id = auth.uid());
CREATE POLICY "Buyer can create returns rr" ON public.storefront_return_requests FOR INSERT TO authenticated WITH CHECK (buyer_id = auth.uid());
CREATE POLICY "Seller can view shop returns rr" ON public.storefront_return_requests FOR SELECT TO authenticated USING (true);
CREATE POLICY "Seller can update returns rr" ON public.storefront_return_requests FOR UPDATE TO authenticated USING (true);

-- Refund policies
CREATE TABLE IF NOT EXISTS public.storefront_refund_policies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id UUID REFERENCES public.storefront_pages(id) ON DELETE CASCADE NOT NULL UNIQUE,
  return_window_days INTEGER DEFAULT 30,
  accepts_used BOOLEAN DEFAULT false,
  free_returns BOOLEAN DEFAULT false,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE public.storefront_refund_policies ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view refund policies" ON public.storefront_refund_policies FOR SELECT USING (true);
CREATE POLICY "Owner manages refund policy" ON public.storefront_refund_policies FOR ALL TO authenticated USING (true);

-- Store credits
CREATE TABLE IF NOT EXISTS public.storefront_store_credits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id UUID REFERENCES public.storefront_pages(id) ON DELETE CASCADE NOT NULL,
  user_id UUID NOT NULL,
  balance NUMERIC DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(shop_id, user_id)
);
ALTER TABLE public.storefront_store_credits ENABLE ROW LEVEL SECURITY;
CREATE POLICY "User can view own store credit" ON public.storefront_store_credits FOR SELECT TO authenticated USING (user_id = auth.uid());

-- Realtime for live chat
ALTER PUBLICATION supabase_realtime ADD TABLE public.storefront_live_chat;
