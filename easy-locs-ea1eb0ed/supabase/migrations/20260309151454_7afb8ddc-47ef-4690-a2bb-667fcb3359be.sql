
-- Remove the overly broad public read policies from concierge_services main table
DROP POLICY IF EXISTS "Anon can read active concierge services" ON public.concierge_services;
DROP POLICY IF EXISTS "Public can read active concierge services" ON public.concierge_services;
