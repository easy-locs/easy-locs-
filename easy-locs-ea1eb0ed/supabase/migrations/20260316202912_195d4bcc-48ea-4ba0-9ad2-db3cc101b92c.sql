
-- ========================================
-- ORBIT V1: Comparison, Affiliate, Auction, Warehouse
-- ========================================

-- 1. Product comparisons (saved by users)
CREATE TABLE IF NOT EXISTS public.storefront_comparisons (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  shop_id UUID NOT NULL,
  item_ids UUID[] NOT NULL DEFAULT '{}',
  title TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.storefront_comparisons ENABLE ROW LEVEL SECURITY;
CREATE POLICY "User manages own comparisons" ON public.storefront_comparisons FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- 2. Affiliate / Referral program
CREATE TABLE IF NOT EXISTS public.storefront_affiliates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id UUID NOT NULL,
  user_id UUID NOT NULL,
  referral_code TEXT NOT NULL,
  commission_rate NUMERIC NOT NULL DEFAULT 10,
  total_clicks INT NOT NULL DEFAULT 0,
  total_conversions INT NOT NULL DEFAULT 0,
  total_earned NUMERIC NOT NULL DEFAULT 0,
  total_paid NUMERIC NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'active',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(shop_id, user_id),
  UNIQUE(referral_code)
);
ALTER TABLE public.storefront_affiliates ENABLE ROW LEVEL SECURITY;
CREATE POLICY "User reads own affiliate" ON public.storefront_affiliates FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "User creates affiliate" ON public.storefront_affiliates FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "User updates own affiliate" ON public.storefront_affiliates FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Shop owner reads all affiliates" ON public.storefront_affiliates FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.storefront_pages sp WHERE sp.id = shop_id AND sp.user_id = auth.uid()));

-- Affiliate clicks tracking
CREATE TABLE IF NOT EXISTS public.storefront_affiliate_clicks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  affiliate_id UUID NOT NULL REFERENCES public.storefront_affiliates(id) ON DELETE CASCADE,
  item_id UUID,
  referrer TEXT,
  converted BOOLEAN NOT NULL DEFAULT false,
  order_id UUID,
  commission_amount NUMERIC,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.storefront_affiliate_clicks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Affiliate reads own clicks" ON public.storefront_affiliate_clicks FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.storefront_affiliates sa WHERE sa.id = affiliate_id AND sa.user_id = auth.uid()));
CREATE POLICY "Anyone inserts clicks" ON public.storefront_affiliate_clicks FOR INSERT TO anon, authenticated WITH CHECK (true);

-- 3. Auction system
CREATE TABLE IF NOT EXISTS public.storefront_auctions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id UUID NOT NULL,
  item_id UUID NOT NULL,
  seller_id UUID NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  photo_url TEXT,
  starting_price NUMERIC NOT NULL DEFAULT 1,
  reserve_price NUMERIC,
  current_bid NUMERIC,
  current_bidder_id UUID,
  bid_count INT NOT NULL DEFAULT 0,
  currency TEXT NOT NULL DEFAULT 'EUR',
  starts_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  ends_at TIMESTAMPTZ NOT NULL,
  auto_extend_minutes INT NOT NULL DEFAULT 5,
  status TEXT NOT NULL DEFAULT 'active',
  winner_id UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.storefront_auctions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone reads active auctions" ON public.storefront_auctions FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Seller manages auctions" ON public.storefront_auctions FOR ALL TO authenticated
  USING (auth.uid() = seller_id) WITH CHECK (auth.uid() = seller_id);

-- Auction bids
CREATE TABLE IF NOT EXISTS public.storefront_auction_bids (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  auction_id UUID NOT NULL REFERENCES public.storefront_auctions(id) ON DELETE CASCADE,
  bidder_id UUID NOT NULL,
  amount NUMERIC NOT NULL,
  is_winning BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.storefront_auction_bids ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone reads bids" ON public.storefront_auction_bids FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Auth places bids" ON public.storefront_auction_bids FOR INSERT TO authenticated WITH CHECK (auth.uid() = bidder_id);

-- Trigger: update auction on new bid
CREATE OR REPLACE FUNCTION public.trg_auction_bid_update()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  _auction RECORD;
BEGIN
  SELECT * INTO _auction FROM public.storefront_auctions WHERE id = NEW.auction_id FOR UPDATE;
  
  IF _auction.status != 'active' THEN
    RAISE EXCEPTION 'Auction is not active';
  END IF;
  
  IF _auction.ends_at < now() THEN
    RAISE EXCEPTION 'Auction has ended';
  END IF;
  
  IF NEW.amount <= COALESCE(_auction.current_bid, _auction.starting_price - 1) THEN
    RAISE EXCEPTION 'Bid must be higher than current bid';
  END IF;
  
  -- Mark previous winning bid as not winning
  UPDATE public.storefront_auction_bids SET is_winning = false WHERE auction_id = NEW.auction_id AND is_winning = true;
  NEW.is_winning := true;
  
  -- Update auction
  UPDATE public.storefront_auctions SET
    current_bid = NEW.amount,
    current_bidder_id = NEW.bidder_id,
    bid_count = bid_count + 1,
    -- Auto-extend if bid within last N minutes
    ends_at = CASE WHEN ends_at - now() < (auto_extend_minutes || ' minutes')::interval
              THEN ends_at + (auto_extend_minutes || ' minutes')::interval
              ELSE ends_at END,
    updated_at = now()
  WHERE id = NEW.auction_id;
  
  RETURN NEW;
END;$$;

CREATE TRIGGER trg_auction_bid
BEFORE INSERT ON public.storefront_auction_bids
FOR EACH ROW EXECUTE FUNCTION public.trg_auction_bid_update();

-- Enable realtime for auctions
ALTER PUBLICATION supabase_realtime ADD TABLE public.storefront_auctions;

-- 4. Multi-Warehouse
CREATE TABLE IF NOT EXISTS public.storefront_warehouses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id UUID NOT NULL,
  name TEXT NOT NULL,
  address TEXT,
  city TEXT,
  country TEXT NOT NULL DEFAULT 'FR',
  latitude NUMERIC,
  longitude NUMERIC,
  is_default BOOLEAN NOT NULL DEFAULT false,
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.storefront_warehouses ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Shop owner manages warehouses" ON public.storefront_warehouses FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.storefront_pages sp WHERE sp.id = shop_id AND sp.user_id = auth.uid()));

-- Warehouse stock (per item per warehouse)
CREATE TABLE IF NOT EXISTS public.storefront_warehouse_stock (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  warehouse_id UUID NOT NULL REFERENCES public.storefront_warehouses(id) ON DELETE CASCADE,
  item_id UUID NOT NULL,
  quantity INT NOT NULL DEFAULT 0,
  reserved INT NOT NULL DEFAULT 0,
  reorder_point INT NOT NULL DEFAULT 5,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(warehouse_id, item_id)
);
ALTER TABLE public.storefront_warehouse_stock ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Shop owner manages stock" ON public.storefront_warehouse_stock FOR ALL TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.storefront_warehouses sw
    JOIN public.storefront_pages sp ON sp.id = sw.shop_id
    WHERE sw.id = warehouse_id AND sp.user_id = auth.uid()
  ));

-- Warehouse transfers
CREATE TABLE IF NOT EXISTS public.storefront_warehouse_transfers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id UUID NOT NULL,
  from_warehouse_id UUID NOT NULL REFERENCES public.storefront_warehouses(id),
  to_warehouse_id UUID NOT NULL REFERENCES public.storefront_warehouses(id),
  item_id UUID NOT NULL,
  quantity INT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at TIMESTAMPTZ
);
ALTER TABLE public.storefront_warehouse_transfers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Shop owner manages transfers" ON public.storefront_warehouse_transfers FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.storefront_pages sp WHERE sp.id = shop_id AND sp.user_id = auth.uid()));
