-- Create a dedicated bucket for public booking ID documents
INSERT INTO storage.buckets (id, name, public, file_size_limit)
VALUES ('booking-documents', 'booking-documents', true, 10485760)
ON CONFLICT (id) DO NOTHING;

-- Allow anyone (including anonymous/unauthenticated) to upload booking documents
CREATE POLICY "Anyone can upload booking documents"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'booking-documents'
);

-- Allow anyone to view booking documents (providers need access)
CREATE POLICY "Anyone can view booking documents"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'booking-documents'
);