
-- ═══════════════════════════════════════════════════
-- Ultra Radar Phase 1 Hardening Migration
-- ═══════════════════════════════════════════════════

-- 1. Harden radar_signals: add expires_at, processed_at, dedupe_key, org_id, target_scope
ALTER TABLE public.radar_signals
  ADD COLUMN IF NOT EXISTS expires_at timestamptz DEFAULT (now() + interval '24 hours'),
  ADD COLUMN IF NOT EXISTS processed_at timestamptz,
  ADD COLUMN IF NOT EXISTS dedupe_key text,
  ADD COLUMN IF NOT EXISTS org_id uuid,
  ADD COLUMN IF NOT EXISTS target_scope text DEFAULT 'platform';

CREATE INDEX IF NOT EXISTS idx_radar_signals_dedupe ON public.radar_signals (dedupe_key) WHERE dedupe_key IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_radar_signals_expires ON public.radar_signals (expires_at);

-- 2. Harden radar_opportunities: add dedupe, lifecycle, routing, counters
ALTER TABLE public.radar_opportunities
  ADD COLUMN IF NOT EXISTS dedupe_key text,
  ADD COLUMN IF NOT EXISTS target_audience text DEFAULT 'user',
  ADD COLUMN IF NOT EXISTS target_action text,
  ADD COLUMN IF NOT EXISTS target_payload_json jsonb DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS dismissed_at timestamptz,
  ADD COLUMN IF NOT EXISTS converted_at timestamptz,
  ADD COLUMN IF NOT EXISTS expired_at timestamptz,
  ADD COLUMN IF NOT EXISTS surfaced_count integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS clicked_count integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS conversion_count integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS source_signal_count integer DEFAULT 0;

CREATE UNIQUE INDEX IF NOT EXISTS idx_radar_opps_dedupe ON public.radar_opportunities (dedupe_key) WHERE status = 'active' AND dedupe_key IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_radar_opps_audience ON public.radar_opportunities (target_audience, status);

-- 3. Create radar_rules table
CREATE TABLE IF NOT EXISTS public.radar_rules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  signal_type text NOT NULL,
  opportunity_type text NOT NULL,
  enabled boolean DEFAULT true,
  threshold_json jsonb DEFAULT '{}'::jsonb,
  weights_json jsonb DEFAULT '{"demand":0.35,"proximity":0.25,"timing":0.20,"urgency":0.20}'::jsonb,
  route_module text NOT NULL DEFAULT 'marketplace',
  target_action text,
  target_payload_template_json jsonb DEFAULT '{}'::jsonb,
  audience_json jsonb DEFAULT '["user"]'::jsonb,
  city_filter text,
  zone_filter text,
  icon_key text DEFAULT 'zap',
  title_template text,
  description_template text,
  ttl_minutes integer DEFAULT 30,
  max_active integer DEFAULT 3,
  priority integer DEFAULT 0
);

ALTER TABLE public.radar_rules ENABLE ROW LEVEL SECURITY;
CREATE POLICY "radar_rules_read" ON public.radar_rules FOR SELECT TO authenticated USING (true);

-- 4. Seed default radar rules
INSERT INTO public.radar_rules (signal_type, opportunity_type, route_module, target_action, icon_key, title_template, description_template, ttl_minutes, weights_json, threshold_json) VALUES
  ('zone_pressure', 'hot_demand_zone', 'marketplace', 'open_zone', 'flame', 'High demand in {city}', 'Demand level {demand_level}% — {riders} riders available', 30, '{"demand":0.35,"proximity":0.25,"timing":0.20,"urgency":0.20}', '{"min_demand_level":50}'),
  ('entity_view', 'merchant_nearby', 'marketplace', 'open_listing', 'store', 'Trending merchant', '{views} views, {orders} orders recently', 15, '{"demand":0.30,"proximity":0.30,"timing":0.20,"urgency":0.20}', '{"min_views":3}'),
  ('message_sent', 'communication_ready', 'orbit', 'open_thread', 'message-circle', 'Active conversations', '{count} messages exchanged recently', 10, '{"demand":0.10,"proximity":0.00,"timing":0.30,"urgency":0.60}', '{"min_messages":3}'),
  ('payment_activity', 'payment_ready', 'wallet', 'open_payment', 'wallet', 'Payment activity detected', '{count} payment events — check your wallet', 15, '{"demand":0.10,"proximity":0.00,"timing":0.20,"urgency":0.70}', '{"min_payments":1}'),
  ('listing_published', 'new_listing', 'marketplace', 'open_listing', 'trending-up', 'New listing published', 'A new listing is available nearby', 20, '{"demand":0.20,"proximity":0.30,"timing":0.25,"urgency":0.25}', '{"min_listings":1}'),
  ('order_created', 'urgent_service', 'marketplace', 'open_listing', 'zap', 'Surge in orders', '{orders} orders in your area', 15, '{"demand":0.40,"proximity":0.25,"timing":0.15,"urgency":0.20}', '{"min_orders":2}')
ON CONFLICT DO NOTHING;
