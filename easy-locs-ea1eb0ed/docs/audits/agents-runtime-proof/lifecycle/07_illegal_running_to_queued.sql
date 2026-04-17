UPDATE system.execution_tasks SET status='queued'::system.execution_task_status WHERE id='dfee2ccc-6710-4fdb-9324-c1ccea12f9be' RETURNING id,status;
