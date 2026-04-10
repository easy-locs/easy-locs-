CREATE POLICY "Insert own audit report"
ON public.audit_reports
FOR INSERT
TO authenticated
WITH CHECK (created_by = auth.uid());