
-- Create notification triggers for key events

-- Function to create a notification
CREATE OR REPLACE FUNCTION public.notify_event()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _org_owner uuid;
  _title text;
  _message text;
  _link text;
  _type text := 'info';
BEGIN
  -- Get org owner
  SELECT owner_user_id INTO _org_owner FROM public.orgs WHERE id = NEW.org_id LIMIT 1;
  IF _org_owner IS NULL THEN RETURN NEW; END IF;

  -- Determine event type based on TG_ARGV[0]
  CASE TG_ARGV[0]
    WHEN 'booking_created' THEN
      _title := '🏖️ Nouvelle réservation';
      _message := 'Réservation de ' || COALESCE(NEW.guest_name, 'Voyageur') || ' du ' || NEW.check_in || ' au ' || NEW.check_out;
      _link := '/seasonal-rentals';
    WHEN 'booking_request' THEN
      _title := '📩 Demande de réservation';
      _message := COALESCE(NEW.guest_name, 'Voyageur') || ' souhaite réserver du ' || NEW.check_in || ' au ' || NEW.check_out;
      _link := '/seasonal-rentals?focusRequest=' || NEW.id;
    WHEN 'payment_received' THEN
      _title := '💰 Paiement reçu';
      _message := 'Loyer ' || NEW.month || ' marqué comme payé (' || NEW.total_amount || ')';
      _link := '/dashboard/rental?tab=payments';
    WHEN 'lease_created' THEN
      _title := '📝 Nouveau bail créé';
      _message := 'Bail ' || NEW.lease_type || ' créé, début le ' || NEW.start_date;
      _link := '/dashboard/rental?tab=tenants';
    WHEN 'intervention_created' THEN
      _title := '🔧 Nouvelle intervention';
      _message := COALESCE(NEW.title, 'Intervention') || ' — Priorité : ' || NEW.priority;
      _link := '/interventions';
    WHEN 'inventory_completed' THEN
      _title := '📋 État des lieux finalisé';
      _message := 'État des lieux ' || NEW.report_type || ' finalisé le ' || NEW.report_date;
      _link := '/dashboard/rental?tab=inventory';
    ELSE
      RETURN NEW;
  END CASE;

  INSERT INTO public.notifications (user_id, org_id, type, title, message, link)
  VALUES (_org_owner, NEW.org_id, _type, _title, _message, _link);

  RETURN NEW;
END;
$$;

-- Trigger: seasonal booking created
CREATE TRIGGER trg_notify_booking_created
AFTER INSERT ON public.seasonal_bookings
FOR EACH ROW
EXECUTE FUNCTION public.notify_event('booking_created');

-- Trigger: booking request created
CREATE TRIGGER trg_notify_booking_request
AFTER INSERT ON public.booking_requests
FOR EACH ROW
EXECUTE FUNCTION public.notify_event('booking_request');

-- Trigger: rent payment received (when paid changes to true)
CREATE OR REPLACE FUNCTION public.notify_payment_received()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _org_owner uuid;
BEGIN
  -- Only trigger when paid changes from false to true
  IF NEW.paid = true AND (OLD.paid IS NULL OR OLD.paid = false) THEN
    SELECT owner_user_id INTO _org_owner FROM public.orgs WHERE id = NEW.org_id LIMIT 1;
    IF _org_owner IS NOT NULL THEN
      INSERT INTO public.notifications (user_id, org_id, type, title, message, link)
      VALUES (_org_owner, NEW.org_id, 'info',
        '💰 Paiement reçu',
        'Loyer ' || NEW.month || ' payé (' || NEW.total_amount || ')',
        '/dashboard/rental?tab=payments');
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_notify_payment_received
AFTER UPDATE ON public.rent_calls
FOR EACH ROW
EXECUTE FUNCTION public.notify_payment_received();

-- Trigger: lease created
CREATE TRIGGER trg_notify_lease_created
AFTER INSERT ON public.leases
FOR EACH ROW
EXECUTE FUNCTION public.notify_event('lease_created');

-- Trigger: intervention created
CREATE TRIGGER trg_notify_intervention_created
AFTER INSERT ON public.interventions
FOR EACH ROW
EXECUTE FUNCTION public.notify_event('intervention_created');

-- Trigger: inventory report finalized
CREATE OR REPLACE FUNCTION public.notify_inventory_completed()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _org_owner uuid;
BEGIN
  IF NEW.status = 'completed' AND (OLD.status IS NULL OR OLD.status != 'completed') THEN
    SELECT owner_user_id INTO _org_owner FROM public.orgs WHERE id = NEW.org_id LIMIT 1;
    IF _org_owner IS NOT NULL THEN
      INSERT INTO public.notifications (user_id, org_id, type, title, message, link)
      VALUES (_org_owner, NEW.org_id, 'info',
        '📋 État des lieux finalisé',
        'État des lieux ' || NEW.report_type || ' finalisé le ' || NEW.report_date,
        '/dashboard/rental?tab=inventory');
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_notify_inventory_completed
AFTER UPDATE ON public.inventory_reports
FOR EACH ROW
EXECUTE FUNCTION public.notify_inventory_completed();
