
-- 1. category_fulfillment_rules
CREATE TABLE IF NOT EXISTS public.category_fulfillment_rules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  vertical text NOT NULL,
  category text,
  subcategory text,
  is_deliverable boolean NOT NULL DEFAULT false,
  delivery_kind text CHECK (delivery_kind IN ('platform_delivery','merchant_delivery','pickup_only','mobility_driver','hybrid')),
  requires_merchant_acceptance boolean NOT NULL DEFAULT false,
  requires_preparation_time boolean NOT NULL DEFAULT false,
  allows_scheduled boolean NOT NULL DEFAULT true,
  allows_live_dispatch boolean NOT NULL DEFAULT true,
  default_vehicle_types text[] NOT NULL DEFAULT '{}',
  pricing_strategy text DEFAULT 'flat',
  supports_tracking boolean NOT NULL DEFAULT true,
  supports_orbit_chat boolean NOT NULL DEFAULT true,
  supports_orbit_call boolean NOT NULL DEFAULT false,
  supports_wallet_hold boolean NOT NULL DEFAULT true,
  supports_tip boolean NOT NULL DEFAULT true,
  supports_multi_stop boolean NOT NULL DEFAULT false,
  supports_return_flow boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_cfr_vertical_cat ON public.category_fulfillment_rules (vertical, COALESCE(category,''), COALESCE(subcategory,''));

ALTER TABLE public.category_fulfillment_rules ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can read fulfillment rules" ON public.category_fulfillment_rules FOR SELECT USING (true);

-- 2. delivery_vehicle_capabilities
CREATE TABLE IF NOT EXISTS public.delivery_vehicle_capabilities (
  vehicle_type text PRIMARY KEY,
  supports_food boolean NOT NULL DEFAULT false,
  supports_grocery boolean NOT NULL DEFAULT false,
  supports_parcel boolean NOT NULL DEFAULT false,
  supports_taxi boolean NOT NULL DEFAULT false,
  max_weight_kg numeric DEFAULT 20,
  max_volume_class text DEFAULT 'medium',
  max_passengers integer DEFAULT 0,
  temperature_control boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.delivery_vehicle_capabilities ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can read vehicle capabilities" ON public.delivery_vehicle_capabilities FOR SELECT USING (true);

-- 3. Add booking_mode + scheduled_for to mobility_jobs if missing
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='mobility_jobs' AND column_name='booking_mode') THEN
    ALTER TABLE public.mobility_jobs ADD COLUMN booking_mode text NOT NULL DEFAULT 'now' CHECK (booking_mode IN ('now','scheduled'));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='mobility_jobs' AND column_name='scheduled_for') THEN
    ALTER TABLE public.mobility_jobs ADD COLUMN scheduled_for timestamptz;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='mobility_jobs' AND column_name='dispatch_window_start') THEN
    ALTER TABLE public.mobility_jobs ADD COLUMN dispatch_window_start timestamptz;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='mobility_jobs' AND column_name='dispatch_window_end') THEN
    ALTER TABLE public.mobility_jobs ADD COLUMN dispatch_window_end timestamptz;
  END IF;
END $$;

-- 4. Seed default fulfillment rules
INSERT INTO public.category_fulfillment_rules (vertical, category, is_deliverable, delivery_kind, requires_merchant_acceptance, requires_preparation_time, allows_scheduled, allows_live_dispatch, default_vehicle_types, pricing_strategy, supports_orbit_call) VALUES
('mobility', 'taxi', false, 'mobility_driver', false, false, true, true, ARRAY['taxi_standard','taxi_xl','taxi_premium'], 'dynamic', true),
('food', 'restaurant', true, 'platform_delivery', true, true, true, true, ARRAY['bike_delivery','moto_delivery'], 'dynamic', false),
('grocery', 'store', true, 'platform_delivery', true, false, true, true, ARRAY['bike_delivery','car_delivery'], 'flat', false),
('parcel', 'courier', true, 'platform_delivery', false, false, true, true, ARRAY['bike_delivery','moto_delivery','car_delivery'], 'distance', false),
('services', 'professional', false, NULL, true, false, true, false, '{}', 'flat', true)
ON CONFLICT DO NOTHING;

-- 5. Seed vehicle capabilities
INSERT INTO public.delivery_vehicle_capabilities (vehicle_type, supports_food, supports_grocery, supports_parcel, supports_taxi, max_weight_kg, max_volume_class, max_passengers, temperature_control) VALUES
('bike_delivery', true, true, true, false, 10, 'small', 0, false),
('moto_delivery', true, true, true, false, 20, 'medium', 0, false),
('car_delivery', true, true, true, false, 50, 'large', 0, true),
('taxi_standard', false, false, false, true, 10, 'small', 4, false),
('taxi_xl', false, false, false, true, 15, 'medium', 6, false),
('taxi_premium', false, false, false, true, 10, 'small', 4, false),
('scooter', true, false, true, false, 8, 'small', 0, false)
ON CONFLICT DO NOTHING;
