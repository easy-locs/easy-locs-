-- Remove legacy DB trigger for intervention_created notifications.
-- Now handled by dispatchSyncEvent("intervention_created") in client code.
DROP TRIGGER IF EXISTS trg_notify_intervention_created ON public.interventions;