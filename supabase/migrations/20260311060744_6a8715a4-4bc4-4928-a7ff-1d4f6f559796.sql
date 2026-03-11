
-- Layer 3.3: Enable Realtime on remaining hot tables
ALTER PUBLICATION supabase_realtime ADD TABLE public.booking_requests;
ALTER PUBLICATION supabase_realtime ADD TABLE public.rent_calls;
ALTER PUBLICATION supabase_realtime ADD TABLE public.interventions;
