-- Re-add public SELECT policies but using restricted column views

-- 1. Create a safe view for concierge_services (excludes bank_details, paypal_email, provider_phone)
CREATE OR REPLACE VIEW public.concierge_services_public AS
SELECT id, title, description, category, city, country, price, currency,
       photo_url, photo_urls, booking_slug, duration_minutes, max_capacity,
       booking_type, location, conditions, time_slots, blocked_dates,
       requires_id_document, payment_methods, sort_order, org_id, active,
       commission_type, commission_amount, provider_name, user_id, property_id,
       created_at, updated_at
FROM public.concierge_services
WHERE active = true;

GRANT SELECT ON public.concierge_services_public TO anon, authenticated;

-- 2. Create a safe view for marketplace_services (excludes payment_* and source_contact_*)
CREATE OR REPLACE VIEW public.marketplace_services_public AS
SELECT id, title, description, category, city, country, price, currency,
       photo_urls, price_type, duration_minutes, booking_slug, active,
       org_id, provider_id, user_id, sort_order, max_capacity, time_slots,
       blocked_dates, location, badges, requires_id_document,
       created_at, updated_at
FROM public.marketplace_services
WHERE active = true;

GRANT SELECT ON public.marketplace_services_public TO anon, authenticated