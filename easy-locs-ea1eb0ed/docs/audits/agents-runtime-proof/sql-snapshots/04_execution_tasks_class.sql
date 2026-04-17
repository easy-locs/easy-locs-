-- captured_at: 2026-04-16T23:46:15Z
-- http: 201
-- query:
SELECT to_regclass('system.execution_tasks')::text AS execution_tasks, to_regclass('system.execution_locks')::text AS execution_locks, to_regclass('public.agent_command_history')::text AS agent_command_history, to_regclass('public.engine_run_logs')::text AS engine_run_logs, to_regclass('public.sentinel_telemetry')::text AS sentinel_telemetry;
