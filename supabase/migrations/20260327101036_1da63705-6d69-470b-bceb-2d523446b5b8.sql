
-- RLS policies (drop if exists first to be idempotent)
DO $$ BEGIN
  DROP POLICY IF EXISTS "svc_insert_scrape_runs" ON public.merchant_scrape_runs;
  DROP POLICY IF EXISTS "svc_insert_source_snapshots" ON public.merchant_source_snapshots;
  DROP POLICY IF EXISTS "svc_insert_ingestion_queue" ON public.source_ingestion_queue;
  DROP POLICY IF EXISTS "svc_insert_menu_snapshots" ON public.merchant_menu_snapshots;
  DROP POLICY IF EXISTS "svc_insert_visual_audit" ON public.merchant_visual_audit;
END $$;

CREATE POLICY "svc_insert_scrape_runs" ON public.merchant_scrape_runs FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "svc_insert_source_snapshots" ON public.merchant_source_snapshots FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "svc_insert_ingestion_queue" ON public.source_ingestion_queue FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "svc_insert_menu_snapshots" ON public.merchant_menu_snapshots FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "svc_insert_visual_audit" ON public.merchant_visual_audit FOR INSERT TO authenticated WITH CHECK (true);
