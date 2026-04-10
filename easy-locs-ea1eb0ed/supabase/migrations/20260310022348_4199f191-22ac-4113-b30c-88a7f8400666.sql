-- Remove legacy DB trigger for booking_request notifications.
-- Now handled by dispatchSyncEvent("booking_request") in client code.
DROP TRIGGER IF EXISTS trg_notify_booking_request ON public.booking_requests;