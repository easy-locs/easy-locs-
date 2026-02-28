-- Allow tenants to upload their own documents
CREATE POLICY "Tenants can upload own docs"
ON public.tenant_documents
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM tenants
    WHERE tenants.id = tenant_documents.tenant_id
    AND tenants.tenant_user_id = auth.uid()
  )
  AND uploaded_by = auth.uid()
);
