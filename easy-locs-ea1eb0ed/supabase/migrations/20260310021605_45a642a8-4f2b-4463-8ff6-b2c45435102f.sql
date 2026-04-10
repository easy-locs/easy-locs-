-- Remove legacy DB trigger that inserts payment_received notifications on rent_calls update.
-- Now handled by dispatchSyncEvent("payment_received") in client code.
DROP TRIGGER IF EXISTS trg_notify_payment_received ON public.rent_calls;
DROP FUNCTION IF EXISTS public.notify_payment_received();