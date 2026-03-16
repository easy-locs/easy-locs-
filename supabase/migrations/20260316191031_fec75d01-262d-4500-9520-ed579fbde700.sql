
-- ═══════ ORBIT V1 Phase 2-5 Schema ═══════

-- Module 10: Storefront Deal Rooms (extends existing deal_rooms for storefront context)
-- Add storefront-specific columns to deal_rooms
ALTER TABLE public.deal_rooms 
  ADD COLUMN IF NOT EXISTS converted_order_id uuid,
  ADD COLUMN IF NOT EXISTS converted_invoice_id uuid,
  ADD COLUMN IF NOT EXISTS converted_payment_id uuid,
  ADD COLUMN IF NOT EXISTS converted_delivery_job_id uuid,
  ADD COLUMN IF NOT EXISTS shop_id uuid REFERENCES public.storefront_pages(id) ON DELETE SET NULL;

-- Module 12: Geo scope fields already on storefront_pages (geo_scope, lat, lng, radius_km)
-- Add missing geo columns if needed
ALTER TABLE public.storefront_pages
  ADD COLUMN IF NOT EXISTS latitude double precision,
  ADD COLUMN IF NOT EXISTS longitude double precision,
  ADD COLUMN IF NOT EXISTS radius_km double precision DEFAULT 25,
  ADD COLUMN IF NOT EXISTS region text,
  ADD COLUMN IF NOT EXISTS vertical text DEFAULT 'shops',
  ADD COLUMN IF NOT EXISTS subcategory text,
  ADD COLUMN IF NOT EXISTS tags text[] DEFAULT '{}';

-- Module 6: AI Category Suggestions
CREATE TABLE IF NOT EXISTS public.ai_category_suggestions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id uuid REFERENCES public.storefront_pages(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  input_text text NOT NULL,
  suggested_vertical text,
  suggested_category text,
  suggested_subcategory text,
  suggested_tags text[],
  accepted boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE public.ai_category_suggestions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own suggestions" ON public.ai_category_suggestions FOR ALL TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

-- Module 15: Storefront Translations
CREATE TABLE IF NOT EXISTS public.storefront_translations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id uuid REFERENCES public.storefront_pages(id) ON DELETE CASCADE NOT NULL,
  locale text NOT NULL DEFAULT 'en',
  field_name text NOT NULL,
  field_value text NOT NULL,
  created_at timestamptz DEFAULT now(),
  UNIQUE(shop_id, locale, field_name)
);
ALTER TABLE public.storefront_translations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read translations" ON public.storefront_translations FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Owner manage translations" ON public.storefront_translations FOR ALL TO authenticated 
  USING (EXISTS (SELECT 1 FROM public.storefront_pages sp WHERE sp.id = shop_id AND sp.user_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.storefront_pages sp WHERE sp.id = shop_id AND sp.user_id = auth.uid()));

-- Module 19: Launch Readiness Audits
CREATE TABLE IF NOT EXISTS public.orbit_launch_audits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id uuid REFERENCES public.storefront_pages(id) ON DELETE CASCADE NOT NULL,
  user_id uuid NOT NULL,
  catalog_ready boolean DEFAULT false,
  checkout_ready boolean DEFAULT false,
  geo_configured boolean DEFAULT false,
  translation_ready boolean DEFAULT false,
  share_ready boolean DEFAULT false,
  analytics_ready boolean DEFAULT false,
  overall_score integer DEFAULT 0,
  checked_at timestamptz DEFAULT now()
);
ALTER TABLE public.orbit_launch_audits ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Owner manage audits" ON public.orbit_launch_audits FOR ALL TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

-- Enable realtime on analytics
ALTER PUBLICATION supabase_realtime ADD TABLE public.storefront_analytics_daily;
