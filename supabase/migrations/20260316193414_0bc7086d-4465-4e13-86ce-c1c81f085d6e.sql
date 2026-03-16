
-- Storefront Coupons table
CREATE TABLE IF NOT EXISTS public.storefront_coupons (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id UUID NOT NULL REFERENCES public.storefront_pages(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  code TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT 'percentage' CHECK (type IN ('percentage', 'fixed', 'free_delivery')),
  value NUMERIC NOT NULL DEFAULT 0,
  currency TEXT DEFAULT 'EUR',
  min_order NUMERIC DEFAULT 0,
  max_discount NUMERIC,
  usage_limit INTEGER DEFAULT 100,
  usage_count INTEGER DEFAULT 0,
  per_user_limit INTEGER DEFAULT 1,
  valid_from TIMESTAMPTZ DEFAULT now(),
  valid_to TIMESTAMPTZ,
  active BOOLEAN DEFAULT true,
  categories TEXT[] DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(shop_id, code)
);

-- Coupon usage tracking
CREATE TABLE IF NOT EXISTS public.storefront_coupon_usage (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  coupon_id UUID NOT NULL REFERENCES public.storefront_coupons(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  order_id UUID,
  discount_amount NUMERIC NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- RLS
ALTER TABLE public.storefront_coupons ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.storefront_coupon_usage ENABLE ROW LEVEL SECURITY;

-- Shop owners can manage their coupons
CREATE POLICY "Shop owners manage coupons" ON public.storefront_coupons
  FOR ALL TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Anyone authenticated can read active coupons (for applying at checkout)
CREATE POLICY "Read active coupons" ON public.storefront_coupons
  FOR SELECT TO authenticated
  USING (active = true);

-- Users can see their own coupon usage
CREATE POLICY "Users see own usage" ON public.storefront_coupon_usage
  FOR SELECT TO authenticated
  USING (user_id = auth.uid());

-- System inserts usage (via owner context)
CREATE POLICY "Insert coupon usage" ON public.storefront_coupon_usage
  FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

-- Increment usage count trigger
CREATE OR REPLACE FUNCTION public.increment_coupon_usage()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  UPDATE public.storefront_coupons
  SET usage_count = usage_count + 1, updated_at = now()
  WHERE id = NEW.coupon_id;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_increment_coupon_usage
AFTER INSERT ON public.storefront_coupon_usage
FOR EACH ROW EXECUTE FUNCTION public.increment_coupon_usage();
