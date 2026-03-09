-- Drop the old overly-permissive policy
DROP POLICY IF EXISTS "Anyone can upload booking documents" ON storage.objects;

-- Restrict uploads to paths matching a recent booking request ID
CREATE POLICY "Booking docs restricted to recent bookings" ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'booking-documents'
  AND (storage.foldername(name))[1] IN (
    SELECT id::text FROM public.booking_requests
    WHERE created_at > now() - interval '24 hours'
  )
);