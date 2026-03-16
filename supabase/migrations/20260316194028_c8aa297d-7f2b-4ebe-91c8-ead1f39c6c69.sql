
-- Storefront Reviews table
CREATE TABLE IF NOT EXISTS public.storefront_reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id UUID NOT NULL REFERENCES public.storefront_pages(id) ON DELETE CASCADE,
  order_id UUID REFERENCES public.storefront_orders(id) ON DELETE SET NULL,
  reviewer_id UUID NOT NULL,
  reviewer_name TEXT DEFAULT '',
  rating NUMERIC NOT NULL CHECK (rating >= 1 AND rating <= 5),
  comment TEXT DEFAULT '',
  response TEXT,
  responded_at TIMESTAMPTZ,
  status TEXT DEFAULT 'published' CHECK (status IN ('published', 'hidden', 'flagged')),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(order_id, reviewer_id)
);

ALTER TABLE public.storefront_reviews ENABLE ROW LEVEL SECURITY;

-- Anyone can read published reviews
CREATE POLICY "Read published reviews" ON public.storefront_reviews
  FOR SELECT USING (status = 'published');

-- Authenticated users can create reviews
CREATE POLICY "Create own reviews" ON public.storefront_reviews
  FOR INSERT TO authenticated
  WITH CHECK (reviewer_id = auth.uid());

-- Shop owners can respond (update response field)
CREATE POLICY "Owner responds" ON public.storefront_reviews
  FOR UPDATE TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.storefront_pages WHERE id = shop_id AND user_id = auth.uid())
  );

-- Reviewers can update their own reviews
CREATE POLICY "Update own reviews" ON public.storefront_reviews
  FOR UPDATE TO authenticated
  USING (reviewer_id = auth.uid());

-- Add SEO fields to storefront_pages
ALTER TABLE public.storefront_pages
  ADD COLUMN IF NOT EXISTS seo_title TEXT,
  ADD COLUMN IF NOT EXISTS seo_description TEXT,
  ADD COLUMN IF NOT EXISTS og_image_url TEXT;
