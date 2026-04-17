UPDATE system.execution_tasks SET status='running'::system.execution_task_status, attempt_count=attempt_count+1 WHERE id='8f612c2d-f2d3-48b4-ab55-6c2ea3967a3b' RETURNING id,status,attempt_count;
