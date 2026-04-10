
CREATE OR REPLACE FUNCTION public.notify_real_estate_lead()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _org_owner uuid;
  _listing_title text;
  _listing_type text;
BEGIN
  SELECT owner_user_id INTO _org_owner FROM public.orgs WHERE id = NEW.org_id LIMIT 1;
  IF _org_owner IS NULL THEN RETURN NEW; END IF;

  SELECT title, listing_type INTO _listing_title, _listing_type
  FROM public.real_estate_listings WHERE id = NEW.listing_id LIMIT 1;

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

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_notify_real_estate_lead
AFTER INSERT ON public.real_estate_leads
FOR EACH ROW EXECUTE FUNCTION public.notify_real_estate_lead();
