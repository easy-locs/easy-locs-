
CREATE OR REPLACE FUNCTION public.notify_real_estate_lead()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  _org_owner uuid;
  _owner_email text;
  _listing_title text;
  _listing_type text;
BEGIN
  SELECT owner_user_id INTO _org_owner FROM public.orgs WHERE id = NEW.org_id LIMIT 1;
  IF _org_owner IS NULL THEN RETURN NEW; END IF;

  SELECT title, listing_type INTO _listing_title, _listing_type
  FROM public.real_estate_listings WHERE id = NEW.listing_id LIMIT 1;

  -- In-app notification
  INSERT INTO public.notifications (user_id, org_id, type, title, message, link, metadata_json)
  VALUES (
    _org_owner,
    NEW.org_id,
    'info',
    '🏠 New property inquiry',
    COALESCE(NEW.name, 'Visitor') || ' is interested in ' || COALESCE(_listing_title, 'a property') || ' (' || COALESCE(_listing_type, '') || ')',
    '/dashboard/real-estate?tab=leads',
    jsonb_build_object(
      'target_type', 'real_estate_lead',
      'target_id', NEW.id::text,
      'listing_id', NEW.listing_id::text,
      'org_id', NEW.org_id::text,
      'target_url', '/dashboard/real-estate?tab=leads'
    )
  );

  -- Email notification to owner
  SELECT email INTO _owner_email FROM public.profiles WHERE id = _org_owner LIMIT 1;
  IF _owner_email IS NOT NULL AND _owner_email <> '' THEN
    PERFORM net.http_post(
      url := (SELECT value FROM public.internal_config WHERE key = 'supabase_url' LIMIT 1) || '/functions/v1/send-notification-email',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || (SELECT value FROM public.internal_config WHERE key = 'service_role_key' LIMIT 1)
      ),
      body := jsonb_build_object(
        'event_type', 'real_estate_lead',
        'recipient_email', _owner_email,
        'recipient_name', '',
        'locale', 'en',
        'data', jsonb_build_object(
          'lead_name', COALESCE(NEW.name, 'Visitor'),
          'lead_email', COALESCE(NEW.email, ''),
          'lead_phone', COALESCE(NEW.phone, 'N/A'),
          'lead_message', COALESCE(NEW.message, ''),
          'listing_title', COALESCE(_listing_title, ''),
          'listing_type', COALESCE(_listing_type, ''),
          'org_id', NEW.org_id::text,
          'cta_url', 'https://easy-locs.lovable.app/dashboard/real-estate?tab=leads',
          'cta_label', 'View Lead'
        )
      )
    );
  END IF;

  RETURN NEW;
END;
$function$;

-- Ensure internal_config has the needed values for the HTTP call
INSERT INTO public.internal_config (key, value)
VALUES 
  ('supabase_url', 'https://jxnxznunncskauzvhlbq.supabase.co'),
  ('service_role_key', 'placeholder')
ON CONFLICT (key) DO NOTHING;
