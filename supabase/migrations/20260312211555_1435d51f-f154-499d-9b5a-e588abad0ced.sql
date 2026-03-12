
-- Drop and recreate the view with correct columns
DROP VIEW IF EXISTS public.marketplace_services_public;

CREATE VIEW public.marketplace_services_public
WITH (security_invoker = false) AS
SELECT
  id, title, description, category, city, country,
  price, currency, photo_urls, price_type, duration_minutes,
  booking_slug, active, org_id, provider_id, user_id,
  sort_order, max_capacity, time_slots, blocked_dates,
  location, badges, requires_id_document,
  listing_type, surface_sqm, rooms, bedrooms, bathrooms,
  deposit_amount, brand, model, condition, features, year_built, quantity,
  source_contact_phone, source_contact_email, contact_whatsapp, contact_email,
  status, listing_expires_at,
  created_at, updated_at
FROM public.marketplace_services
WHERE active = true
  AND status = 'published'
  AND (listing_expires_at IS NULL OR listing_expires_at > now());

-- Notify listing owner on marketplace booking events
CREATE OR REPLACE FUNCTION public.notify_marketplace_booking()
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
  SELECT title INTO _svc_title FROM public.marketplace_services WHERE id = NEW.service_id LIMIT 1;

  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.notifications (user_id, org_id, type, title, message, link, metadata_json)
    VALUES (_org_owner, NEW.org_id, 'info',
      '📩 New booking request',
      COALESCE(NEW.booker_name, 'Customer') || ' wants to book "' || COALESCE(_svc_title, 'service') || '"',
      '/dashboard/marketplace?booking=' || NEW.id,
      jsonb_build_object('target_type', 'marketplace_booking', 'target_id', NEW.id::text, 'booking_id', NEW.id::text, 'org_id', NEW.org_id::text, 'target_url', '/dashboard/marketplace?booking=' || NEW.id::text)
    );
  END IF;

  IF TG_OP = 'UPDATE' AND NEW.status = 'confirmed' AND OLD.status IS DISTINCT FROM 'confirmed' THEN
    INSERT INTO public.notifications (user_id, org_id, type, title, message, link, metadata_json)
    VALUES (_org_owner, NEW.org_id, 'info',
      '✅ Booking confirmed',
      'Booking for "' || COALESCE(_svc_title, 'service') || '" confirmed.',
      '/dashboard/marketplace?booking=' || NEW.id,
      jsonb_build_object('target_type', 'marketplace_booking', 'target_id', NEW.id::text, 'booking_id', NEW.id::text, 'org_id', NEW.org_id::text, 'target_url', '/dashboard/marketplace?booking=' || NEW.id::text)
    );
  END IF;

  IF TG_OP = 'UPDATE' AND NEW.payment_status = 'paid' AND (OLD.payment_status IS NULL OR OLD.payment_status <> 'paid') THEN
    INSERT INTO public.notifications (user_id, org_id, type, title, message, link, metadata_json)
    VALUES (_org_owner, NEW.org_id, 'payment',
      '💰 Payment received',
      COALESCE(NEW.booker_name, 'Customer') || ' paid ' || NEW.total_price || ' ' || NEW.currency,
      '/dashboard/marketplace?booking=' || NEW.id,
      jsonb_build_object('target_type', 'marketplace_booking', 'target_id', NEW.id::text, 'booking_id', NEW.id::text, 'org_id', NEW.org_id::text, 'target_url', '/dashboard/marketplace?booking=' || NEW.id::text)
    );
  END IF;

  RETURN NEW;
END;
$$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_notify_marketplace_booking') THEN
    CREATE TRIGGER trg_notify_marketplace_booking
      AFTER INSERT OR UPDATE ON public.marketplace_bookings
      FOR EACH ROW EXECUTE FUNCTION public.notify_marketplace_booking();
  END IF;
END $$;
