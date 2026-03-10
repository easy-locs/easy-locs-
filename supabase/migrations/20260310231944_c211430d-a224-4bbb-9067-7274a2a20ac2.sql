-- Drop the overly permissive ALL policy for org members
DROP POLICY IF EXISTS "Org members can manage bookings" ON public.marketplace_bookings;

-- Org members can SELECT bookings in their org (any role)
CREATE POLICY "Org members can read bookings"
ON public.marketplace_bookings
FOR SELECT
TO authenticated
USING (is_org_member(auth.uid(), org_id));

-- Only staff+ can UPDATE bookings (status changes, modifications, quotes)
CREATE POLICY "Staff+ can update bookings"
ON public.marketplace_bookings
FOR UPDATE
TO authenticated
USING (has_min_role(auth.uid(), org_id, 'staff'))
WITH CHECK (has_min_role(auth.uid(), org_id, 'staff'));

-- Only admin+ can DELETE bookings
CREATE POLICY "Admin+ can delete bookings"
ON public.marketplace_bookings
FOR DELETE
TO authenticated
USING (has_min_role(auth.uid(), org_id, 'admin'));

-- Also harden marketplace_services: only agent+ can write
DROP POLICY IF EXISTS "Org members can manage own services" ON public.marketplace_services;

CREATE POLICY "Org members can read services"
ON public.marketplace_services
FOR SELECT
TO authenticated
USING (is_org_member(auth.uid(), org_id));

CREATE POLICY "Agent+ can write services"
ON public.marketplace_services
FOR INSERT
TO authenticated
WITH CHECK (has_min_role(auth.uid(), org_id, 'agent'));

CREATE POLICY "Agent+ can update services"
ON public.marketplace_services
FOR UPDATE
TO authenticated
USING (has_min_role(auth.uid(), org_id, 'agent'))
WITH CHECK (has_min_role(auth.uid(), org_id, 'agent'));

CREATE POLICY "Admin+ can delete services"
ON public.marketplace_services
FOR DELETE
TO authenticated
USING (has_min_role(auth.uid(), org_id, 'admin'));