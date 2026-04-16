CREATE TABLE IF NOT EXISTS public.search_sync_log (
  id            BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  sync_type     TEXT NOT NULL DEFAULT 'incremental',
  status        TEXT NOT NULL DEFAULT 'running',
  indexes_synced TEXT[] NOT NULL DEFAULT '{}',
  total_documents INTEGER NOT NULL DEFAULT 0,
  queue_processed INTEGER NOT NULL DEFAULT 0,
  errors        INTEGER NOT NULL DEFAULT 0,
  error_message TEXT,
  started_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at  TIMESTAMPTZ,
  duration_ms   INTEGER,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_search_sync_log_created_at
  ON public.search_sync_log (created_at DESC);

CREATE INDEX IF NOT EXISTS idx_search_sync_log_status
  ON public.search_sync_log (status);

ALTER TABLE public.search_sync_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY search_sync_log_service_role ON public.search_sync_log
  FOR ALL USING (
    (current_setting('role', true)) = 'service_role'
    OR (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'admin'
  );

CREATE TABLE IF NOT EXISTS public.search_sync_queue (
  id            BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  entity_type   TEXT NOT NULL,
  entity_id     TEXT NOT NULL,
  operation     TEXT NOT NULL DEFAULT 'upsert',
  queued_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  processed_at  TIMESTAMPTZ,
  CONSTRAINT search_sync_queue_op_check CHECK (operation IN ('upsert', 'delete'))
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_search_sync_queue_dedup
  ON public.search_sync_queue (entity_type, entity_id, operation)
  WHERE processed_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_search_sync_queue_unprocessed
  ON public.search_sync_queue (queued_at)
  WHERE processed_at IS NULL;

ALTER TABLE public.search_sync_queue ENABLE ROW LEVEL SECURITY;

CREATE POLICY search_sync_queue_service_role ON public.search_sync_queue
  FOR ALL USING (
    (current_setting('role', true)) = 'service_role'
  );

CREATE POLICY search_sync_queue_admin_read ON public.search_sync_queue
  FOR SELECT USING (
    (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'admin'
  );

CREATE OR REPLACE FUNCTION public.queue_search_sync()
RETURNS TRIGGER AS $$
DECLARE
  v_entity_type TEXT;
  v_entity_id TEXT;
  v_operation TEXT;
BEGIN
  v_entity_type := CASE TG_TABLE_NAME
    WHEN 'storefront_pages' THEN 'shop'
    WHEN 'seed_products' THEN 'product'
    WHEN 'properties' THEN 'property'
    WHEN 'listings' THEN 'service'
    WHEN 'profiles' THEN 'profile'
    ELSE TG_TABLE_NAME
  END;

  IF TG_OP = 'DELETE' THEN
    v_entity_id := OLD.id::TEXT;
    v_operation := 'delete';
  ELSE
    v_entity_id := NEW.id::TEXT;
    v_operation := 'upsert';
  END IF;

  INSERT INTO public.search_sync_queue (entity_type, entity_id, operation)
  VALUES (v_entity_type, v_entity_id, v_operation)
  ON CONFLICT (entity_type, entity_id, operation) WHERE processed_at IS NULL
  DO UPDATE SET queued_at = now();

  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DO $$
DECLARE
  tbl TEXT;
BEGIN
  FOR tbl IN SELECT unnest(ARRAY['storefront_pages', 'seed_products', 'properties', 'listings', 'profiles'])
  LOOP
    EXECUTE format(
      'DROP TRIGGER IF EXISTS trg_search_sync_%I ON public.%I',
      tbl, tbl
    );
    EXECUTE format(
      'CREATE TRIGGER trg_search_sync_%I
       AFTER INSERT OR UPDATE OR DELETE ON public.%I
       FOR EACH ROW EXECUTE FUNCTION public.queue_search_sync()',
      tbl, tbl
    );
  END LOOP;
END;
$$;
