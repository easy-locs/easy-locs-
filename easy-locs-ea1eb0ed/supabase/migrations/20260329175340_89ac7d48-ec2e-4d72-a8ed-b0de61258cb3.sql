
-- 1. Make chat-attachments bucket private
UPDATE storage.buckets SET public = false WHERE id = 'chat-attachments';

-- 2. Drop overly permissive policies
DROP POLICY IF EXISTS "Public read access for chat attachments" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can read chat media" ON storage.objects;

-- 3. Owner-only read for chat-attachments (signed URLs handle sharing)
CREATE POLICY "Owner can read own chat attachments"
ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'chat-attachments' AND owner = auth.uid());

-- 4. Owner-only read for chat-media (signed URLs handle sharing)
CREATE POLICY "Owner can read own chat media"
ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'chat-media' AND owner = auth.uid());
