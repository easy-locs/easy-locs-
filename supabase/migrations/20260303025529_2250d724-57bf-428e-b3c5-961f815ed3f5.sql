
-- =====================================================
-- FIX 1: Revoke anon SELECT on profiles and tenants
-- These tables should only be accessed by authenticated users
-- =====================================================
REVOKE SELECT ON public.profiles FROM anon;
REVOKE INSERT ON public.profiles FROM anon;
REVOKE UPDATE ON public.profiles FROM anon;

REVOKE SELECT ON public.tenants FROM anon;
REVOKE INSERT ON public.tenants FROM anon;
REVOKE UPDATE ON public.tenants FROM anon;
REVOKE DELETE ON public.tenants FROM anon;

-- =====================================================
-- FIX 2: internal_config - add restrictive policy (service role only)
-- RLS is enabled but no policies exist. Add a deny-all policy.
-- =====================================================
REVOKE ALL ON public.internal_config FROM anon;
REVOKE ALL ON public.internal_config FROM authenticated;

-- =====================================================
-- FIX 3: Protect OTA tokens from direct client SELECT
-- Revoke direct SELECT from authenticated on ota_connections
-- and create a view without sensitive columns
-- =====================================================
REVOKE SELECT ON public.ota_connections FROM anon;

-- Drop existing SELECT policy that exposes tokens
DROP POLICY IF EXISTS "Org members can read ota" ON public.ota_connections;

-- Create a new SELECT policy that only allows the owner to see their own connections
-- (tokens are only needed by the user who created the connection)
CREATE POLICY "Owner can read own ota connections"
ON public.ota_connections FOR SELECT
TO authenticated
USING (user_id = auth.uid() AND is_org_member(auth.uid(), org_id));
