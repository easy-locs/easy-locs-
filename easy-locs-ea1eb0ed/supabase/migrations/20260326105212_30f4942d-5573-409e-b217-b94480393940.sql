
-- Extend geo_live_zone_overlays with full station fields
ALTER TABLE public.geo_live_zone_overlays
  ADD COLUMN IF NOT EXISTS rider_supply_factor numeric DEFAULT 1,
  ADD COLUMN IF NOT EXISTS merchant_open_count integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS merchant_deliverable_count integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS avg_grocery_eta_minutes numeric,
  ADD COLUMN IF NOT EXISTS demand_multiplier numeric DEFAULT 1,
  ADD COLUMN IF NOT EXISTS surge_multiplier numeric DEFAULT 1;

-- ETA projection cache
CREATE TABLE IF NOT EXISTS public.eta_projection_cache (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  zone_key text NOT NULL,
  canonical_place_id uuid REFERENCES public.canonical_places(id) ON DELETE SET NULL,
  category text NOT NULL,
  eta_minutes numeric NOT NULL,
  traffic_factor numeric DEFAULT 1,
  weather_factor numeric DEFAULT 1,
  rider_supply_factor numeric DEFAULT 1,
  merchant_count integer DEFAULT 0,
  confidence numeric DEFAULT 0.7,
  computed_at timestamptz DEFAULT now(),
  expires_at timestamptz DEFAULT (now() + interval '5 minutes')
);

CREATE INDEX IF NOT EXISTS idx_eta_projection_zone_cat ON public.eta_projection_cache(zone_key, category);
CREATE INDEX IF NOT EXISTS idx_eta_projection_place ON public.eta_projection_cache(canonical_place_id);

-- Enable RLS
ALTER TABLE public.eta_projection_cache ENABLE ROW LEVEL SECURITY;

-- Public read for ETA projections (non-sensitive)
CREATE POLICY "Anyone can read eta projections" ON public.eta_projection_cache
  FOR SELECT TO anon, authenticated USING (true);
