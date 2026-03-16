
-- Add missing columns to storefront_returns
ALTER TABLE public.storefront_returns ADD COLUMN IF NOT EXISTS description TEXT;
ALTER TABLE public.storefront_returns ADD COLUMN IF NOT EXISTS refund_type TEXT DEFAULT 'full';
ALTER TABLE public.storefront_returns ADD COLUMN IF NOT EXISTS rma_code TEXT UNIQUE;
ALTER TABLE public.storefront_returns ADD COLUMN IF NOT EXISTS item_ids JSONB DEFAULT '[]';
ALTER TABLE public.storefront_returns ADD COLUMN IF NOT EXISTS photo_urls JSONB DEFAULT '[]';
ALTER TABLE public.storefront_returns ADD COLUMN IF NOT EXISTS tracking_number TEXT;
ALTER TABLE public.storefront_returns ADD COLUMN IF NOT EXISTS approved_at TIMESTAMPTZ;
ALTER TABLE public.storefront_returns ADD COLUMN IF NOT EXISTS shipped_at TIMESTAMPTZ;
ALTER TABLE public.storefront_returns ADD COLUMN IF NOT EXISTS received_at TIMESTAMPTZ;
ALTER TABLE public.storefront_returns ADD COLUMN IF NOT EXISTS refunded_at TIMESTAMPTZ;
ALTER TABLE public.storefront_returns ADD COLUMN IF NOT EXISTS admin_notes TEXT;
ALTER TABLE public.storefront_returns ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT now();

-- Generate RMA code trigger
CREATE OR REPLACE FUNCTION public.generate_rma_code()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
BEGIN
  IF NEW.rma_code IS NULL THEN
    NEW.rma_code := 'RMA-' || UPPER(SUBSTR(NEW.id::text, 1, 8));
  END IF;
  RETURN NEW;
END;$$;
DROP TRIGGER IF EXISTS trg_generate_rma_code ON public.storefront_returns;
CREATE TRIGGER trg_generate_rma_code BEFORE INSERT ON public.storefront_returns FOR EACH ROW EXECUTE FUNCTION public.generate_rma_code();

-- LOYALTY PROGRAM tables
CREATE TABLE IF NOT EXISTS public.storefront_loyalty_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id UUID NOT NULL REFERENCES public.storefront_pages(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  points INTEGER NOT NULL DEFAULT 0,
  lifetime_points INTEGER NOT NULL DEFAULT 0,
  tier TEXT NOT NULL DEFAULT 'bronze',
  birthday DATE,
  birthday_bonus_claimed_at TIMESTAMPTZ,
  joined_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(shop_id, user_id)
);
ALTER TABLE public.storefront_loyalty_members ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  CREATE POLICY "Users manage own loyalty" ON public.storefront_loyalty_members FOR ALL TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
DO $$ BEGIN
  CREATE POLICY "Shop owners view loyalty" ON public.storefront_loyalty_members FOR SELECT TO authenticated USING (
    EXISTS (SELECT 1 FROM public.storefront_pages sp WHERE sp.id = shop_id AND sp.user_id = auth.uid())
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS public.storefront_loyalty_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  member_id UUID NOT NULL REFERENCES public.storefront_loyalty_members(id) ON DELETE CASCADE,
  shop_id UUID NOT NULL REFERENCES public.storefront_pages(id) ON DELETE CASCADE,
  points INTEGER NOT NULL,
  type TEXT NOT NULL,
  description TEXT,
  order_id UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.storefront_loyalty_transactions ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  CREATE POLICY "Users view own loyalty txns" ON public.storefront_loyalty_transactions FOR SELECT TO authenticated USING (
    EXISTS (SELECT 1 FROM public.storefront_loyalty_members m WHERE m.id = member_id AND m.user_id = auth.uid())
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
DO $$ BEGIN
  CREATE POLICY "Shop owners manage loyalty txns" ON public.storefront_loyalty_transactions FOR ALL TO authenticated USING (
    EXISTS (SELECT 1 FROM public.storefront_pages sp WHERE sp.id = shop_id AND sp.user_id = auth.uid())
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS public.storefront_loyalty_rewards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id UUID NOT NULL REFERENCES public.storefront_pages(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  points_required INTEGER NOT NULL DEFAULT 100,
  reward_type TEXT NOT NULL DEFAULT 'discount',
  reward_value NUMERIC DEFAULT 0,
  currency TEXT DEFAULT 'EUR',
  min_tier TEXT DEFAULT 'bronze',
  active BOOLEAN NOT NULL DEFAULT true,
  max_redemptions INTEGER,
  current_redemptions INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.storefront_loyalty_rewards ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  CREATE POLICY "Anyone view active rewards" ON public.storefront_loyalty_rewards FOR SELECT TO authenticated USING (active = true);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
DO $$ BEGIN
  CREATE POLICY "Shop owners manage rewards" ON public.storefront_loyalty_rewards FOR ALL TO authenticated USING (
    EXISTS (SELECT 1 FROM public.storefront_pages sp WHERE sp.id = shop_id AND sp.user_id = auth.uid())
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Auto-update loyalty tier
CREATE OR REPLACE FUNCTION public.update_loyalty_tier()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
BEGIN
  NEW.tier := CASE
    WHEN NEW.lifetime_points >= 10000 THEN 'platinum'
    WHEN NEW.lifetime_points >= 5000 THEN 'gold'
    WHEN NEW.lifetime_points >= 1000 THEN 'silver'
    ELSE 'bronze'
  END;
  NEW.updated_at := now();
  RETURN NEW;
END;$$;
DROP TRIGGER IF EXISTS trg_update_loyalty_tier ON public.storefront_loyalty_members;
CREATE TRIGGER trg_update_loyalty_tier BEFORE UPDATE ON public.storefront_loyalty_members FOR EACH ROW EXECUTE FUNCTION public.update_loyalty_tier();

-- Add subscription columns if missing
ALTER TABLE public.storefront_subscriptions ADD COLUMN IF NOT EXISTS paused_at TIMESTAMPTZ;
ALTER TABLE public.storefront_subscriptions ADD COLUMN IF NOT EXISTS cancelled_at TIMESTAMPTZ;
ALTER TABLE public.storefront_subscriptions ADD COLUMN IF NOT EXISTS total_cycles INTEGER DEFAULT 0;
ALTER TABLE public.storefront_subscriptions ADD COLUMN IF NOT EXISTS max_cycles INTEGER;
ALTER TABLE public.storefront_subscriptions ADD COLUMN IF NOT EXISTS metadata_json JSONB DEFAULT '{}';
