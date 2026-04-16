CREATE OR REPLACE FUNCTION public.reconcile_cron_responses()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_rec RECORD;
  v_response RECORD;
  v_updated_count integer := 0;
BEGIN
  FOR v_rec IN
    SELECT id, job_name, metadata
    FROM cron_execution_log
    WHERE status = 'success'
      AND metadata IS NOT NULL
      AND metadata ? 'request_id'
      AND started_at >= now() - interval '24 hours'
    ORDER BY started_at DESC
    LIMIT 200
    FOR UPDATE SKIP LOCKED
  LOOP
    BEGIN
      SELECT status_code, error_msg, timed_out
      INTO v_response
      FROM net._http_response
      WHERE id = (v_rec.metadata->>'request_id')::bigint;

      IF v_response IS NULL THEN
        IF v_rec.metadata->>'started_at' IS NOT NULL AND
           now() - (v_rec.metadata->>'started_at')::timestamptz > interval '10 minutes' THEN
          UPDATE cron_execution_log
          SET status = 'failure',
              metadata = v_rec.metadata || jsonb_build_object('reconciliation', 'stale_no_response', 'reconciled_at', now()::text)
          WHERE id = v_rec.id;
          v_updated_count := v_updated_count + 1;
        END IF;
        CONTINUE;
      END IF;

      IF v_response.timed_out OR v_response.error_msg IS NOT NULL OR
         v_response.status_code < 200 OR v_response.status_code >= 300 THEN
        UPDATE cron_execution_log
        SET status = 'failure',
            metadata = v_rec.metadata || jsonb_build_object(
              'reconciliation', 'edge_function_failure',
              'http_status', COALESCE(v_response.status_code::text, 'unknown'),
              'error_msg', COALESCE(v_response.error_msg, ''),
              'timed_out', COALESCE(v_response.timed_out, false),
              'reconciled_at', now()::text
            )
        WHERE id = v_rec.id;
        v_updated_count := v_updated_count + 1;
      END IF;
    EXCEPTION WHEN OTHERS THEN
      RAISE NOTICE 'reconcile_cron_responses error for %: %', v_rec.id, SQLERRM;
    END;
  END LOOP;

  IF v_updated_count > 0 THEN
    RAISE NOTICE 'reconcile_cron_responses: updated % records', v_updated_count;
  END IF;
END;
$$;

REVOKE ALL ON FUNCTION public.reconcile_cron_responses() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.reconcile_cron_responses() TO service_role;

SELECT cron.schedule(
  'cron-response-reconcile',
  '*/3 * * * *',
  $$SELECT public.reconcile_cron_responses()$$
);
