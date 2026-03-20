
-- Fix search_path on all public functions that don't have it set
DO $$
DECLARE
  fn record;
BEGIN
  FOR fn IN
    SELECT p.proname, pg_get_function_identity_arguments(p.oid) as args
    FROM pg_proc p
    JOIN pg_namespace n ON p.pronamespace = n.oid
    WHERE n.nspname = 'public'
      AND p.proname NOT LIKE 'pg_%'
      AND NOT EXISTS (
        SELECT 1 FROM pg_options_to_table(p.proconfig)
        WHERE option_name = 'search_path'
      )
  LOOP
    BEGIN
      EXECUTE format('ALTER FUNCTION public.%I(%s) SET search_path = public', fn.proname, fn.args);
    EXCEPTION WHEN OTHERS THEN
      RAISE NOTICE 'Skipped %: %', fn.proname, SQLERRM;
    END;
  END LOOP;
END $$;
