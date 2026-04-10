
-- Some triggers already exist, use CREATE OR REPLACE via DROP IF EXISTS + CREATE
DROP TRIGGER IF EXISTS trg_notify_intervention_created ON public.interventions;
CREATE TRIGGER trg_notify_intervention_created
  AFTER INSERT ON public.interventions
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_event('intervention_created');

DROP TRIGGER IF EXISTS trg_notify_booking_request ON public.booking_requests;
CREATE TRIGGER trg_notify_booking_request
  AFTER INSERT ON public.booking_requests
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_event('booking_request');

DROP TRIGGER IF EXISTS trg_notify_payment_received ON public.rent_calls;
CREATE TRIGGER trg_notify_payment_received
  AFTER UPDATE ON public.rent_calls
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_payment_received();

DROP TRIGGER IF EXISTS trg_notify_inventory_completed ON public.inventory_reports;
CREATE TRIGGER trg_notify_inventory_completed
  AFTER UPDATE ON public.inventory_reports
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_inventory_completed();
