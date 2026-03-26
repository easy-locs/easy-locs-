
-- Viewport bounds for canonical places (cities, districts, airports, landmarks)
CREATE TABLE IF NOT EXISTS public.canonical_place_viewports (
  canonical_place_id uuid PRIMARY KEY REFERENCES public.canonical_places(id) ON DELETE CASCADE,
  center_lat numeric NOT NULL,
  center_lng numeric NOT NULL,
  viewport_north numeric,
  viewport_south numeric,
  viewport_east numeric,
  viewport_west numeric,
  recommended_zoom numeric DEFAULT 14,
  polygon_geojson jsonb,
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE public.canonical_place_viewports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read viewports"
  ON public.canonical_place_viewports FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY "Authenticated users can insert viewports"
  ON public.canonical_place_viewports FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update viewports"
  ON public.canonical_place_viewports FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Live zone overlays for radar (traffic, weather, demand, ETA summaries)
CREATE TABLE IF NOT EXISTS public.geo_live_zone_overlays (
  zone_key text PRIMARY KEY,
  traffic_level text,
  traffic_speed_factor numeric DEFAULT 1,
  weather_type text,
  weather_intensity numeric DEFAULT 0,
  flood_risk_level text,
  demand_level numeric DEFAULT 0,
  rider_supply numeric DEFAULT 0,
  merchant_count integer DEFAULT 0,
  avg_food_eta_minutes numeric,
  avg_taxi_eta_minutes numeric,
  avg_parcel_eta_minutes numeric,
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE public.geo_live_zone_overlays ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read zone overlays"
  ON public.geo_live_zone_overlays FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY "Authenticated can upsert zone overlays"
  ON public.geo_live_zone_overlays FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated can update zone overlays"
  ON public.geo_live_zone_overlays FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Enable realtime for zone overlays
ALTER PUBLICATION supabase_realtime ADD TABLE public.geo_live_zone_overlays;
