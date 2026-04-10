
-- Add missing columns to storefront_reviews
ALTER TABLE public.storefront_reviews ADD COLUMN IF NOT EXISTS item_id UUID REFERENCES public.catalog_items(id) ON DELETE CASCADE;
ALTER TABLE public.storefront_reviews ADD COLUMN IF NOT EXISTS title TEXT;
ALTER TABLE public.storefront_reviews ADD COLUMN IF NOT EXISTS photo_urls JSONB DEFAULT '[]';
ALTER TABLE public.storefront_reviews ADD COLUMN IF NOT EXISTS video_url TEXT;
ALTER TABLE public.storefront_reviews ADD COLUMN IF NOT EXISTS verified_purchase BOOLEAN DEFAULT false;
ALTER TABLE public.storefront_reviews ADD COLUMN IF NOT EXISTS helpful_count INTEGER DEFAULT 0;
ALTER TABLE public.storefront_reviews ADD COLUMN IF NOT EXISTS seller_response TEXT;
ALTER TABLE public.storefront_reviews ADD COLUMN IF NOT EXISTS seller_responded_at TIMESTAMPTZ;

-- Review votes
CREATE TABLE IF NOT EXISTS public.storefront_review_votes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  review_id UUID NOT NULL REFERENCES public.storefront_reviews(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  helpful BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(review_id, user_id)
);
ALTER TABLE public.storefront_review_votes ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN CREATE POLICY "Users manage own votes" ON public.storefront_review_votes FOR ALL TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid()); EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Product Q&A
CREATE TABLE IF NOT EXISTS public.storefront_product_questions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id UUID NOT NULL REFERENCES public.storefront_pages(id) ON DELETE CASCADE,
  item_id UUID NOT NULL REFERENCES public.catalog_items(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  question TEXT NOT NULL,
  answer TEXT,
  answered_by UUID,
  answered_at TIMESTAMPTZ,
  status TEXT NOT NULL DEFAULT 'pending',
  helpful_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.storefront_product_questions ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN CREATE POLICY "Anyone view questions" ON public.storefront_product_questions FOR SELECT USING (status IN ('pending','answered')); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE POLICY "Users ask questions" ON public.storefront_product_questions FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid()); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE POLICY "Shop owners answer questions" ON public.storefront_product_questions FOR UPDATE TO authenticated USING (
  EXISTS (SELECT 1 FROM public.storefront_pages sp WHERE sp.id = shop_id AND sp.user_id = auth.uid())
); EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Flash Sales
CREATE TABLE IF NOT EXISTS public.storefront_flash_sales (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id UUID NOT NULL REFERENCES public.storefront_pages(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  item_id UUID REFERENCES public.catalog_items(id) ON DELETE SET NULL,
  sale_type TEXT NOT NULL DEFAULT 'flash',
  discount_percent INTEGER DEFAULT 0,
  discount_amount NUMERIC DEFAULT 0,
  sale_price NUMERIC,
  original_price NUMERIC,
  currency TEXT DEFAULT 'EUR',
  stock_limit INTEGER,
  sold_count INTEGER DEFAULT 0,
  starts_at TIMESTAMPTZ NOT NULL,
  ends_at TIMESTAMPTZ NOT NULL,
  status TEXT NOT NULL DEFAULT 'scheduled',
  notify_subscribers BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.storefront_flash_sales ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN CREATE POLICY "Anyone view active flash sales" ON public.storefront_flash_sales FOR SELECT USING (status IN ('scheduled','active')); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE POLICY "Shop owners manage flash sales" ON public.storefront_flash_sales FOR ALL TO authenticated USING (
  EXISTS (SELECT 1 FROM public.storefront_pages sp WHERE sp.id = shop_id AND sp.user_id = auth.uid())
) WITH CHECK (
  EXISTS (SELECT 1 FROM public.storefront_pages sp WHERE sp.id = shop_id AND sp.user_id = auth.uid())
); EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Deal subscribers
CREATE TABLE IF NOT EXISTS public.storefront_deal_subscribers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id UUID NOT NULL REFERENCES public.storefront_pages(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  email TEXT,
  notify_flash BOOLEAN DEFAULT true,
  notify_daily BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(shop_id, user_id)
);
ALTER TABLE public.storefront_deal_subscribers ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN CREATE POLICY "Users manage own deal subs" ON public.storefront_deal_subscribers FOR ALL TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid()); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
