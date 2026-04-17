-- Strengthen idempotency: a replay with the same key after success returns
-- the original row instead of creating a new one. (Original RPC excluded
-- terminal states from the lookup; we add 'succeeded' so replay-after-
-- success is truly idempotent.)
DO $$
DECLARE
  v_src TEXT;
  v_new TEXT;
BEGIN
  SELECT pg_get_functiondef(p.oid) INTO v_src
    FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
   WHERE n.nspname='system' AND p.proname='dispatch_execution_task';
  v_new := replace(
    v_src,
    $list$AND status IN (
         'pending_review','approved','queued','running','blocked','failed'
       )$list$,
    $list$AND status IN (
         'pending_review','approved','queued','running','blocked','failed','succeeded'
       )$list$);
  EXECUTE v_new;
END $$;
