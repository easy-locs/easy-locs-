
-- 7. FIX: marketplace_reviews - create public view without reviewer_email
CREATE OR REPLACE VIEW public.marketplace_reviews_public
WITH (security_invoker = true) AS
  SELECT id, provider_id, service_id, booking_id, reviewer_name, reviewer_user_id,
         rating, comment, response, responded_at, verified, status, created_at, updated_at
  FROM public.marketplace_reviews
  WHERE status = 'published';

-- 8. FIX: audit_logs - remove overly permissive insert policy
DROP POLICY IF EXISTS "Users insert own audit logs" ON public.audit_logs;

-- 9. FIX: Security Definer View - marketplace_services_public
DROP VIEW IF EXISTS public.marketplace_services_public;
CREATE VIEW public.marketplace_services_public
WITH (security_invoker = true) AS
  SELECT id, title, description, category, city, country, price, currency,
         photo_urls, price_type, duration_minutes, booking_slug, active,
         org_id, provider_id, user_id, sort_order, max_capacity, time_slots,
         blocked_dates, location, badges, requires_id_document, listing_type,
         surface_sqm, rooms, bedrooms, bathrooms, deposit_amount, brand, model,
         condition, features, year_built, quantity, source_contact_phone,
         source_contact_email, contact_whatsapp, contact_email, status,
         listing_expires_at, created_at, updated_at
  FROM public.marketplace_services
  WHERE active = true AND status = 'published' AND (listing_expires_at IS NULL OR listing_expires_at > now());
