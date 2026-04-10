-- Grant SELECT, INSERT, UPDATE, DELETE to authenticated role on all public tables
DO $$
DECLARE
  tbl RECORD;
BEGIN
  FOR tbl IN SELECT tablename FROM pg_tables WHERE schemaname = 'public'
  LOOP
    EXECUTE format('GRANT SELECT, INSERT, UPDATE, DELETE ON public.%I TO authenticated', tbl.tablename);
  END LOOP;
END $$;

-- Grant limited access to anon for public-facing tables
GRANT SELECT ON public.public_listings TO anon;
GRANT SELECT ON public.concierge_services TO anon;
GRANT SELECT ON public.marketplace_services TO anon;
GRANT SELECT ON public.marketplace_providers TO anon;
GRANT SELECT ON public.real_estate_listings TO anon;
GRANT SELECT ON public.landlord_profiles TO anon;
GRANT SELECT ON public.fx_rates_cache TO anon;
GRANT SELECT ON public.newsletter_subscribers TO anon;
GRANT INSERT ON public.newsletter_subscribers TO anon;
GRANT INSERT ON public.contact_clicks TO anon;
GRANT INSERT ON public.real_estate_leads TO anon;
GRANT INSERT ON public.booking_requests TO anon;
GRANT INSERT ON public.guest_sessions TO anon;
GRANT SELECT ON public.guest_sessions TO anon;
GRANT INSERT ON public.guest_call_signals TO anon;
GRANT SELECT ON public.guest_call_signals TO anon;
GRANT UPDATE ON public.guest_call_signals TO anon;
GRANT INSERT ON public.messages TO anon;
GRANT SELECT ON public.messages TO anon;

-- Grant usage on sequences
GRANT USAGE ON ALL SEQUENCES IN SCHEMA public TO authenticated;
GRANT USAGE ON ALL SEQUENCES IN SCHEMA public TO anon;