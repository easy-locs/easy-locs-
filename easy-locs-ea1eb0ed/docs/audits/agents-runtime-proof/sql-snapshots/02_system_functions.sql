SELECT n.nspname||'.'||p.proname AS fn, pg_get_function_identity_arguments(p.oid) AS args FROM pg_proc p JOIN pg_namespace n ON p.pronamespace=n.oid WHERE n.nspname='system' ORDER BY 1;
