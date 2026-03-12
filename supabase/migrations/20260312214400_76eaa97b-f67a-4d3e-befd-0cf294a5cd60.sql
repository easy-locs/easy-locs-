
-- Payment completion → auto-confirm deal + booking + notifications
-- Triggers when marketplace_bookings.payment_status changes to 'paid' or payment_confirmed = true

CREATE OR REPLACE FUNCTION public.auto_confirm_deal_on_payment()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _deal record;
  _org_owner uuid;
BEGIN
  -- Only fire when payment is confirmed
  IF NOT (
    (NEW.payment_status = 'paid' AND (OLD.payment_status IS NULL OR OLD.payment_status <> 'paid'))
    OR
    (NEW.payment_confirmed = true AND (OLD.payment_confirmed IS NULL OR OLD.payment_confirmed = false))
  ) THEN
    RETURN NEW;
  END IF;

  -- Auto-confirm booking if not already confirmed
  IF NEW.status NOT IN ('confirmed', 'completed', 'cancelled', 'refunded') THEN
    NEW.status := 'confirmed';
    NEW.confirmed_at := COALESCE(NEW.confirmed_at, now());
  END IF;

  -- Find linked deal room (by booking_id or context)
  SELECT * INTO _deal
  FROM public.deal_rooms
  WHERE (booking_id = NEW.id::text
    OR (context_type = 'marketplace_service' AND context_id = NEW.service_id::text AND buyer_id = (
      SELECT id FROM public.profiles WHERE email = NEW.booker_email LIMIT 1
    )))
    AND status IN ('payment_pending', 'accepted', 'offer_sent', 'counter_offer', 'inquiry', 'negotiation')
  ORDER BY created_at DESC
  LIMIT 1;

  IF _deal IS NOT NULL THEN
    -- Move deal to confirmed
    UPDATE public.deal_rooms
    SET status = 'confirmed', updated_at = now()
    WHERE id = _deal.id;

    -- Record event
    INSERT INTO public.deal_events (deal_id, event_type, actor_id, data_json)
    VALUES (_deal.id, 'payment', NULL,
      jsonb_build_object('action', 'payment_completed', 'amount', NEW.total_price, 'currency', NEW.currency, 'booking_id', NEW.id::text)
    );
  END IF;

  -- Notify org owner about payment + confirmation
  SELECT owner_user_id INTO _org_owner FROM public.orgs WHERE id = NEW.org_id LIMIT 1;
  IF _org_owner IS NOT NULL THEN
    INSERT INTO public.notifications (user_id, org_id, type, title, message, link, metadata_json)
    VALUES (_org_owner, NEW.org_id, 'payment',
      '✅ Payment confirmed & booking auto-confirmed',
      COALESCE(NEW.booker_name, 'Customer') || ' paid ' || NEW.total_price || ' ' || NEW.currency || '. Booking is now confirmed.',
      '/dashboard/marketplace?booking=' || NEW.id,
      jsonb_build_object('target_type', 'marketplace_booking', 'target_id', NEW.id::text, 'booking_id', NEW.id::text, 'org_id', NEW.org_id::text, 'target_url', '/dashboard/marketplace?booking=' || NEW.id::text)
    );
  END IF;

  RETURN NEW;
END;
$$;

-- Use BEFORE trigger so we can modify NEW.status
DROP TRIGGER IF EXISTS trg_auto_confirm_deal_on_payment ON public.marketplace_bookings;
CREATE TRIGGER trg_auto_confirm_deal_on_payment
  BEFORE UPDATE ON public.marketplace_bookings
  FOR EACH ROW
  EXECUTE FUNCTION public.auto_confirm_deal_on_payment();

-- Also handle concierge_orders payment → deal confirmation
CREATE OR REPLACE FUNCTION public.auto_confirm_deal_on_concierge_payment()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _deal record;
BEGIN
  IF NOT (NEW.payment_status = 'paid' AND (OLD.payment_status IS NULL OR OLD.payment_status <> 'paid')) THEN
    RETURN NEW;
  END IF;

  -- Auto-confirm order
  IF NEW.status NOT IN ('confirmed', 'completed', 'cancelled', 'refunded') THEN
    NEW.status := 'confirmed';
    NEW.confirmed_at := COALESCE(NEW.confirmed_at, now());
  END IF;

  -- Find linked deal
  SELECT * INTO _deal
  FROM public.deal_rooms
  WHERE booking_id = NEW.id::text
    AND status IN ('payment_pending', 'accepted')
  LIMIT 1;

  IF _deal IS NOT NULL THEN
    UPDATE public.deal_rooms SET status = 'confirmed', updated_at = now() WHERE id = _deal.id;
    INSERT INTO public.deal_events (deal_id, event_type, data_json)
    VALUES (_deal.id, 'payment', jsonb_build_object('action', 'payment_completed', 'amount', NEW.total_price, 'currency', NEW.currency));
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_auto_confirm_deal_on_concierge_payment ON public.concierge_orders;
CREATE TRIGGER trg_auto_confirm_deal_on_concierge_payment
  BEFORE UPDATE ON public.concierge_orders
  FOR EACH ROW
  EXECUTE FUNCTION public.auto_confirm_deal_on_concierge_payment();
