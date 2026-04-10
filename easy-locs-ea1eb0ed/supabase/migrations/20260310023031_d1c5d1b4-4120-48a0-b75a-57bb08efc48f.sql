-- Remove legacy DB trigger + function for marketplace bookings.
-- Now handled by dispatchSyncEvent("service_booking") in client code.
DROP TRIGGER IF EXISTS on_marketplace_booking_created ON public.marketplace_bookings;
DROP FUNCTION IF EXISTS public.notify_marketplace_booking();