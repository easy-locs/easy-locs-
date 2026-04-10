
-- PASS142: Ad impression/click/conversion tracking
CREATE TABLE public.ad_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type text NOT NULL DEFAULT 'impression', -- impression, click, conversion
  placement text NOT NULL DEFAULT 'feed', -- feed, banner, search, category
  target_type text NOT NULL DEFAULT 'listing', -- listing, shop, service
  target_id uuid NOT NULL,
  shop_id uuid REFERENCES public.storefront_pages(id) ON DELETE SET NULL,
  user_id uuid,
  session_id text,
  device_type text,
  referrer text,
  cost_locs numeric DEFAULT 0,
  metadata_json jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Index for fast aggregation
CREATE INDEX idx_ad_events_target ON public.ad_events(target_id, event_type, created_at DESC);
CREATE INDEX idx_ad_events_shop ON public.ad_events(shop_id, event_type, created_at DESC);

-- RLS: public insert (anonymous tracking), read only for owners
ALTER TABLE public.ad_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can insert ad events"
  ON public.ad_events FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

CREATE POLICY "Shop owners can read their ad events"
  ON public.ad_events FOR SELECT
  TO authenticated
  USING (
    shop_id IN (
      SELECT id FROM public.storefront_pages WHERE user_id = auth.uid()
    )
  );

-- PASS141: Boost purchases table (LOCS deductions for sponsored placement)
CREATE TABLE public.boost_purchases (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  target_type text NOT NULL DEFAULT 'listing', -- listing, shop, service
  target_id uuid NOT NULL,
  shop_id uuid REFERENCES public.storefront_pages(id) ON DELETE SET NULL,
  tier text NOT NULL DEFAULT 'basic', -- basic, premium, featured
  locs_spent numeric NOT NULL DEFAULT 0,
  starts_at timestamptz NOT NULL DEFAULT now(),
  ends_at timestamptz NOT NULL,
  impressions_budget int,
  impressions_used int DEFAULT 0,
  clicks int DEFAULT 0,
  conversions int DEFAULT 0,
  status text NOT NULL DEFAULT 'active', -- active, paused, exhausted, expired
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_boost_active ON public.boost_purchases(target_id, status, ends_at);

ALTER TABLE public.boost_purchases ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own boosts"
  ON public.boost_purchases FOR ALL
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());
