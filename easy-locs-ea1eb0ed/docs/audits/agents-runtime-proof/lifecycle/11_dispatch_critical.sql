SELECT (system.dispatch_execution_task(
  p_type:='SCHEMA_MIGRATION', p_domain:='audit', p_risk_level:='CRITICAL'::system.execution_task_risk,
  p_status:='queued'::system.execution_task_status,
  p_payload:='{"reason":"audit critical-block proof"}'::jsonb,
  p_requested_by:='audit-script', p_idempotency_key:='audit-795-critical'
)).id AS task_id;
