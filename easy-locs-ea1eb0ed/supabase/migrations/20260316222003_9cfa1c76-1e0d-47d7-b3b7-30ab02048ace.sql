
-- Add buyer_id to existing shipments table
ALTER TABLE public.storefront_shipments ADD COLUMN IF NOT EXISTS buyer_id UUID;
ALTER TABLE public.storefront_shipments ADD COLUMN IF NOT EXISTS destination_country TEXT;
ALTER TABLE public.storefront_shipments ADD COLUMN IF NOT EXISTS events_json JSONB DEFAULT '[]';
ALTER TABLE public.storefront_shipments ADD COLUMN IF NOT EXISTS estimated_delivery TIMESTAMPTZ;

DO $$ BEGIN
  CREATE POLICY "Buyers view own shipments" ON public.storefront_shipments FOR SELECT TO authenticated USING (buyer_id = auth.uid());
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Analytics events
CREATE TABLE IF NOT EXISTS public.storefront_analytics_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id UUID NOT NULL,
  event_type TEXT NOT NULL,
  item_id UUID,
  user_id UUID,
  metadata_json JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE public.storefront_analytics_events ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  CREATE POLICY "Shop owners view analytics" ON public.storefront_analytics_events FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM public.storefront_pages sp WHERE sp.id = shop_id AND sp.user_id = auth.uid()));
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
DO $$ BEGIN
  CREATE POLICY "Anyone can insert events" ON public.storefront_analytics_events FOR INSERT TO anon, authenticated WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
