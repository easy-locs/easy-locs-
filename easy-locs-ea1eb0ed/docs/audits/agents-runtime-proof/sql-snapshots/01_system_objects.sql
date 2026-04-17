SELECT n.nspname||'.'||c.relname AS rel, c.relkind FROM pg_class c JOIN pg_namespace n ON c.relnamespace=n.oid WHERE n.nspname='system' ORDER BY 1;
