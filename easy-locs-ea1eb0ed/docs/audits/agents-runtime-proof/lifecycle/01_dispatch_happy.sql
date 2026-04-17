SELECT (system.dispatch_execution_task(
  p_type:='ANALYSIS', p_domain:='audit', p_risk_level:='SAFE'::system.execution_task_risk,
  p_status:='queued'::system.execution_task_status,
  p_payload:='{"note":"audit task #795 happy path"}'::jsonb,
  p_requested_by:='audit-script', p_idempotency_key:='audit-795-happy'
)).id AS task_id;
