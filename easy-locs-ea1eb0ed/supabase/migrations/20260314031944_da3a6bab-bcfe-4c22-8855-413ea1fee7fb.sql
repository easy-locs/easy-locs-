
-- Drop old restrictive insert policy
DROP POLICY IF EXISTS "Org members can insert own audit logs" ON public.audit_logs;

-- Create new insert policy: allow user to insert their own logs (with or without org_id)
CREATE POLICY "Users can insert own audit logs"
ON public.audit_logs
FOR INSERT
TO authenticated
WITH CHECK (
  auth.uid() = user_id
  AND (
    org_id IS NULL
    OR EXISTS (
      SELECT 1 FROM org_members om
      WHERE om.user_id = auth.uid() AND om.org_id = audit_logs.org_id
    )
  )
);
