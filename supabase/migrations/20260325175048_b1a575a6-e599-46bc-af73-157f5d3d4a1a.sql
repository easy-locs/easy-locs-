
CREATE OR REPLACE FUNCTION public.fetch_and_lock_job()
RETURNS SETOF entity_pipeline_queue AS $$
BEGIN
  RETURN QUERY
  UPDATE entity_pipeline_queue
  SET status = 'processing',
      locked_at = now(),
      locked_by = 'worker_' || extract(epoch from now())::text,
      updated_at = now()
  WHERE id = (
    SELECT id FROM entity_pipeline_queue
    WHERE status = 'pending'
    ORDER BY priority DESC, created_at ASC
    FOR UPDATE SKIP LOCKED
    LIMIT 1
  )
  RETURNING *;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;
