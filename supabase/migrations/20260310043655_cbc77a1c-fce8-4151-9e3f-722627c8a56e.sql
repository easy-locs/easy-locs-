
-- Add contact columns to public_listings for direct contact buttons
ALTER TABLE public.public_listings
  ADD COLUMN IF NOT EXISTS contact_email text,
  ADD COLUMN IF NOT EXISTS contact_phone text,
  ADD COLUMN IF NOT EXISTS whatsapp_number text,
  ADD COLUMN IF NOT EXISTS telegram_username text;

-- Update get_listing_property RPC to also return contact info from listing + owner
CREATE OR REPLACE FUNCTION public.get_listing_property(p_listing_id uuid)
 RETURNS jsonb
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $$
  SELECT jsonb_build_object(
    'id', p.id,
    'label', p.label,
    'address', p.address,
    'city', p.city,
    'postal_code', p.postal_code,
    'country', p.country,
    'surface', p.surface,
    'rooms', p.rooms,
    'furnished', p.furnished,
    'photo_urls', p.photo_urls,
    'contact_email', COALESCE(pl.contact_email, o.email),
    'contact_phone', pl.contact_phone,
    'whatsapp_number', pl.whatsapp_number,
    'telegram_username', pl.telegram_username
  )
  FROM public.properties p
  INNER JOIN public.public_listings pl ON pl.property_id = p.id
  LEFT JOIN public.orgs o ON o.id = pl.org_id
  WHERE pl.id = p_listing_id AND pl.active = true
  LIMIT 1
$$;
