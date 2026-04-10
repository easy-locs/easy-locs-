
-- Fix rent_calls SELECT policy to allow tenants to see their unpaid rent calls too
DROP POLICY IF EXISTS "Org members can read rent calls" ON public.rent_calls;

CREATE POLICY "Org members and tenants can read rent calls"
  ON public.rent_calls FOR SELECT
  USING (
    is_org_member(auth.uid(), org_id) 
    OR (EXISTS (
      SELECT 1 FROM tenants 
      WHERE tenants.id = rent_calls.tenant_id 
      AND tenants.tenant_user_id = auth.uid()
    ))
  );

-- Allow tenants to read their org's basic info (name, email) for notifications
-- We use a restricted policy that only allows reading if user is a tenant in that org
DROP POLICY IF EXISTS "Tenants can read their org" ON public.orgs;

CREATE POLICY "Tenants can read their org"
  ON public.orgs FOR SELECT
  USING (
    is_org_member(auth.uid(), id)
    OR EXISTS (
      SELECT 1 FROM tenants
      WHERE tenants.org_id = orgs.id
      AND tenants.tenant_user_id = auth.uid()
    )
  );

-- Drop the old org read policy first, then recreate combined
DROP POLICY IF EXISTS "Org members can read org" ON public.orgs;

CREATE POLICY "Org members can read org"
  ON public.orgs FOR SELECT
  USING (
    is_org_member(auth.uid(), id)
    OR EXISTS (
      SELECT 1 FROM tenants
      WHERE tenants.org_id = orgs.id
      AND tenants.tenant_user_id = auth.uid()
    )
  );

-- Drop the duplicate
DROP POLICY IF EXISTS "Tenants can read their org" ON public.orgs;
