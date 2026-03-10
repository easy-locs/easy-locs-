-- Fix audit_logs: restrict INSERT to own user_id + org membership
DROP POLICY IF EXISTS "Authenticated can insert audit logs" ON public.audit_logs;

CREATE POLICY "Org members can insert own audit logs"
ON public.audit_logs FOR INSERT
WITH CHECK (
  auth.uid() = user_id
  AND EXISTS (
    SELECT 1 FROM public.org_members om
    WHERE om.user_id = auth.uid()
      AND om.org_id = audit_logs.org_id
  )
);