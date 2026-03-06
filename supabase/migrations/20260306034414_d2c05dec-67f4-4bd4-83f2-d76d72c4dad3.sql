
-- Recreate notification triggers that were lost

-- Trigger for booking requests
CREATE OR REPLACE TRIGGER trg_notify_booking_request
  AFTER INSERT ON public.booking_requests
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_event('booking_request');

-- Trigger for leases
CREATE OR REPLACE TRIGGER trg_notify_lease_created
  AFTER INSERT ON public.leases
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_event('lease_created');

-- Trigger for interventions
CREATE OR REPLACE TRIGGER trg_notify_intervention_created
  AFTER INSERT ON public.interventions
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_event('intervention_created');

-- Trigger for rent_calls payment received
CREATE OR REPLACE TRIGGER trg_notify_payment_received
  AFTER UPDATE ON public.rent_calls
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_payment_received();

-- Trigger for inventory reports completed
CREATE OR REPLACE TRIGGER trg_notify_inventory_completed
  AFTER UPDATE ON public.inventory_reports
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_inventory_completed();

-- Trigger for reservations
CREATE OR REPLACE TRIGGER trg_notify_booking_created
  AFTER INSERT ON public.reservations
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_event('booking_created');
