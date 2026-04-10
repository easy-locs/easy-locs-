-- Fix 1: Make booking-documents bucket private
UPDATE storage.buckets SET public = false WHERE id = 'booking-documents';

-- Fix 2: Drop the open SELECT policy
DROP POLICY IF EXISTS "Anyone can view booking documents" ON storage.objects;

-- Fix 3: Add org-scoped SELECT policy for authenticated users
CREATE POLICY "Org members can view booking documents"
ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'booking-documents'
  AND is_org_member(auth.uid(), (storage.foldername(name))[1]::uuid)
);

-- Keep the existing INSERT policy for public uploads (guests need to upload ID docs)