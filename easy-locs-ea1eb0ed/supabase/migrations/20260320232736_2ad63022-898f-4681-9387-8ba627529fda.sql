DROP VIEW IF EXISTS public.public_marketplace_listings;
CREATE VIEW public.public_marketplace_listings
WITH (security_invoker = true)
AS
SELECT
  id, title, description, category, listing_type,
  price, currency, city, country, lat, lng,
  photo_urls, badges, provider_id, org_id,
  active, status, created_at, published_at,
  listing_expires_at, auto_expire,
  boost_enabled, boost_multiplier, boost_expires_at,
  freshness_score, booking_slug
FROM public.marketplace_services
WHERE active = true
  AND status = 'published'
  AND (listing_expires_at IS NULL OR listing_expires_at > now());

CREATE OR REPLACE FUNCTION public.increment_listing_renewal_count(p_listing_id uuid)
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  UPDATE marketplace_services
  SET renewal_count = renewal_count + 1
  WHERE id = p_listing_id;
$$;

CREATE INDEX IF NOT EXISTS idx_ms_boost ON public.marketplace_services (boost_enabled, boost_expires_at) WHERE boost_enabled = true;
CREATE INDEX IF NOT EXISTS idx_ms_auto_renew ON public.marketplace_services (auto_renew_enabled, listing_expires_at) WHERE auto_renew_enabled = true;
CREATE INDEX IF NOT EXISTS idx_ms_freshness ON public.marketplace_services (freshness_score DESC) WHERE active = true;