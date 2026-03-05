
-- Drop the overly broad policies
DROP POLICY IF EXISTS "Authenticated users can upload property photos" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can delete property photos" ON storage.objects;

-- Scoped upload: only org members can upload to their org's folder
CREATE POLICY "Org members can upload property photos"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'property-photos'
  AND auth.uid() IS NOT NULL
  AND is_org_member(auth.uid(), (string_to_array(name, '/'))[1]::uuid)
);

-- Scoped delete: only org members can delete from their org's folder
CREATE POLICY "Org members can delete property photos"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'property-photos'
  AND auth.uid() IS NOT NULL
  AND is_org_member(auth.uid(), (string_to_array(name, '/'))[1]::uuid)
);
