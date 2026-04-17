-- Bridging fix applied 2026-04-16T23:53:34Z
-- Production had has_role(uuid,text) only; autonomous-agent migrations require has_role(uuid,public.app_role).
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $func$
  SELECT public.has_role(_user_id, _role::text);
$func$;
