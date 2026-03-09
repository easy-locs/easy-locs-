
-- Fix notify_marketplace_booking: remove NEW.country reference (column doesn't exist on marketplace_bookings)
-- Country is already derived from marketplace_services into _country variable
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
  SELECT mp.user_id INTO _provider_user_id FROM public.marketplace_providers mp WHERE mp.id = NEW.provider_id LIMIT 1;
  SELECT ms.title, ms.country INTO _service_title, _country FROM public.marketplace_services ms WHERE ms.id = NEW.service_id LIMIT 1;

  IF _provider_user_id IS NOT NULL THEN
    INSERT INTO public.notifications (user_id, org_id, type, title, message, link, metadata_json)
    VALUES (_provider_user_id, NEW.org_id, 'info',
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
  END IF;

  RETURN NEW;
END;
$function$;
