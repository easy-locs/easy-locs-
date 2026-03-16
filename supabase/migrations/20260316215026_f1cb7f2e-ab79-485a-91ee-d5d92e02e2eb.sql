
-- Multi-vendor tables
CREATE TABLE IF NOT EXISTS public.storefront_vendors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id UUID REFERENCES public.storefront_pages(id) ON DELETE CASCADE NOT NULL,
  vendor_user_id UUID NOT NULL,
  display_name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  logo_url TEXT,
  commission_rate NUMERIC DEFAULT 10,
  status TEXT NOT NULL DEFAULT 'pending',
  total_sales NUMERIC DEFAULT 0,
  total_commission NUMERIC DEFAULT 0,
  payout_balance NUMERIC DEFAULT 0,
  bio TEXT,
  approved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(shop_id, vendor_user_id)
);

CREATE TABLE IF NOT EXISTS public.storefront_vendor_payouts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vendor_id UUID REFERENCES public.storefront_vendors(id) ON DELETE CASCADE NOT NULL,
  shop_id UUID REFERENCES public.storefront_pages(id) ON DELETE CASCADE NOT NULL,
  amount NUMERIC NOT NULL,
  currency TEXT DEFAULT 'EUR',
  status TEXT NOT NULL DEFAULT 'pending',
  method TEXT DEFAULT 'bank_transfer',
  reference TEXT,
  paid_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Gift Cards
CREATE TABLE IF NOT EXISTS public.storefront_gift_cards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id UUID REFERENCES public.storefront_pages(id) ON DELETE CASCADE NOT NULL,
  created_by UUID NOT NULL,
  code TEXT NOT NULL UNIQUE DEFAULT upper(substr(md5(random()::text), 1, 12)),
  initial_amount NUMERIC NOT NULL,
  remaining_amount NUMERIC NOT NULL,
  currency TEXT DEFAULT 'EUR',
  recipient_email TEXT,
  recipient_name TEXT,
  sender_name TEXT,
  personal_message TEXT,
  status TEXT DEFAULT 'active',
  redeemed_by UUID,
  expires_at TIMESTAMPTZ,
  redeemed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.storefront_gift_card_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  gift_card_id UUID REFERENCES public.storefront_gift_cards(id) ON DELETE CASCADE NOT NULL,
  user_id UUID NOT NULL,
  amount NUMERIC NOT NULL,
  type TEXT NOT NULL DEFAULT 'redemption',
  order_id TEXT,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- RLS
ALTER TABLE public.storefront_vendors ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.storefront_vendor_payouts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.storefront_gift_cards ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.storefront_gift_card_transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "vendors_read" ON public.storefront_vendors FOR SELECT USING (true);
CREATE POLICY "vendors_own" ON public.storefront_vendors FOR ALL USING (auth.uid() = vendor_user_id);
CREATE POLICY "vendors_shop_manage" ON public.storefront_vendors FOR ALL USING (
  EXISTS (SELECT 1 FROM public.storefront_pages sp WHERE sp.id = shop_id AND sp.user_id = auth.uid())
);
CREATE POLICY "payouts_vendor" ON public.storefront_vendor_payouts FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.storefront_vendors v WHERE v.id = vendor_id AND v.vendor_user_id = auth.uid())
);
CREATE POLICY "payouts_shop" ON public.storefront_vendor_payouts FOR ALL USING (
  EXISTS (SELECT 1 FROM public.storefront_pages sp WHERE sp.id = shop_id AND sp.user_id = auth.uid())
);
CREATE POLICY "gc_read_own" ON public.storefront_gift_cards FOR SELECT USING (
  auth.uid() = created_by OR auth.uid() = redeemed_by
);
CREATE POLICY "gc_insert" ON public.storefront_gift_cards FOR INSERT WITH CHECK (auth.uid() = created_by);
CREATE POLICY "gc_update" ON public.storefront_gift_cards FOR UPDATE USING (auth.uid() = created_by OR auth.uid() = redeemed_by);
CREATE POLICY "gc_seller" ON public.storefront_gift_cards FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.storefront_pages sp WHERE sp.id = shop_id AND sp.user_id = auth.uid())
);
CREATE POLICY "gc_seller_manage" ON public.storefront_gift_cards FOR ALL USING (
  EXISTS (SELECT 1 FROM public.storefront_pages sp WHERE sp.id = shop_id AND sp.user_id = auth.uid())
);
CREATE POLICY "gc_tx_own" ON public.storefront_gift_card_transactions FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "gc_tx_insert" ON public.storefront_gift_card_transactions FOR INSERT WITH CHECK (auth.uid() = user_id);
