
-- Create trigger function for concierge order notifications
CREATE OR REPLACE FUNCTION public.notify_concierge_order()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _org_owner uuid;
  _svc_title text;
BEGIN
  SELECT owner_user_id INTO _org_owner FROM public.orgs WHERE id = NEW.org_id LIMIT 1;
  IF _org_owner IS NULL THEN RETURN NEW; END IF;

  SELECT title INTO _svc_title FROM public.concierge_services WHERE id = NEW.service_id LIMIT 1;

  -- New order notification
  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.notifications (user_id, org_id, type, title, message, link)
    VALUES (_org_owner, NEW.org_id, 'info',
      '🎯 New concierge booking',
      COALESCE(NEW.guest_name, 'Guest') || ' booked ' || COALESCE(_svc_title, 'service') || ' — ' || NEW.total_price || ' ' || NEW.currency,
      '/dashboard/concierge');
  END IF;

  -- Payment received notification
  IF TG_OP = 'UPDATE' AND NEW.payment_status = 'paid' AND (OLD.payment_status IS NULL OR OLD.payment_status <> 'paid') THEN
    INSERT INTO public.notifications (user_id, org_id, type, title, message, link)
    VALUES (_org_owner, NEW.org_id, 'info',
      '💰 Concierge payment received',
      COALESCE(NEW.guest_name, 'Guest') || ' paid ' || NEW.total_price || ' ' || NEW.currency || ' for ' || COALESCE(_svc_title, 'service'),
      '/dashboard/concierge');
  END IF;

  -- Cancellation notification
  IF TG_OP = 'UPDATE' AND NEW.status = 'cancelled' AND OLD.status <> 'cancelled' THEN
    INSERT INTO public.notifications (user_id, org_id, type, title, message, link)
    VALUES (_org_owner, NEW.org_id, 'info',
      '❌ Concierge booking cancelled',
      COALESCE(NEW.guest_name, 'Guest') || ' cancelled booking for ' || COALESCE(_svc_title, 'service'),
      '/dashboard/concierge');
  END IF;

  RETURN NEW;
END;
$$;

-- Create triggers
CREATE TRIGGER trg_concierge_order_insert
  AFTER INSERT ON public.concierge_orders
  FOR EACH ROW EXECUTE FUNCTION notify_concierge_order();

CREATE TRIGGER trg_concierge_order_update
  AFTER UPDATE ON public.concierge_orders
  FOR EACH ROW EXECUTE FUNCTION notify_concierge_order();
