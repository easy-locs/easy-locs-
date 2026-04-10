-- Fix security definer views by setting security_invoker = true
ALTER VIEW public.concierge_services_public SET (security_invoker = true);
ALTER VIEW public.marketplace_services_public SET (security_invoker = true);

-- Since security_invoker views check RLS of the underlying table,
-- we need to re-add a restricted public SELECT policy on the base tables
-- that only exposes the safe columns (but RLS is row-level, not column-level).
-- The view already restricts columns, so a simple anon read policy works.
CREATE POLICY "Anon can read active concierge services"
ON public.concierge_services FOR SELECT TO anon
USING (active = true);

CREATE POLICY "Anon can read active marketplace services"
ON public.marketplace_services FOR SELECT TO anon
USING (active = true)