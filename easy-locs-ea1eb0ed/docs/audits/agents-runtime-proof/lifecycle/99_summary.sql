SELECT id,type,status,risk_level,attempt_count,error,blocked_reason,idempotency_key,created_at,updated_at FROM system.execution_tasks WHERE requested_by='audit-script' ORDER BY created_at;
