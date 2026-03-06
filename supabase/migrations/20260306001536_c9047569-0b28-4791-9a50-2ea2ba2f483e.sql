-- Restrict internal_config: drop the overly broad SELECT policy
-- Config values should only be read by service role (edge functions)
DROP POLICY IF EXISTS "Authenticated can read config" ON public.internal_config;