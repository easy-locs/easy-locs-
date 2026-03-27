-- ═══ HOTEL SCHEMA ENHANCEMENT — Canonical columns ═══

-- Extend hotels table with full canonical fields
ALTER TABLE public.hotels
  ADD COLUMN IF NOT EXISTS slug text,
  ADD COLUMN IF NOT EXISTS hotel_type text DEFAULT 'hotel',
  ADD COLUMN IF NOT EXISTS area text,
  ADD COLUMN IF NOT EXISTS phone text,
  ADD COLUMN IF NOT EXISTS email text,
  ADD COLUMN IF NOT EXISTS logo_image text,
  ADD COLUMN IF NOT EXISTS content_status text DEFAULT 'raw',
  ADD COLUMN IF NOT EXISTS publish_gate_status text DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS blocking_reason text,
  ADD COLUMN IF NOT EXISTS gate_failures jsonb DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS pipeline_stage text DEFAULT 'intake',
  ADD COLUMN IF NOT EXISTS pipeline_last_run_at timestamptz,
  ADD COLUMN IF NOT EXISTS source_last_scraped_at timestamptz,
  ADD COLUMN IF NOT EXISTS source_url text,
  ADD COLUMN IF NOT EXISTS visibility_decision_reason text;

-- Extend hotel_rooms with canonical fields
ALTER TABLE public.hotel_rooms
  ADD COLUMN IF NOT EXISTS source_room_id text,
  ADD COLUMN IF NOT EXISTS normalized_room_name text,
  ADD COLUMN IF NOT EXISTS adults integer DEFAULT 2,
  ADD COLUMN IF NOT EXISTS children integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS room_size_sqm numeric(6,1),
  ADD COLUMN IF NOT EXISTS smoking_allowed boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS active boolean DEFAULT true;

-- Extend hotel_rate_plans with canonical fields
ALTER TABLE public.hotel_rate_plans
  ADD COLUMN IF NOT EXISTS hotel_id uuid REFERENCES public.hotels(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS source_rate_id text,
  ADD COLUMN IF NOT EXISTS normalized_plan_name text,
  ADD COLUMN IF NOT EXISTS cancellation_type text DEFAULT 'free_cancellation',
  ADD COLUMN IF NOT EXISTS pay_later boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS pay_now boolean DEFAULT true,
  ADD COLUMN IF NOT EXISTS includes_breakfast boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS includes_taxes boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS currency text DEFAULT 'AED',
  ADD COLUMN IF NOT EXISTS active boolean DEFAULT true;

-- Extend hotel_availability with canonical fields
ALTER TABLE public.hotel_availability
  ADD COLUMN IF NOT EXISTS hotel_id uuid REFERENCES public.hotels(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS rate_plan_id uuid REFERENCES public.hotel_rate_plans(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS available_units integer DEFAULT 1,
  ADD COLUMN IF NOT EXISTS base_price numeric(10,2),
  ADD COLUMN IF NOT EXISTS final_price numeric(10,2),
  ADD COLUMN IF NOT EXISTS taxes_amount numeric(10,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS fees_amount numeric(10,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS closed_to_arrival boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS closed_to_departure boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS restriction_notes text,
  ADD COLUMN IF NOT EXISTS source_last_seen_at timestamptz;

-- Additional indexes
CREATE INDEX IF NOT EXISTS idx_hotels_slug ON public.hotels(slug);
CREATE INDEX IF NOT EXISTS idx_hotels_hotel_type ON public.hotels(hotel_type);
CREATE INDEX IF NOT EXISTS idx_hotels_source_type ON public.hotels(source_type);
CREATE INDEX IF NOT EXISTS idx_hotels_pipeline_stage ON public.hotels(pipeline_stage);
CREATE INDEX IF NOT EXISTS idx_hotels_publish_gate ON public.hotels(publish_gate_status);
CREATE INDEX IF NOT EXISTS idx_hotel_availability_hotel ON public.hotel_availability(hotel_id);
CREATE INDEX IF NOT EXISTS idx_hotel_rate_plans_hotel ON public.hotel_rate_plans(hotel_id);

-- Analytics views
CREATE OR REPLACE VIEW public.vw_hotel_quality AS
SELECT
  h.id, h.name, h.city, h.stars, h.rating, h.overall_quality_score,
  h.visibility_mode, h.publish_gate_status, h.blocking_reason,
  h.pipeline_stage, h.source_type,
  (SELECT count(*) FROM public.hotel_rooms r WHERE r.hotel_id = h.id) as room_count,
  (SELECT count(*) FROM public.hotel_rate_plans rp WHERE rp.hotel_id = h.id) as rate_plan_count,
  (SELECT count(*) FROM public.hotel_availability a WHERE a.hotel_id = h.id AND a.available = true) as avail_days,
  h.cover_image IS NOT NULL as has_cover,
  h.lat IS NOT NULL AND h.lng IS NOT NULL as has_geo
FROM public.hotels h;

CREATE OR REPLACE VIEW public.vw_hotel_gate_failures AS
SELECT
  h.id, h.name, h.visibility_mode, h.publish_gate_status,
  h.blocking_reason, h.gate_failures, h.overall_quality_score
FROM public.hotels h
WHERE h.publish_gate_status = 'blocked' OR h.visibility_mode = 'hidden';

CREATE OR REPLACE VIEW public.vw_hotel_calendar_coverage AS
SELECT
  r.hotel_id,
  h.name as hotel_name,
  r.id as room_id,
  r.name as room_name,
  count(a.id) as total_days,
  count(a.id) FILTER (WHERE a.available = true) as available_days,
  min(a.price) as min_price,
  max(a.price) as max_price,
  avg(a.price)::numeric(10,2) as avg_price
FROM public.hotel_rooms r
LEFT JOIN public.hotel_availability a ON a.room_id = r.id
LEFT JOIN public.hotels h ON h.id = r.hotel_id
GROUP BY r.hotel_id, h.name, r.id, r.name;