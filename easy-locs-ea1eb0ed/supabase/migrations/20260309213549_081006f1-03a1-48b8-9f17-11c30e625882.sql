
-- Fix notify_marketplace_booking: remove all NEW.country references
-- Derive country ONLY from marketplace_services via NEW.service_id
-- Hardened: if service not found, skip notification gracefully

CREATE OR REPLACE FUNCTION public.notify_marketplace_booking()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  _provider_user_id uuid;
  _service_title text;
  _country text;
BEGIN
  -- Safely fetch service info; if missing, skip notification entirely
  BEGIN
    SELECT ms.title, ms.country
      INTO _service_title, _country
      FROM public.marketplace_services ms
     WHERE ms.id = NEW.service_id
     LIMIT 1;
  EXCEPTION WHEN OTHERS THEN
    RAISE WARNING 'notify_marketplace_booking: failed to fetch service %: %', NEW.service_id, SQLERRM;
    RETURN NEW;
  END;

  -- Fetch provider user_id for notification target
  BEGIN
    SELECT mp.user_id
      INTO _provider_user_id
      FROM public.marketplace_providers mp
     WHERE mp.id = NEW.provider_id
     LIMIT 1;
  EXCEPTION WHEN OTHERS THEN
    _provider_user_id := NULL;
  END;

  -- If no provider found, skip notification but let booking succeed
  IF _provider_user_id IS NULL THEN
    RETURN NEW;
  END IF;

  INSERT INTO public.notifications (user_id, org_id, type, title, message, link, metadata_json)
  VALUES (
    _provider_user_id,
    NEW.org_id,
    'info',
    '🎯 New marketplace booking',
    COALESCE(NEW.booker_name, 'Client') || ' booked ' || COALESCE(_service_title, 'service') || ' — ' || NEW.total_price || ' ' || NEW.currency,
    '/dashboard/activities?booking=' || NEW.id,
    jsonb_build_object(
      'target_type', 'marketplace_booking',
      'target_id', NEW.id::text,
      'booking_id', NEW.id::text,
      'country_code', COALESCE(_country, ''),
      'org_id', NEW.org_id::text,
      'target_url', '/dashboard/activities?booking=' || NEW.id::text
    )
  );

  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  -- Never let notification logic crash a booking insert
  RAISE WARNING 'notify_marketplace_booking failed: %', SQLERRM;
  RETURN NEW;
END;
$function$;
