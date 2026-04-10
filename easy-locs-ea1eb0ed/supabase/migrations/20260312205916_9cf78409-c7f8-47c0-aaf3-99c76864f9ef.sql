
-- 1. Create listing_status enum
CREATE TYPE public.listing_status AS ENUM (
  'draft', 'pending_review', 'published', 'paused', 'sold', 'rented', 'archived', 'deleted'
);

-- 2. Add status column to marketplace_services (default 'published' to keep existing data working)
ALTER TABLE public.marketplace_services 
  ADD COLUMN IF NOT EXISTS status public.listing_status NOT NULL DEFAULT 'published';

-- 3. Sync existing rows: active=true → published, active=false → paused
UPDATE public.marketplace_services SET status = 'published' WHERE active = true;
UPDATE public.marketplace_services SET status = 'paused' WHERE active = false OR active IS NULL;

-- 4. Enable realtime for marketplace_services
ALTER PUBLICATION supabase_realtime ADD TABLE public.marketplace_services;

-- 5. Create audit trigger for listing changes
CREATE OR REPLACE FUNCTION public.audit_listing_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _action text;
  _meta jsonb;
BEGIN
  _action := 'listing_' || LOWER(TG_OP);
  
  IF TG_OP = 'DELETE' THEN
    _meta := jsonb_build_object('listing_id', OLD.id, 'title', OLD.title, 'operation', TG_OP);
    INSERT INTO public.audit_logs (user_id, org_id, action, metadata_json)
    VALUES (COALESCE(auth.uid(), OLD.user_id), OLD.org_id, _action, _meta);
    RETURN OLD;
  END IF;

  -- Detect status transitions
  IF TG_OP = 'UPDATE' AND OLD.status IS DISTINCT FROM NEW.status THEN
    _action := 'listing_status_' || NEW.status::text;
  END IF;

  _meta := jsonb_build_object(
    'listing_id', NEW.id, 'title', NEW.title, 'operation', TG_OP,
    'status', NEW.status::text,
    'old_status', CASE WHEN TG_OP = 'UPDATE' THEN OLD.status::text ELSE NULL END,
    'category', NEW.category, 'price', NEW.price, 'currency', NEW.currency
  );

  INSERT INTO public.audit_logs (user_id, org_id, action, metadata_json)
  VALUES (COALESCE(auth.uid(), NEW.user_id), NEW.org_id, _action, _meta);

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_audit_listing_change
  AFTER INSERT OR UPDATE OR DELETE ON public.marketplace_services
  FOR EACH ROW EXECUTE FUNCTION public.audit_listing_change();

-- 6. Create notification trigger for listing lifecycle events
CREATE OR REPLACE FUNCTION public.notify_listing_event()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _org_owner uuid;
  _title text;
  _message text;
  _link text;
  _type text := 'info';
  _meta jsonb;
BEGIN
  SELECT owner_user_id INTO _org_owner FROM public.orgs WHERE id = NEW.org_id LIMIT 1;
  IF _org_owner IS NULL THEN RETURN NEW; END IF;

  -- Only fire on status transitions
  IF TG_OP = 'UPDATE' AND OLD.status IS NOT DISTINCT FROM NEW.status THEN
    RETURN NEW;
  END IF;

  CASE NEW.status::text
    WHEN 'published' THEN
      _title := '🚀 Listing published';
      _message := '"' || COALESCE(NEW.title, 'Listing') || '" is now live on the marketplace.';
      _link := '/dashboard/marketplace';
    WHEN 'paused' THEN
      _title := '⏸️ Listing paused';
      _message := '"' || COALESCE(NEW.title, 'Listing') || '" has been paused.';
      _link := '/dashboard/marketplace';
    WHEN 'sold' THEN
      _title := '🎉 Listing marked as sold';
      _message := '"' || COALESCE(NEW.title, 'Listing') || '" — congratulations!';
      _link := '/dashboard/marketplace';
    WHEN 'rented' THEN
      _title := '🔑 Listing marked as rented';
      _message := '"' || COALESCE(NEW.title, 'Listing') || '" is now rented.';
      _link := '/dashboard/marketplace';
    WHEN 'archived' THEN
      _title := '📦 Listing archived';
      _message := '"' || COALESCE(NEW.title, 'Listing') || '" moved to archives.';
      _link := '/dashboard/marketplace';
    ELSE
      RETURN NEW;
  END CASE;

  _meta := jsonb_build_object(
    'target_type', 'listing',
    'target_id', NEW.id::text,
    'listing_title', COALESCE(NEW.title, ''),
    'status', NEW.status::text,
    'org_id', NEW.org_id::text,
    'target_url', _link
  );

  INSERT INTO public.notifications (user_id, org_id, type, title, message, link, metadata_json)
  VALUES (_org_owner, NEW.org_id, _type, _title, _message, _link, _meta);

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_notify_listing_event
  AFTER INSERT OR UPDATE ON public.marketplace_services
  FOR EACH ROW EXECUTE FUNCTION public.notify_listing_event();

-- 7. Update get_public_marketplace_services to also filter by status = 'published'
CREATE OR REPLACE FUNCTION public.get_public_marketplace_services(
  _category text DEFAULT NULL, _city text DEFAULT NULL, _country text DEFAULT NULL
)
RETURNS TABLE(
  id uuid, title text, description text, category text, city text, country text,
  price numeric, currency text, photo_urls jsonb, price_type text, duration_minutes integer,
  booking_slug text, active boolean, org_id uuid, provider_id uuid, sort_order integer,
  max_capacity integer, time_slots jsonb, blocked_dates jsonb, location text,
  badges text[], requires_id_document boolean, listing_type text, surface_sqm numeric,
  rooms integer, bedrooms integer, bathrooms integer, contact_whatsapp text,
  source_contact_email text, source_contact_phone text, deposit_amount numeric,
  brand text, model text, condition text, features jsonb, year_built integer,
  quantity integer, contact_email text
)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT ms.id, ms.title, ms.description, ms.category, ms.city, ms.country,
         ms.price, ms.currency, ms.photo_urls, ms.price_type, ms.duration_minutes,
         ms.booking_slug, ms.active, ms.org_id, ms.provider_id, ms.sort_order,
         ms.max_capacity, ms.time_slots, ms.blocked_dates,
         ms.location, ms.badges, ms.requires_id_document,
         ms.listing_type, ms.surface_sqm, ms.rooms, ms.bedrooms, ms.bathrooms,
         NULL::text AS contact_whatsapp,
         NULL::text AS source_contact_email,
         CASE WHEN ms.source_contact_phone IS NOT NULL THEN LEFT(ms.source_contact_phone, 6) || '••••' ELSE NULL END AS source_contact_phone,
         ms.deposit_amount, ms.brand, ms.model, ms.condition, ms.features,
         ms.year_built, ms.quantity,
         NULL::text AS contact_email
  FROM public.marketplace_services ms
  WHERE ms.active = true
    AND ms.status = 'published'
    AND (_category IS NULL OR ms.category = _category)
    AND (_city IS NULL OR ms.city = _city)
    AND (_country IS NULL OR ms.country = _country)
    AND (ms.listing_expires_at IS NULL OR ms.listing_expires_at > now())
  ORDER BY ms.sort_order ASC, ms.created_at DESC;
$$;
