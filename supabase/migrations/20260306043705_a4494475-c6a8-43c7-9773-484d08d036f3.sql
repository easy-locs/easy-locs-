-- Re-create all missing triggers

-- 1. Booking request notification
CREATE OR REPLACE TRIGGER trg_notify_booking_request
  AFTER INSERT ON public.booking_requests
  FOR EACH ROW EXECUTE FUNCTION public.notify_event('booking_request');

-- 2. Seasonal booking notification
CREATE OR REPLACE TRIGGER trg_notify_booking_created
  AFTER INSERT ON public.seasonal_bookings
  FOR EACH ROW EXECUTE FUNCTION public.notify_event('booking_created');

-- 3. Lease created notification
CREATE OR REPLACE TRIGGER trg_notify_lease_created
  AFTER INSERT ON public.leases
  FOR EACH ROW EXECUTE FUNCTION public.notify_event('lease_created');

-- 4. Intervention created notification
CREATE OR REPLACE TRIGGER trg_notify_intervention_created
  AFTER INSERT ON public.interventions
  FOR EACH ROW EXECUTE FUNCTION public.notify_event('intervention_created');

-- 5. Payment received notification
CREATE OR REPLACE TRIGGER trg_notify_payment_received
  AFTER UPDATE ON public.rent_calls
  FOR EACH ROW EXECUTE FUNCTION public.notify_payment_received();

-- 6. Inventory completed notification
CREATE OR REPLACE TRIGGER trg_notify_inventory_completed
  AFTER UPDATE ON public.inventory_reports
  FOR EACH ROW EXECUTE FUNCTION public.notify_inventory_completed();

-- 7. Auto-generate receipt on payment
CREATE OR REPLACE TRIGGER trg_auto_generate_receipt
  AFTER UPDATE ON public.rent_calls
  FOR EACH ROW EXECUTE FUNCTION public.auto_generate_receipt();