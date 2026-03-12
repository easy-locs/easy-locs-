
-- Saved/favorite listings
CREATE TABLE public.saved_listings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  listing_type TEXT NOT NULL DEFAULT 'service',
  listing_id UUID NOT NULL,
  listing_title TEXT,
  listing_image TEXT,
  listing_city TEXT,
  listing_country TEXT,
  listing_price NUMERIC,
  listing_currency TEXT DEFAULT 'EUR',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, listing_type, listing_id)
);

ALTER TABLE public.saved_listings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own saved listings"
  ON public.saved_listings FOR ALL TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Category subscriptions for notifications
CREATE TABLE public.category_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  category TEXT NOT NULL,
  notify_email BOOLEAN DEFAULT false,
  notify_push BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, category)
);

ALTER TABLE public.category_subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own category subscriptions"
  ON public.category_subscriptions FOR ALL TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
