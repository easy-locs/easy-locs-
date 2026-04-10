
-- Fix security definer views by DROP + recreate with security_invoker
DROP VIEW IF EXISTS public.vw_food_deliveroo_dubai_quality;
DROP VIEW IF EXISTS public.vw_food_deliveroo_dubai_visibility;
DROP VIEW IF EXISTS public.vw_food_gate_failures;
DROP VIEW IF EXISTS public.vw_hotel_gate_failures;
DROP VIEW IF EXISTS public.vw_hotel_quality;

CREATE VIEW public.vw_food_deliveroo_dubai_quality WITH (security_invoker = true) AS
  SELECT id AS merchant_id, name, overall_quality_score, visibility_score,
    menu_quality_score AS menu_score, data_completeness_score AS location_score,
    integrity_score AS identity_score, content_status, pipeline_stage
  FROM seed_merchants WHERE source_type = 'deliveroo' AND city = 'dubai' AND (vertical = 'food' OR is_food = true);

CREATE VIEW public.vw_food_deliveroo_dubai_visibility WITH (security_invoker = true) AS
  SELECT id AS merchant_id, name, visibility_mode, publish_gate_status,
    is_published, is_coming_soon, published_at, blocking_reason, visibility_decision_reason
  FROM seed_merchants WHERE source_type = 'deliveroo' AND city = 'dubai' AND (vertical = 'food' OR is_food = true);

CREATE VIEW public.vw_food_gate_failures WITH (security_invoker = true) AS
  SELECT id AS merchant_id, name, gate_failures, publish_gate_status, pipeline_stage
  FROM seed_merchants WHERE gate_failures IS NOT NULL AND gate_failures != '[]'::jsonb;

CREATE VIEW public.vw_hotel_gate_failures WITH (security_invoker = true) AS
  SELECT id AS merchant_id, name, gate_failures, publish_gate_status, pipeline_stage
  FROM seed_merchants WHERE vertical = 'hotel' AND gate_failures IS NOT NULL AND gate_failures != '[]'::jsonb;

CREATE VIEW public.vw_hotel_quality WITH (security_invoker = true) AS
  SELECT id AS merchant_id, name, overall_quality_score, visibility_score,
    menu_quality_score, data_completeness_score, integrity_score, content_status, pipeline_stage
  FROM seed_merchants WHERE vertical = 'hotel';
