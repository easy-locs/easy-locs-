-- FIX 1: Activities — drop broad public SELECT, create a safe public view
DROP POLICY IF EXISTS "Public can read active activities" ON public.activities;

CREATE OR REPLACE VIEW public.activities_public AS
SELECT
  id, title, description, category, city, country, price, currency,
  photo_url, provider_name, provider_type, duration_minutes,
  badges, sort_order, active, org_id, property_id, created_at, updated_at
  -- Excludes: commission_percent, user_id
FROM public.activities
WHERE active = true;

GRANT SELECT ON public.activities_public TO anon, authenticated;

-- FIX 2: Concierge services public view — remove sensitive columns
DROP VIEW IF EXISTS public.concierge_services_public;

CREATE VIEW public.concierge_services_public AS
SELECT
  id, title, description, category, city, country, price, currency,
  photo_url, photo_urls, booking_slug, duration_minutes, max_capacity,
  booking_type, location, conditions, time_slots, blocked_dates,
  requires_id_document, payment_methods, sort_order, org_id,
  active, provider_name, property_id, created_at, updated_at
  -- Excludes: commission_type, commission_amount, user_id
FROM public.concierge_services
WHERE active = true;

GRANT SELECT ON public.concierge_services_public TO anon, authenticated;