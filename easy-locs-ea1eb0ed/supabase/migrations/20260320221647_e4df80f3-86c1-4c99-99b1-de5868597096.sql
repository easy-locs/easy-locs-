
-- ══════ ZONES TABLE ══════
CREATE TABLE IF NOT EXISTS public.zones (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  city TEXT NOT NULL DEFAULT 'Dubai',
  country TEXT NOT NULL DEFAULT 'AE',
  center_lat DOUBLE PRECISION NOT NULL,
  center_lng DOUBLE PRECISION NOT NULL,
  radius_m INTEGER NOT NULL DEFAULT 3000,
  is_active BOOLEAN NOT NULL DEFAULT true,
  is_launched BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.zones ENABLE ROW LEVEL SECURITY;
CREATE POLICY "zones_public_read" ON public.zones FOR SELECT TO anon, authenticated USING (true);

-- ══════ PLATFORM SETTINGS TABLE ══════
CREATE TABLE IF NOT EXISTS public.platform_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key TEXT NOT NULL UNIQUE,
  value JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.platform_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "platform_settings_public_read" ON public.platform_settings FOR SELECT TO anon, authenticated USING (true);

-- Insert default launch control
INSERT INTO public.platform_settings (key, value) VALUES
  ('global_launch', '{"enabled": false, "mode": "prelaunch", "city": "Dubai"}'::jsonb)
ON CONFLICT (key) DO NOTHING;

-- ══════ SEED DUBAI ZONES ══════
INSERT INTO public.zones (name, city, center_lat, center_lng, radius_m) VALUES
  ('Dubai Marina', 'Dubai', 25.0805, 55.1403, 2500),
  ('JLT', 'Dubai', 25.0762, 55.1378, 2000),
  ('Business Bay', 'Dubai', 25.1867, 55.2719, 2500),
  ('Downtown Dubai', 'Dubai', 25.1972, 55.2744, 2000),
  ('Deira', 'Dubai', 25.2697, 55.3095, 3000),
  ('Al Barsha', 'Dubai', 25.1134, 55.2006, 2500),
  ('Jumeirah', 'Dubai', 25.2100, 55.2530, 3000),
  ('Silicon Oasis', 'Dubai', 25.1203, 55.3781, 3000),
  ('International City', 'Dubai', 25.1587, 55.4025, 3000),
  ('JVC', 'Dubai', 25.0579, 55.2060, 2500)
ON CONFLICT DO NOTHING;

-- ══════ ADD zone_id + activation flags to storefront_pages ══════
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'storefront_pages' AND column_name = 'zone_id') THEN
    ALTER TABLE public.storefront_pages ADD COLUMN zone_id UUID REFERENCES public.zones(id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'storefront_pages' AND column_name = 'is_claimed') THEN
    ALTER TABLE public.storefront_pages ADD COLUMN is_claimed BOOLEAN NOT NULL DEFAULT false;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'storefront_pages' AND column_name = 'is_order_enabled') THEN
    ALTER TABLE public.storefront_pages ADD COLUMN is_order_enabled BOOLEAN NOT NULL DEFAULT false;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'storefront_pages' AND column_name = 'is_payment_enabled') THEN
    ALTER TABLE public.storefront_pages ADD COLUMN is_payment_enabled BOOLEAN NOT NULL DEFAULT false;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'storefront_pages' AND column_name = 'is_qr_enabled') THEN
    ALTER TABLE public.storefront_pages ADD COLUMN is_qr_enabled BOOLEAN NOT NULL DEFAULT false;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'storefront_pages' AND column_name = 'ranking_score') THEN
    ALTER TABLE public.storefront_pages ADD COLUMN ranking_score DOUBLE PRECISION NOT NULL DEFAULT 0;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'storefront_pages' AND column_name = 'boost_multiplier') THEN
    ALTER TABLE public.storefront_pages ADD COLUMN boost_multiplier DOUBLE PRECISION NOT NULL DEFAULT 1.0;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'storefront_pages' AND column_name = 'boost_expiry') THEN
    ALTER TABLE public.storefront_pages ADD COLUMN boost_expiry TIMESTAMPTZ;
  END IF;
END $$;
