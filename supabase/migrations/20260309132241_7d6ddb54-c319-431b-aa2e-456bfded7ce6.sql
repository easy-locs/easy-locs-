-- Remove the public SELECT policy that exposes email/phone
DROP POLICY IF EXISTS "Anyone can read active providers" ON public.service_providers;

-- Authenticated users can read active providers (still includes email/phone for org use)
CREATE POLICY "Authenticated can read active providers"
ON public.service_providers FOR SELECT TO authenticated
USING (active = true);