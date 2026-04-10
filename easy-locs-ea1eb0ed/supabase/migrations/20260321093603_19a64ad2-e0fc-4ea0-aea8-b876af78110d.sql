-- Add UPDATE policy for call_logs so caller/callee can update status
CREATE POLICY "call_logs_participants_update"
ON public.call_logs
FOR UPDATE
TO authenticated
USING (
  caller_orbit_id = auth.uid()::text
  OR receiver_orbit_id = auth.uid()::text
)
WITH CHECK (
  caller_orbit_id = auth.uid()::text
  OR receiver_orbit_id = auth.uid()::text
);