
-- ========================================
-- ORBIT V1: Multi-Vendor, Social Commerce, Advanced Checkout, AI Shopping
-- ========================================

-- 1. Multi-Vendor: vendor_commissions table
CREATE TABLE IF NOT EXISTS public.vendor_commissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id UUID NOT NULL,
  platform_rate NUMERIC NOT NULL DEFAULT 5,
  total_earned NUMERIC NOT NULL DEFAULT 0,
  total_paid NUMERIC NOT NULL DEFAULT 0,
  pending_payout NUMERIC NOT NULL DEFAULT 0,
  currency TEXT NOT NULL DEFAULT 'EUR',
  payout_method TEXT DEFAULT 'wallet',
  last_payout_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(shop_id)
);
ALTER TABLE public.vendor_commissions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Owner manages commissions" ON public.vendor_commissions FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.storefront_pages sp WHERE sp.id = shop_id AND sp.user_id = auth.uid()));

-- 2. Featured shops table
CREATE TABLE IF NOT EXISTS public.featured_shops (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id UUID NOT NULL,
  tier TEXT NOT NULL DEFAULT 'standard',
  featured_until TIMESTAMPTZ,
  reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(shop_id)
);
ALTER TABLE public.featured_shops ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can read featured" ON public.featured_shops FOR SELECT TO anon, authenticated USING (true);

-- 3. Social Commerce: product_shares
CREATE TABLE IF NOT EXISTS public.storefront_social_posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  shop_id UUID NOT NULL,
  item_id UUID,
  post_type TEXT NOT NULL DEFAULT 'share',
  caption TEXT,
  photo_url TEXT,
  likes_count INT NOT NULL DEFAULT 0,
  comments_count INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.storefront_social_posts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone reads social posts" ON public.storefront_social_posts FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Auth users create posts" ON public.storefront_social_posts FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Owner manages posts" ON public.storefront_social_posts FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Owner deletes posts" ON public.storefront_social_posts FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- Social likes
CREATE TABLE IF NOT EXISTS public.storefront_social_likes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id UUID NOT NULL REFERENCES public.storefront_social_posts(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(post_id, user_id)
);
ALTER TABLE public.storefront_social_likes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone reads likes" ON public.storefront_social_likes FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Auth likes" ON public.storefront_social_likes FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Auth unlikes" ON public.storefront_social_likes FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- Social comments
CREATE TABLE IF NOT EXISTS public.storefront_social_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id UUID NOT NULL REFERENCES public.storefront_social_posts(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  user_name TEXT,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.storefront_social_comments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone reads comments" ON public.storefront_social_comments FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Auth comments" ON public.storefront_social_comments FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Owner deletes comments" ON public.storefront_social_comments FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- 4. Advanced Checkout: saved addresses
CREATE TABLE IF NOT EXISTS public.storefront_addresses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  label TEXT NOT NULL DEFAULT 'Home',
  full_name TEXT,
  phone TEXT,
  address_line1 TEXT NOT NULL,
  address_line2 TEXT,
  city TEXT NOT NULL,
  postal_code TEXT,
  country TEXT NOT NULL DEFAULT 'FR',
  is_default BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.storefront_addresses ENABLE ROW LEVEL SECURITY;
CREATE POLICY "User manages own addresses" ON public.storefront_addresses FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- 5. AI Shopping: chat sessions
CREATE TABLE IF NOT EXISTS public.storefront_ai_chats (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id UUID NOT NULL,
  user_id UUID,
  session_id TEXT NOT NULL,
  messages JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.storefront_ai_chats ENABLE ROW LEVEL SECURITY;
CREATE POLICY "User reads own chats" ON public.storefront_ai_chats FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "User creates chats" ON public.storefront_ai_chats FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "User updates own chats" ON public.storefront_ai_chats FOR UPDATE TO authenticated USING (auth.uid() = user_id);

-- Add shipping_address_id to storefront_orders
ALTER TABLE public.storefront_orders ADD COLUMN IF NOT EXISTS shipping_address_id UUID;
ALTER TABLE public.storefront_orders ADD COLUMN IF NOT EXISTS shipping_name TEXT;
ALTER TABLE public.storefront_orders ADD COLUMN IF NOT EXISTS shipping_phone TEXT;
ALTER TABLE public.storefront_orders ADD COLUMN IF NOT EXISTS shipping_address TEXT;
ALTER TABLE public.storefront_orders ADD COLUMN IF NOT EXISTS shipping_city TEXT;
ALTER TABLE public.storefront_orders ADD COLUMN IF NOT EXISTS shipping_country TEXT;
ALTER TABLE public.storefront_orders ADD COLUMN IF NOT EXISTS payment_method TEXT DEFAULT 'locs';

-- Trigger: update likes_count on social posts
CREATE OR REPLACE FUNCTION public.update_social_likes_count()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.storefront_social_posts SET likes_count = likes_count + 1 WHERE id = NEW.post_id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.storefront_social_posts SET likes_count = GREATEST(0, likes_count - 1) WHERE id = OLD.post_id;
    RETURN OLD;
  END IF;
  RETURN NULL;
END;$$;

CREATE TRIGGER trg_social_likes_count
AFTER INSERT OR DELETE ON public.storefront_social_likes
FOR EACH ROW EXECUTE FUNCTION public.update_social_likes_count();

-- Trigger: update comments_count on social posts
CREATE OR REPLACE FUNCTION public.update_social_comments_count()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.storefront_social_posts SET comments_count = comments_count + 1 WHERE id = NEW.post_id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.storefront_social_posts SET comments_count = GREATEST(0, comments_count - 1) WHERE id = OLD.post_id;
    RETURN OLD;
  END IF;
  RETURN NULL;
END;$$;

CREATE TRIGGER trg_social_comments_count
AFTER INSERT OR DELETE ON public.storefront_social_comments
FOR EACH ROW EXECUTE FUNCTION public.update_social_comments_count();

-- Trigger: auto-calculate commission on order completion
CREATE OR REPLACE FUNCTION public.trg_vendor_commission_on_complete()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  _rate NUMERIC;
BEGIN
  IF NEW.status = 'completed' AND (OLD.status IS NULL OR OLD.status != 'completed') THEN
    SELECT COALESCE(platform_rate, 5) INTO _rate
    FROM public.vendor_commissions WHERE shop_id = NEW.shop_id;
    
    IF _rate IS NULL THEN _rate := 5; END IF;
    
    INSERT INTO public.vendor_commissions (shop_id, platform_rate, total_earned, pending_payout)
    VALUES (NEW.shop_id, 5, NEW.total * (1 - _rate/100), NEW.total * (1 - _rate/100))
    ON CONFLICT (shop_id) DO UPDATE SET
      total_earned = vendor_commissions.total_earned + NEW.total * (1 - EXCLUDED.platform_rate/100),
      pending_payout = vendor_commissions.pending_payout + NEW.total * (1 - EXCLUDED.platform_rate/100),
      updated_at = now();
  END IF;
  RETURN NEW;
END;$$;

CREATE TRIGGER trg_vendor_commission
AFTER UPDATE ON public.storefront_orders
FOR EACH ROW EXECUTE FUNCTION public.trg_vendor_commission_on_complete();
