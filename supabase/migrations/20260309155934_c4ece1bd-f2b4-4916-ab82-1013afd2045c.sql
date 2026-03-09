-- 1. Drop the overly broad tenant SELECT policy
DROP POLICY IF EXISTS "Tenants can read org owner profiles" ON public.owner_profiles;

-- 2. Create a security definer function that returns only safe columns
CREATE OR REPLACE FUNCTION public.get_owner_profile_for_tenant(_org_id uuid)
RETURNS TABLE(
  id uuid,
  full_name text,
  company_name text,
  person_type text,
  address text,
  postal_code text,
  city text,
  country text,
  email text,
  phone text
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    op.id,
    op.full_name,
    op.company_name,
    op.person_type,
    op.address,
    op.postal_code,
    op.city,
    op.country,
    op.email,
    op.phone
  FROM owner_profiles op
  WHERE op.org_id = _org_id
  AND EXISTS (
    SELECT 1 FROM tenants t
    WHERE t.org_id = _org_id
    AND t.tenant_user_id = auth.uid()
  )
  LIMIT 1;
$$;