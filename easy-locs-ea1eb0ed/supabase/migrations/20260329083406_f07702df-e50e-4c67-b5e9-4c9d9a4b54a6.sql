
-- SECURITY HARDENING - Verified columns only

-- 1. Restrict profiles to own profile (CRITICAL)
DROP POLICY IF EXISTS "Authenticated users can look up profiles" ON public.profiles;
DROP POLICY IF EXISTS "Users can read own profile" ON public.profiles;

CREATE POLICY "Users can read own profile"
  ON public.profiles FOR SELECT TO authenticated
  USING (id = auth.uid());

CREATE OR REPLACE FUNCTION public.get_display_profile(target_id uuid)
RETURNS TABLE(id uuid, first_name text, last_name text, username text)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT p.id, p.first_name, p.last_name, p.username
  FROM public.profiles p WHERE p.id = target_id;
$$;

-- 2. Fix module_health
DROP POLICY IF EXISTS "module_health_auth_all" ON public.module_health;
CREATE POLICY "Admin read module health"
  ON public.module_health FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- 3. Fix platform_actions_log
DROP POLICY IF EXISTS "Auth can read platform_actions_log" ON public.platform_actions_log;
DROP POLICY IF EXISTS "Auth can insert platform_actions_log" ON public.platform_actions_log;
CREATE POLICY "Admin read platform actions"
  ON public.platform_actions_log FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));
