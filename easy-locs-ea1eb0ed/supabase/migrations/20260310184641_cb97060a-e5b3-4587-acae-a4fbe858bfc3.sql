-- Fix service_providers: tighten INSERT to org admins/owners, and restrict SELECT PII exposure
DROP POLICY IF EXISTS "Authenticated can insert providers" ON public.service_providers;
DROP POLICY IF EXISTS "Authenticated can read active providers" ON public.service_providers;

-- SELECT: active providers visible to org members only (restricts PII access)
CREATE POLICY "Org members can read active providers"
ON public.service_providers FOR SELECT
USING (
  active = true AND EXISTS (
    SELECT 1 FROM public.org_members om
    WHERE om.user_id = auth.uid()
  )
);

-- INSERT: only org admins/owners can create providers
CREATE POLICY "Org admins can insert providers"
ON public.service_providers FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.org_members om
    WHERE om.user_id = auth.uid()
    AND om.role IN ('owner', 'admin')
  )
);

-- UPDATE: only org admins/owners
CREATE POLICY "Org admins can update providers"
ON public.service_providers FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.org_members om
    WHERE om.user_id = auth.uid()
    AND om.role IN ('owner', 'admin')
  )
);

-- DELETE: only org admins/owners
CREATE POLICY "Org admins can delete providers"
ON public.service_providers FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM public.org_members om
    WHERE om.user_id = auth.uid()
    AND om.role IN ('owner', 'admin')
  )
);