-- Create products storage bucket
INSERT INTO storage.buckets (id, name, public)
VALUES ('products', 'products', true)
ON CONFLICT (id) DO NOTHING;

-- Allow authenticated users to upload files
CREATE POLICY "Authenticated users can upload product media"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'products');

-- Allow authenticated users to update their own uploads
CREATE POLICY "Users can update own product media"
ON storage.objects FOR UPDATE TO authenticated
USING (bucket_id = 'products' AND (storage.foldername(name))[1] = auth.uid()::text);

-- Allow authenticated users to delete their own uploads
CREATE POLICY "Users can delete own product media"
ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'products' AND (storage.foldername(name))[1] = auth.uid()::text);

-- Allow public read access
CREATE POLICY "Public read access for product media"
ON storage.objects FOR SELECT TO public
USING (bucket_id = 'products');