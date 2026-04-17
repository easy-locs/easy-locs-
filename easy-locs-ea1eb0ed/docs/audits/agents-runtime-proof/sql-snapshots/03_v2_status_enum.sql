SELECT enumlabel FROM pg_enum e JOIN pg_type t ON e.enumtypid=t.oid JOIN pg_namespace n ON t.typnamespace=n.oid WHERE n.nspname='system' AND t.typname='execution_task_status' ORDER BY enumsortorder;
