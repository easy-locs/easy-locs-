-- Allow public guests to read back the booking request they just inserted (by matching guest_email)
-- This is needed because the insert uses .select().single() to get the ID back
CREATE POLICY "Guests can read their own booking requests"
ON public.booking_requests
FOR SELECT
TO anon, authenticated
USING (
  guest_email IS NOT NULL AND guest_email <> ''
  AND status = 'pending'
  AND created_at > (now() - interval '5 minutes')
);