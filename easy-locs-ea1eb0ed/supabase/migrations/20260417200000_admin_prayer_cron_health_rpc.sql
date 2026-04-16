CREATE OR REPLACE FUNCTION public.admin_check_prayer_cron_health()
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _uid uuid := auth.uid();
  _is_admin boolean;
BEGIN
  IF _uid IS NULL THEN
    RAISE EXCEPTION 'authentication required';
  END IF;

  SELECT public.has_role(_uid, 'admin') INTO _is_admin;

  IF NOT COALESCE(_is_admin, false) THEN
    RAISE EXCEPTION 'admin role required';
  END IF;

  RETURN public.check_prayer_cron_health();
END;
$$;

REVOKE ALL ON FUNCTION public.admin_check_prayer_cron_health() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_check_prayer_cron_health() TO authenticated;
