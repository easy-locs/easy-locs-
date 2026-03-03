-- Tighten booking_requests INSERT policy: validate data integrity instead of wide-open true
-- Still allows unauthenticated inserts (public booking form) but ensures data makes sense
DROP POLICY IF EXISTS "Anyone can create booking requests" ON public.booking_requests;

CREATE POLICY "Anyone can create booking requests"
ON public.booking_requests
FOR INSERT
WITH CHECK (
  guest_name IS NOT NULL AND guest_name <> '' AND
  guest_email IS NOT NULL AND guest_email <> '' AND
  check_in IS NOT NULL AND
  check_out IS NOT NULL AND
  check_out > check_in AND
  listing_id IS NOT NULL AND
  property_id IS NOT NULL AND
  org_id IS NOT NULL AND
  status = 'pending'
);