DELETE FROM system.execution_locks; DELETE FROM system.execution_tasks WHERE requested_by IN ('audit-script','audit-script-retry','audit-script-blocked','audit-script-idem');
