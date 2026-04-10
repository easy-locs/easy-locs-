
-- Update notify_marketplace_booking to include metadata_json with deep-link context
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
        'country_code', COALESCE(_country, NEW.country, ''),
        'org_id', NEW.org_id::text,
        'target_url', '/dashboard/activities?booking=' || NEW.id::text
      )
    );
  END IF;

  RETURN NEW;
END;
$function$;

-- Update notify_concierge_order to include metadata_json with deep-link context
CREATE OR REPLACE FUNCTION public.notify_concierge_order()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  _org_owner uuid;
  _svc_title text;
  _country text;
BEGIN
  SELECT owner_user_id INTO _org_owner FROM public.orgs WHERE id = NEW.org_id LIMIT 1;
  IF _org_owner IS NULL THEN RETURN NEW; END IF;

  SELECT title, country INTO _svc_title, _country FROM public.concierge_services WHERE id = NEW.service_id LIMIT 1;

  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.notifications (user_id, org_id, type, title, message, link, metadata_json)
    VALUES (_org_owner, NEW.org_id, 'info',
      '🎯 New concierge booking',
      COALESCE(NEW.guest_name, 'Guest') || ' booked ' || COALESCE(_svc_title, 'service') || ' — ' || NEW.total_price || ' ' || NEW.currency,
      '/dashboard/concierge?booking=' || NEW.id,
      jsonb_build_object(
        'target_type', 'concierge_order',
        'target_id', NEW.id::text,
        'booking_id', NEW.id::text,
        'country_code', COALESCE(_country, ''),
        'org_id', NEW.org_id::text,
        'target_url', '/dashboard/concierge?booking=' || NEW.id::text
      )
    );
  END IF;

  IF TG_OP = 'UPDATE' AND NEW.payment_status = 'paid' AND (OLD.payment_status IS NULL OR OLD.payment_status <> 'paid') THEN
    INSERT INTO public.notifications (user_id, org_id, type, title, message, link, metadata_json)
    VALUES (_org_owner, NEW.org_id, 'payment',
      '💰 Payment received',
      COALESCE(NEW.guest_name, 'Guest') || ' paid ' || NEW.total_price || ' ' || NEW.currency || ' for ' || COALESCE(_svc_title, 'service'),
      '/dashboard/concierge?booking=' || NEW.id,
      jsonb_build_object(
        'target_type', 'concierge_order',
        'target_id', NEW.id::text,
        'booking_id', NEW.id::text,
        'country_code', COALESCE(_country, ''),
        'org_id', NEW.org_id::text,
        'target_url', '/dashboard/concierge?booking=' || NEW.id::text
      )
    );
  END IF;

  IF TG_OP = 'UPDATE' AND NEW.status = 'cancelled' AND OLD.status <> 'cancelled' THEN
    INSERT INTO public.notifications (user_id, org_id, type, title, message, link, metadata_json)
    VALUES (_org_owner, NEW.org_id, 'info',
      '❌ Booking cancelled',
      COALESCE(NEW.guest_name, 'Guest') || ' cancelled booking for ' || COALESCE(_svc_title, 'service'),
      '/dashboard/concierge?booking=' || NEW.id,
      jsonb_build_object(
        'target_type', 'concierge_order',
        'target_id', NEW.id::text,
        'booking_id', NEW.id::text,
        'country_code', COALESCE(_country, ''),
        'org_id', NEW.org_id::text,
        'target_url', '/dashboard/concierge?booking=' || NEW.id::text
      )
    );
  END IF;

  RETURN NEW;
END;
$function$;

-- Update notify_event to include metadata_json with deep-link context
CREATE OR REPLACE FUNCTION public.notify_event()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  _org_owner uuid;
  _title text;
  _message text;
  _link text;
  _type text := 'info';
  _meta jsonb;
  _country text;
BEGIN
  SELECT owner_user_id INTO _org_owner FROM public.orgs WHERE id = NEW.org_id LIMIT 1;
  IF _org_owner IS NULL THEN RETURN NEW; END IF;

  BEGIN
    SELECT p.country INTO _country FROM public.properties p WHERE p.id = NEW.property_id LIMIT 1;
  EXCEPTION WHEN OTHERS THEN
    _country := '';
  END;

  CASE TG_ARGV[0]
    WHEN 'booking_request' THEN
      _title := '📩 New booking request';
      _message := COALESCE(NEW.guest_name, 'Guest') || ' wants to book from ' || NEW.check_in || ' to ' || NEW.check_out;
      _link := '/dashboard/seasonal?booking=' || NEW.id;
      _meta := jsonb_build_object('target_type', 'booking_request', 'target_id', NEW.id::text, 'booking_id', NEW.id::text, 'country_code', COALESCE(_country, ''), 'org_id', NEW.org_id::text, 'target_url', '/dashboard/seasonal?booking=' || NEW.id::text);
    WHEN 'payment_received' THEN
      _title := '💰 Payment received';
      _message := 'Rent ' || NEW.month || ' paid (' || NEW.total_amount || ')';
      _link := '/dashboard/rental?tab=payments&record=' || NEW.id;
      _type := 'payment';
      _meta := jsonb_build_object('target_type', 'payment', 'target_id', NEW.id::text, 'country_code', COALESCE(_country, ''), 'org_id', NEW.org_id::text, 'target_url', '/dashboard/rental?tab=payments&record=' || NEW.id::text);
    WHEN 'lease_created' THEN
      _title := '📝 New lease created';
      _message := 'Lease ' || NEW.lease_type || ' starting ' || NEW.start_date;
      _link := '/dashboard/leases?record=' || NEW.id;
      _meta := jsonb_build_object('target_type', 'lease', 'target_id', NEW.id::text, 'country_code', COALESCE(NEW.country, _country, ''), 'org_id', NEW.org_id::text, 'target_url', '/dashboard/leases?record=' || NEW.id::text);
    WHEN 'intervention_created' THEN
      _title := '🔧 New intervention';
      _message := COALESCE(NEW.title, 'Intervention') || ' — Priority: ' || NEW.priority;
      _link := '/dashboard/interventions?record=' || NEW.id;
      _meta := jsonb_build_object('target_type', 'intervention', 'target_id', NEW.id::text, 'country_code', COALESCE(_country, ''), 'org_id', NEW.org_id::text, 'target_url', '/dashboard/interventions?record=' || NEW.id::text);
    WHEN 'inventory_completed' THEN
      _title := '📋 Inventory completed';
      _message := 'Inventory ' || NEW.report_type || ' completed on ' || NEW.report_date;
      _link := '/dashboard/rental?tab=inventory&record=' || NEW.id;
      _meta := jsonb_build_object('target_type', 'document', 'target_id', NEW.id::text, 'country_code', COALESCE(_country, ''), 'org_id', NEW.org_id::text, 'target_url', '/dashboard/rental?tab=inventory&record=' || NEW.id::text);
    ELSE
      RETURN NEW;
  END CASE;

  INSERT INTO public.notifications (user_id, org_id, type, title, message, link, metadata_json)
  VALUES (_org_owner, NEW.org_id, _type, _title, _message, _link, COALESCE(_meta, '{}'::jsonb));

  RETURN NEW;
END;
$function$;

-- Update notify_payment_received to include metadata_json
CREATE OR REPLACE FUNCTION public.notify_payment_received()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  _org_owner uuid;
  _country text;
BEGIN
  IF NEW.paid = true AND (OLD.paid IS NULL OR OLD.paid = false) THEN
    SELECT owner_user_id INTO _org_owner FROM public.orgs WHERE id = NEW.org_id LIMIT 1;
    BEGIN
      SELECT p.country INTO _country FROM public.properties p WHERE p.id = NEW.property_id LIMIT 1;
    EXCEPTION WHEN OTHERS THEN
      _country := '';
    END;
    IF _org_owner IS NOT NULL THEN
      INSERT INTO public.notifications (user_id, org_id, type, title, message, link, metadata_json)
      VALUES (_org_owner, NEW.org_id, 'payment',
        '💰 Payment received',
        'Rent ' || NEW.month || ' paid (' || NEW.total_amount || ')',
        '/dashboard/rental?tab=payments&record=' || NEW.id,
        jsonb_build_object('target_type', 'payment', 'target_id', NEW.id::text, 'country_code', COALESCE(_country, ''), 'org_id', NEW.org_id::text, 'target_url', '/dashboard/rental?tab=payments&record=' || NEW.id::text)
      );
    END IF;
  END IF;
  RETURN NEW;
END;
$function$;

-- Update notify_inventory_completed to include metadata_json
CREATE OR REPLACE FUNCTION public.notify_inventory_completed()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  _org_owner uuid;
  _country text;
BEGIN
  IF NEW.status = 'completed' AND (OLD.status IS NULL OR OLD.status != 'completed') THEN
    SELECT owner_user_id INTO _org_owner FROM public.orgs WHERE id = NEW.org_id LIMIT 1;
    BEGIN
      SELECT p.country INTO _country FROM public.properties p WHERE p.id = NEW.property_id LIMIT 1;
    EXCEPTION WHEN OTHERS THEN
      _country := '';
    END;
    IF _org_owner IS NOT NULL THEN
      INSERT INTO public.notifications (user_id, org_id, type, title, message, link, metadata_json)
      VALUES (_org_owner, NEW.org_id, 'info',
        '📋 Inventory completed',
        'Inventory ' || NEW.report_type || ' completed on ' || NEW.report_date,
        '/dashboard/rental?tab=inventory&record=' || NEW.id,
        jsonb_build_object('target_type', 'document', 'target_id', NEW.id::text, 'country_code', COALESCE(_country, ''), 'org_id', NEW.org_id::text, 'target_url', '/dashboard/rental?tab=inventory&record=' || NEW.id::text)
      );
    END IF;
  END IF;
  RETURN NEW;
END;
$function$;
