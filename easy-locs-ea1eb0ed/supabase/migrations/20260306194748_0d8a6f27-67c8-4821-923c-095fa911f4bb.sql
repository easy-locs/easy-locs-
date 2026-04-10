
-- Allow tenants to read owner_profiles of their org (for manual SEPA bank info)
CREATE POLICY "Tenants can read org owner profiles" ON public.owner_profiles
FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.tenants
    WHERE tenants.org_id = owner_profiles.org_id
      AND tenants.tenant_user_id = auth.uid()
  )
);
