
-- Delivery lifecycle notification trigger + escrow auto-triggers
CREATE OR REPLACE FUNCTION public.notify_delivery_status_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  _seller_id uuid;
  _driver_id uuid;
  _org_owner uuid;
  _title text;
  _message text;
  _link text;
  _type text := 'info';
  _meta jsonb;
BEGIN
  -- Only fire on status transitions
  IF TG_OP != 'UPDATE' OR OLD.status IS NOT DISTINCT FROM NEW.status THEN
    RETURN NEW;
  END IF;

  _seller_id := NEW.seller_id;
  _driver_id := NEW.driver_id;
  _link := '/driver';

  SELECT owner_user_id INTO _org_owner FROM public.orgs WHERE id = NEW.org_id LIMIT 1;

  _meta := jsonb_build_object(
    'target_type', 'delivery_job',
    'target_id', NEW.id::text,
    'job_status', NEW.status,
    'old_status', OLD.status,
    'org_id', NEW.org_id::text,
    'target_url', '/driver'
  );

  -- Determine notification content per status
  CASE NEW.status
    WHEN 'assigned' THEN
      _title := '📩 Nouvelle mission';
      _message := 'Une livraison vous a été assignée : ' || COALESCE(NEW.pickup_address, '') || ' → ' || COALESCE(NEW.dropoff_address, '');
      -- Notify driver
      IF _driver_id IS NOT NULL THEN
        INSERT INTO public.notifications (user_id, org_id, type, title, message, link, metadata_json)
        VALUES (_driver_id, NEW.org_id, _type, _title, _message, _link, _meta);
      END IF;

    WHEN 'accepted' THEN
      _title := '✅ Mission acceptée';
      _message := 'Le livreur a accepté la mission pour ' || COALESCE(NEW.dropoff_address, 'la livraison');
      -- Notify seller
      INSERT INTO public.notifications (user_id, org_id, type, title, message, link, metadata_json)
      VALUES (_seller_id, NEW.org_id, _type, _title, _message, '/dashboard/delivery', _meta);

    WHEN 'in_progress' THEN
      _title := '🚗 Colis récupéré';
      _message := 'Le livreur est en route vers ' || COALESCE(NEW.dropoff_address, 'la destination');
      -- Notify seller
      INSERT INTO public.notifications (user_id, org_id, type, title, message, link, metadata_json)
      VALUES (_seller_id, NEW.org_id, _type, _title, _message, '/dashboard/delivery', _meta);

    WHEN 'completed' THEN
      _title := '🏁 Livraison terminée';
      _message := 'La livraison vers ' || COALESCE(NEW.dropoff_address, '') || ' est confirmée.';
      _type := 'payment';
      -- Notify seller
      INSERT INTO public.notifications (user_id, org_id, type, title, message, link, metadata_json)
      VALUES (_seller_id, NEW.org_id, _type, _title, _message, '/dashboard/delivery', _meta);
      -- Notify driver
      IF _driver_id IS NOT NULL THEN
        INSERT INTO public.notifications (user_id, org_id, type, title, message, link, metadata_json)
        VALUES (_driver_id, NEW.org_id, 'info', '🏁 Mission terminée', 'Livraison confirmée — bien joué !', _link, _meta);
      END IF;

      -- AUTO-RELEASE ESCROW on completion
      UPDATE public.escrow_payments
      SET status = 'released', released_at = now(), release_reason = 'delivery_confirmed', updated_at = now()
      WHERE job_id = NEW.id AND status = 'held';

    WHEN 'cancelled' THEN
      _title := '❌ Livraison annulée';
      _message := COALESCE(NEW.cancellation_reason, 'La livraison a été annulée.');
      -- Notify seller
      INSERT INTO public.notifications (user_id, org_id, type, title, message, link, metadata_json)
      VALUES (_seller_id, NEW.org_id, _type, _title, _message, '/dashboard/delivery', _meta);
      -- Notify driver
      IF _driver_id IS NOT NULL THEN
        INSERT INTO public.notifications (user_id, org_id, type, title, message, link, metadata_json)
        VALUES (_driver_id, NEW.org_id, _type, '❌ Mission annulée', _message, _link, _meta);
      END IF;

      -- AUTO-REFUND ESCROW on cancellation
      UPDATE public.escrow_payments
      SET status = 'refunded', refunded_at = now(), refund_reason = COALESCE(NEW.cancellation_reason, 'job_cancelled'), updated_at = now()
      WHERE job_id = NEW.id AND status = 'held';

    ELSE
      RETURN NEW;
  END CASE;

  RETURN NEW;
END;
$function$;

-- Attach trigger
DROP TRIGGER IF EXISTS trg_delivery_status_notify ON public.delivery_jobs;
CREATE TRIGGER trg_delivery_status_notify
  AFTER UPDATE ON public.delivery_jobs
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_delivery_status_change();
