
-- Allow any authenticated user to see open rides (no driver assigned yet)
DROP POLICY IF EXISTS rides_select_open ON public.rides;
CREATE POLICY rides_select_open ON public.rides
FOR SELECT
TO authenticated
USING (
  driver_user_id IS NULL
  AND status IN ('searching', 'scheduled')
);
