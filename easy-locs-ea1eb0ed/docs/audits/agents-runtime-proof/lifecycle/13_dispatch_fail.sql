SELECT (system.dispatch_execution_task(
  p_type:='VALIDATION', p_domain:='audit', p_risk_level:='SAFE'::system.execution_task_risk,
  p_status:='queued'::system.execution_task_status,
  p_payload:='{"note":"failure path proof"}'::jsonb,
  p_requested_by:='audit-script', p_idempotency_key:='audit-795-fail',
  p_max_attempts:=3
)).id AS task_id;
