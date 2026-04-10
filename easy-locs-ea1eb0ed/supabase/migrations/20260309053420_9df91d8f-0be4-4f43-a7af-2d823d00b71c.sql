-- Fix 1: Drop overly broad concierge_orders public SELECT policy
DROP POLICY IF EXISTS "Public can read own order by session" ON public.concierge_orders;

-- Create a secure function for order lookup by stripe session ID
CREATE OR REPLACE FUNCTION public.get_order_by_session(_session_id text)
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT jsonb_build_object(
    'id', o.id,
    'status', o.status,
    'payment_status', o.payment_status,
    'total_price', o.total_price,
    'currency', o.currency,
    'service_date', o.service_date,
    'service_time', o.service_time,
    'guest_name', o.guest_name,
    'guest_email', o.guest_email,
    'quantity', o.quantity,
    'service_id', o.service_id
  )
  FROM public.concierge_orders o
  WHERE o.stripe_session_id = _session_id
  LIMIT 1
$$;

-- Fix 2: Remove self-join vulnerability from org_members INSERT policy
DROP POLICY IF EXISTS "Owners can manage members" ON public.org_members;

CREATE POLICY "Owners can manage members" ON public.org_members
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.orgs
      WHERE orgs.id = org_members.org_id
        AND orgs.owner_user_id = auth.uid()
    )
  );