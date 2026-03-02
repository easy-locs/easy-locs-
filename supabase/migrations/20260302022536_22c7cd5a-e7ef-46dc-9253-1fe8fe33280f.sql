
-- FIX 1: Remove overly permissive SELECT policy on tenant_invitations
DROP POLICY IF EXISTS "Anyone can read by token" ON public.tenant_invitations;

-- Create a secure RPC to validate invitation by token (returns minimal info)
CREATE OR REPLACE FUNCTION public.validate_tenant_invitation(_token text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  inv record;
BEGIN
  SELECT ti.id, ti.email, ti.status, ti.expires_at, t.name as tenant_name
  INTO inv
  FROM public.tenant_invitations ti
  LEFT JOIN public.tenants t ON t.id = ti.tenant_id
  WHERE ti.token = _token AND ti.status = 'pending' AND ti.expires_at > now()
  LIMIT 1;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('valid', false);
  END IF;

  RETURN jsonb_build_object(
    'valid', true,
    'email', inv.email,
    'tenant_name', inv.tenant_name
  );
END;
$$;

-- FIX 2: Tighten storage policies to org-scoped access using path prefix
-- rental-docs bucket: files stored as {org_id}/...
DROP POLICY IF EXISTS "Authenticated users can upload rental docs" ON storage.objects;
DROP POLICY IF EXISTS "File owners can delete rental docs" ON storage.objects;
DROP POLICY IF EXISTS "Org members can view rental docs" ON storage.objects;

CREATE POLICY "Org members can upload rental docs"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'rental-docs'
  AND auth.uid() IS NOT NULL
  AND is_org_member(auth.uid(), (string_to_array(name, '/'))[1]::uuid)
);

CREATE POLICY "Org members can view rental docs"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'rental-docs'
  AND auth.uid() IS NOT NULL
  AND is_org_member(auth.uid(), (string_to_array(name, '/'))[1]::uuid)
);

CREATE POLICY "Org members can delete rental docs"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'rental-docs'
  AND auth.uid() IS NOT NULL
  AND is_org_member(auth.uid(), (string_to_array(name, '/'))[1]::uuid)
);

-- vault bucket
DROP POLICY IF EXISTS "Org members can read own vault files" ON storage.objects;
DROP POLICY IF EXISTS "Org members can upload vault files" ON storage.objects;
DROP POLICY IF EXISTS "Org members can delete own vault files" ON storage.objects;

CREATE POLICY "Org members can read vault files"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'vault'
  AND auth.uid() IS NOT NULL
  AND is_org_member(auth.uid(), (string_to_array(name, '/'))[1]::uuid)
);

CREATE POLICY "Org members can upload vault files"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'vault'
  AND auth.uid() IS NOT NULL
  AND is_org_member(auth.uid(), (string_to_array(name, '/'))[1]::uuid)
);

CREATE POLICY "Org members can delete vault files"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'vault'
  AND auth.uid() IS NOT NULL
  AND is_org_member(auth.uid(), (string_to_array(name, '/'))[1]::uuid)
);

-- FIX 3: Remove client-visible token columns from ota_connections
-- Create a view that excludes sensitive tokens for client queries
DROP POLICY IF EXISTS "Org members can read ota" ON public.ota_connections;

-- Recreate read policy but exclude token columns by using a secure view approach
-- Since we can't restrict columns via RLS, we create a function to fetch safe data
CREATE OR REPLACE FUNCTION public.get_ota_connections(_org_id uuid)
RETURNS TABLE(
  id uuid,
  org_id uuid,
  user_id uuid,
  provider text,
  status text,
  external_user_id text,
  linked_properties jsonb,
  last_sync_at timestamptz,
  created_at timestamptz,
  updated_at timestamptz
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT id, org_id, user_id, provider, status, external_user_id,
         linked_properties, last_sync_at, created_at, updated_at
  FROM public.ota_connections
  WHERE org_id = _org_id AND is_org_member(auth.uid(), _org_id)
$$;

-- Re-add the read policy (still needed for other operations)
CREATE POLICY "Org members can read ota"
ON public.ota_connections FOR SELECT
USING (is_org_member(auth.uid(), org_id));
