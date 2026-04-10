
-- Add photo_urls column to properties
ALTER TABLE public.properties ADD COLUMN IF NOT EXISTS photo_urls jsonb DEFAULT '[]'::jsonb;

-- Create public storage bucket for property photos
INSERT INTO storage.buckets (id, name, public) VALUES ('property-photos', 'property-photos', true)
ON CONFLICT (id) DO NOTHING;

-- Anyone can view property photos (public bucket)
CREATE POLICY "Public can view property photos"
ON storage.objects FOR SELECT
USING (bucket_id = 'property-photos');

-- Authenticated users can upload photos to their org folder
CREATE POLICY "Authenticated users can upload property photos"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'property-photos' AND auth.uid() IS NOT NULL);

-- Authenticated users can delete their own photos
CREATE POLICY "Authenticated users can delete property photos"
ON storage.objects FOR DELETE
USING (bucket_id = 'property-photos' AND auth.uid() IS NOT NULL);

-- Create public_listings table for shareable links
CREATE TABLE public.public_listings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id uuid NOT NULL REFERENCES public.properties(id) ON DELETE CASCADE,
  org_id uuid NOT NULL REFERENCES public.orgs(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  slug text NOT NULL UNIQUE,
  title text NOT NULL DEFAULT '',
  description text DEFAULT '',
  price_per_night numeric DEFAULT 0,
  min_nights integer DEFAULT 1,
  max_guests integer DEFAULT 4,
  amenities jsonb DEFAULT '[]'::jsonb,
  active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- RLS for public_listings
ALTER TABLE public.public_listings ENABLE ROW LEVEL SECURITY;

-- Anyone can read active listings (public page)
CREATE POLICY "Anyone can read active listings"
ON public.public_listings FOR SELECT
USING (active = true);

-- Org members can manage listings
CREATE POLICY "Org members can insert listings"
ON public.public_listings FOR INSERT
WITH CHECK (is_org_member(auth.uid(), org_id) AND user_id = auth.uid());

CREATE POLICY "Org members can update listings"
ON public.public_listings FOR UPDATE
USING (is_org_member(auth.uid(), org_id));

CREATE POLICY "Org members can delete listings"
ON public.public_listings FOR DELETE
USING (is_org_member(auth.uid(), org_id));

-- Create booking_requests table for guest submissions
CREATE TABLE public.booking_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  listing_id uuid NOT NULL REFERENCES public.public_listings(id) ON DELETE CASCADE,
  property_id uuid NOT NULL REFERENCES public.properties(id) ON DELETE CASCADE,
  org_id uuid NOT NULL REFERENCES public.orgs(id) ON DELETE CASCADE,
  guest_name text NOT NULL,
  guest_email text NOT NULL,
  guest_phone text DEFAULT '',
  check_in date NOT NULL,
  check_out date NOT NULL,
  guests_count integer DEFAULT 1,
  message text DEFAULT '',
  status text NOT NULL DEFAULT 'pending',
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.booking_requests ENABLE ROW LEVEL SECURITY;

-- Anyone can submit a booking request (public form)
CREATE POLICY "Anyone can create booking requests"
ON public.booking_requests FOR INSERT
WITH CHECK (true);

-- Org members can read/update/delete booking requests
CREATE POLICY "Org members can read booking requests"
ON public.booking_requests FOR SELECT
USING (is_org_member(auth.uid(), org_id));

CREATE POLICY "Org members can update booking requests"
ON public.booking_requests FOR UPDATE
USING (is_org_member(auth.uid(), org_id));

CREATE POLICY "Org members can delete booking requests"
ON public.booking_requests FOR DELETE
USING (is_org_member(auth.uid(), org_id));
