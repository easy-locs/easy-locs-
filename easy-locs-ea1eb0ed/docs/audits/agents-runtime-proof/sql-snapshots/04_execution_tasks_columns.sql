SELECT column_name, data_type, udt_schema||'.'||udt_name AS udt FROM information_schema.columns WHERE table_schema='system' AND table_name='execution_tasks' ORDER BY ordinal_position;
