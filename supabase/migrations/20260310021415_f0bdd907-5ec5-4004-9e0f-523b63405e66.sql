-- Remove legacy trigger + function for real estate lead notifications.
-- Now handled by dispatchSyncEvent("lead_created") in client code.
DROP TRIGGER IF EXISTS trg_notify_real_estate_lead ON public.real_estate_leads;
DROP FUNCTION IF EXISTS public.notify_real_estate_lead();