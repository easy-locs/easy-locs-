
-- ═══ RADAR SIGNALS — normalized raw signals from internal modules ═══
CREATE TABLE public.radar_signals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  signal_type text NOT NULL,
  source_module text NOT NULL,
  entity_id text,
  entity_type text,
  zone_key text,
  city text,
  country text,
  user_id uuid,
  lat double precision,
  lng double precision,
  intensity double precision DEFAULT 1,
  metadata_json jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_radar_signals_type ON public.radar_signals (signal_type);
CREATE INDEX idx_radar_signals_zone ON public.radar_signals (zone_key);
CREATE INDEX idx_radar_signals_created ON public.radar_signals (created_at DESC);
CREATE INDEX idx_radar_signals_source ON public.radar_signals (source_module);

ALTER TABLE public.radar_signals ENABLE ROW LEVEL SECURITY;

-- Public insert for client-side ingestion (authenticated users)
CREATE POLICY "Authenticated users can insert signals"
  ON public.radar_signals FOR INSERT TO authenticated
  WITH CHECK (true);

-- Users can read their own signals
CREATE POLICY "Users can read own signals"
  ON public.radar_signals FOR SELECT TO authenticated
  USING (user_id = auth.uid());

-- Anon can read aggregated (no user_id filter needed for zone-level reads)
CREATE POLICY "Anon can read zone signals"
  ON public.radar_signals FOR SELECT TO anon
  USING (user_id IS NULL);

-- ═══ RADAR OPPORTUNITIES — scored, actionable outputs ═══
CREATE TABLE public.radar_opportunities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  opportunity_type text NOT NULL,
  title text NOT NULL,
  description text,
  score double precision NOT NULL DEFAULT 0,
  proximity_score double precision DEFAULT 0,
  demand_score double precision DEFAULT 0,
  urgency_score double precision DEFAULT 0,
  timing_score double precision DEFAULT 0,
  route_module text NOT NULL,
  route_path text NOT NULL,
  zone_key text,
  city text,
  country text,
  lat double precision,
  lng double precision,
  entity_id text,
  entity_type text,
  icon_key text DEFAULT 'zap',
  metadata_json jsonb DEFAULT '{}'::jsonb,
  status text NOT NULL DEFAULT 'active',
  expires_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_radar_opps_status ON public.radar_opportunities (status);
CREATE INDEX idx_radar_opps_zone ON public.radar_opportunities (zone_key);
CREATE INDEX idx_radar_opps_score ON public.radar_opportunities (score DESC);
CREATE INDEX idx_radar_opps_type ON public.radar_opportunities (opportunity_type);

ALTER TABLE public.radar_opportunities ENABLE ROW LEVEL SECURITY;

-- Everyone can read active opportunities (public discovery)
CREATE POLICY "Anyone can read active opportunities"
  ON public.radar_opportunities FOR SELECT TO anon, authenticated
  USING (status = 'active');

-- Only system (service_role) inserts/updates via edge functions
-- For Phase 1 MVP, allow authenticated insert too
CREATE POLICY "Authenticated can insert opportunities"
  ON public.radar_opportunities FOR INSERT TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated can update opportunities"
  ON public.radar_opportunities FOR UPDATE TO authenticated
  USING (true) WITH CHECK (true);
