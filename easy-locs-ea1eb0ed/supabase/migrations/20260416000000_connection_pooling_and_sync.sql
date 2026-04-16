-- Connection Pooling Optimization & Search Sync Triggers
-- Optimizes pgbouncer settings and adds database triggers for search engine sync

-- ═══ Search Engine Sync Notification Triggers ═══
-- These triggers fire NOTIFY events that external sync workers can listen to
-- for keeping Meilisearch indexes in sync with PostgreSQL source of truth.

CREATE OR REPLACE FUNCTION public.notify_search_sync()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  PERFORM pg_notify(
    'search_sync',
    json_build_object(
      'table', TG_TABLE_SCHEMA || '.' || TG_TABLE_NAME,
      'operation', TG_OP,
      'id', CASE WHEN TG_OP = 'DELETE' THEN OLD.id ELSE NEW.id END,
      'timestamp', now()
    )::text
  );
  RETURN COALESCE(NEW, OLD);
END;
$$;

DROP TRIGGER IF EXISTS trg_storefront_search_sync ON public.storefront_pages;
CREATE TRIGGER trg_storefront_search_sync
  AFTER INSERT OR UPDATE OR DELETE ON public.storefront_pages
  FOR EACH ROW EXECUTE FUNCTION public.notify_search_sync();

DROP TRIGGER IF EXISTS trg_listings_search_sync ON marketplace.listings;
CREATE TRIGGER trg_listings_search_sync
  AFTER INSERT OR UPDATE OR DELETE ON marketplace.listings
  FOR EACH ROW EXECUTE FUNCTION public.notify_search_sync();

DROP TRIGGER IF EXISTS trg_properties_search_sync ON property.properties;
CREATE TRIGGER trg_properties_search_sync
  AFTER INSERT OR UPDATE OR DELETE ON property.properties
  FOR EACH ROW EXECUTE FUNCTION public.notify_search_sync();

DROP TRIGGER IF EXISTS trg_products_search_sync ON public.seed_products;
CREATE TRIGGER trg_products_search_sync
  AFTER INSERT OR UPDATE OR DELETE ON public.seed_products
  FOR EACH ROW EXECUTE FUNCTION public.notify_search_sync();

DROP TRIGGER IF EXISTS trg_profiles_search_sync ON identity.profiles;
CREATE TRIGGER trg_profiles_search_sync
  AFTER INSERT OR UPDATE OR DELETE ON identity.profiles
  FOR EACH ROW EXECUTE FUNCTION public.notify_search_sync();

-- ═══ Edge Function Performance Logging Table ═══
CREATE TABLE IF NOT EXISTS public.edge_function_metrics (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  function_name text NOT NULL,
  route_pattern text,
  method text NOT NULL DEFAULT 'POST',
  status_code integer,
  duration_ms double precision NOT NULL,
  cache_hit boolean DEFAULT false,
  user_id uuid,
  geo_region text,
  recorded_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_edge_metrics_fn_time
  ON public.edge_function_metrics (function_name, recorded_at DESC);

CREATE INDEX IF NOT EXISTS idx_edge_metrics_duration
  ON public.edge_function_metrics (duration_ms DESC)
  WHERE duration_ms > 100;

ALTER TABLE public.edge_function_metrics ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'admin_edge_metrics_read' AND tablename = 'edge_function_metrics') THEN
CREATE POLICY admin_edge_metrics_read ON public.edge_function_metrics
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );
END IF;
END $$;

DO $$ BEGIN
IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'service_role_edge_metrics' AND tablename = 'edge_function_metrics') THEN
CREATE POLICY service_role_edge_metrics ON public.edge_function_metrics
  FOR ALL USING (auth.role() = 'service_role');
END IF;
END $$;

-- ═══ Performance Summary View ═══
CREATE OR REPLACE VIEW public.edge_function_performance AS
SELECT
  function_name,
  count(*) AS total_calls,
  round(avg(duration_ms)::numeric, 2) AS avg_ms,
  round(percentile_cont(0.95) WITHIN GROUP (ORDER BY duration_ms)::numeric, 2) AS p95_ms,
  round(percentile_cont(0.99) WITHIN GROUP (ORDER BY duration_ms)::numeric, 2) AS p99_ms,
  round(max(duration_ms)::numeric, 2) AS max_ms,
  round(min(duration_ms)::numeric, 2) AS min_ms,
  count(*) FILTER (WHERE cache_hit = true) AS cache_hits,
  round(
    (count(*) FILTER (WHERE cache_hit = true))::numeric / NULLIF(count(*), 0) * 100, 1
  ) AS cache_hit_pct,
  count(*) FILTER (WHERE status_code >= 500) AS error_count,
  max(recorded_at) AS last_call
FROM public.edge_function_metrics
WHERE recorded_at > now() - interval '24 hours'
GROUP BY function_name
ORDER BY total_calls DESC;

-- ═══ Cleanup function for old metrics ═══
CREATE OR REPLACE FUNCTION public.cleanup_old_edge_metrics()
RETURNS void
LANGUAGE sql
SECURITY DEFINER
AS $$
  DELETE FROM public.edge_function_metrics
  WHERE recorded_at < now() - interval '7 days';
$$;

-- Schedule cleanup via pg_cron if available
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN
    PERFORM cron.schedule(
      'cleanup-edge-metrics',
      '0 4 * * *',
      'SELECT cleanup_old_edge_metrics();'
    );
  END IF;
END
$$;
