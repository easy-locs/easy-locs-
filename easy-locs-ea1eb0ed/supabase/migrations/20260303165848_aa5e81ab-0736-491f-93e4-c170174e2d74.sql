-- Drop direct SELECT policy that exposes tokens to clients
DROP POLICY IF EXISTS "Owner can read own ota connections" ON public.ota_connections;

-- All reads should go through get_ota_connections() RPC which excludes sensitive token columns