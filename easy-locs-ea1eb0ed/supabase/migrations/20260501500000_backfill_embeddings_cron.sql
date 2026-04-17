-- Task #919: Backfill pgvector embeddings for listings, services, and products
--
-- Background: 20260417200000_pgvector_embeddings.sql added vector(1536)
-- columns and the match_embeddings / find_similar_* / semantic_search RPCs
-- but left every existing row with embedding = NULL. The recommendation
-- engine therefore silently degrades to its in-memory cosine path because
-- vector-similarity-search / match_embeddings return zero rows.
--
-- This migration wires up a repeatable backfill:
--   1. A monitored wrapper that POSTs to the existing `generate-embeddings`
--      Edge Function. That function already finds rows where
--      embedding IS NULL on listings, seed_products, marketplace_services,
--      and profiles, and writes 1536-dim vectors via the AI_EMBEDDING
--      adapter.
--   2. A pg_cron schedule that fires every 10 minutes. Each run processes
--      up to 1000 NULL-embedded rows per target table (capped inside the
--      Edge Function) so even large backlogs drain within a few hours and
--      newly-inserted rows are embedded promptly.
--   3. Triggers on listings, marketplace_services, and seed_products that
--      NULL the embedding when any of the text columns used to build the
--      embedding change. The next cron tick re-embeds the row, keeping
--      vectors consistent with edited content.

-- ── Monitored wrapper ─────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.monitored_backfill_embeddings_cron()
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  PERFORM monitored_http_dispatch(
    'backfill-embeddings-cron',
    'generate-embeddings',
    '{"limit": 1000}'::jsonb,
    true
  );
END;
$$;

REVOKE ALL ON FUNCTION public.monitored_backfill_embeddings_cron() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.monitored_backfill_embeddings_cron() TO service_role;

-- ── Schedule the backfill every 10 minutes ────────────────────────────────
DO $cron_backfill_embeddings$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron')
     AND EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_net') THEN
    BEGIN
      PERFORM cron.unschedule('backfill-embeddings-cron');
    EXCEPTION WHEN OTHERS THEN NULL;
    END;

    PERFORM cron.schedule(
      'backfill-embeddings-cron',
      '*/10 * * * *',
      $cron_body$SELECT public.monitored_backfill_embeddings_cron()$cron_body$
    );
  END IF;
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'backfill-embeddings-cron schedule failed: %', SQLERRM;
END;
$cron_backfill_embeddings$;

-- ── Re-embedding triggers ─────────────────────────────────────────────────
-- Set embedding = NULL whenever any text column that contributes to the
-- vector representation changes. The cron picks NULL rows up on the next
-- tick. Trigger installation is guarded below by an information_schema
-- check that confirms every referenced column still exists; if a future
-- migration renames or drops one of these columns, the trigger is simply
-- not (re)installed and the matching trigger function is dropped.

CREATE OR REPLACE FUNCTION public.mark_listing_embedding_stale()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.title IS DISTINCT FROM OLD.title
     OR NEW.description IS DISTINCT FROM OLD.description
     OR NEW.category IS DISTINCT FROM OLD.category
     OR NEW.city IS DISTINCT FROM OLD.city THEN
    NEW.embedding := NULL;
  END IF;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.mark_service_embedding_stale()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.title IS DISTINCT FROM OLD.title
     OR NEW.description IS DISTINCT FROM OLD.description
     OR NEW.category IS DISTINCT FROM OLD.category THEN
    NEW.embedding := NULL;
  END IF;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.mark_product_embedding_stale()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.name IS DISTINCT FROM OLD.name
     OR NEW.description IS DISTINCT FROM OLD.description
     OR NEW.category IS DISTINCT FROM OLD.category THEN
    NEW.embedding := NULL;
  END IF;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public._all_columns_exist(
  p_schema text,
  p_table  text,
  p_cols   text[]
) RETURNS boolean
LANGUAGE sql STABLE
AS $$
  SELECT NOT EXISTS (
    SELECT unnest(p_cols) AS col
    EXCEPT
    SELECT column_name
      FROM information_schema.columns
     WHERE table_schema = p_schema AND table_name = p_table
  );
$$;

DO $install_triggers$
BEGIN
  -- listings
  IF public._all_columns_exist('public', 'listings',
        ARRAY['embedding','title','description','category','city']) THEN
    BEGIN
      DROP TRIGGER IF EXISTS trg_listings_embedding_stale ON public.listings;
      CREATE TRIGGER trg_listings_embedding_stale
        BEFORE UPDATE ON public.listings
        FOR EACH ROW EXECUTE FUNCTION public.mark_listing_embedding_stale();
    EXCEPTION WHEN OTHERS THEN
      RAISE NOTICE 'listings embedding-stale trigger install failed: %', SQLERRM;
    END;
  ELSE
    -- Schema drift: drop any stale install so we don't leave a broken trigger.
    BEGIN DROP TRIGGER IF EXISTS trg_listings_embedding_stale ON public.listings;
    EXCEPTION WHEN OTHERS THEN NULL; END;
    DROP FUNCTION IF EXISTS public.mark_listing_embedding_stale();
    RAISE NOTICE 'Skipping listings embedding-stale trigger: required columns missing';
  END IF;

  -- marketplace_services
  IF public._all_columns_exist('public', 'marketplace_services',
        ARRAY['embedding','title','description','category']) THEN
    BEGIN
      DROP TRIGGER IF EXISTS trg_services_embedding_stale ON public.marketplace_services;
      CREATE TRIGGER trg_services_embedding_stale
        BEFORE UPDATE ON public.marketplace_services
        FOR EACH ROW EXECUTE FUNCTION public.mark_service_embedding_stale();
    EXCEPTION WHEN OTHERS THEN
      RAISE NOTICE 'marketplace_services embedding-stale trigger install failed: %', SQLERRM;
    END;
  ELSE
    BEGIN DROP TRIGGER IF EXISTS trg_services_embedding_stale ON public.marketplace_services;
    EXCEPTION WHEN OTHERS THEN NULL; END;
    DROP FUNCTION IF EXISTS public.mark_service_embedding_stale();
    RAISE NOTICE 'Skipping marketplace_services embedding-stale trigger: required columns missing';
  END IF;

  -- seed_products
  IF public._all_columns_exist('public', 'seed_products',
        ARRAY['embedding','name','description','category']) THEN
    BEGIN
      DROP TRIGGER IF EXISTS trg_products_embedding_stale ON public.seed_products;
      CREATE TRIGGER trg_products_embedding_stale
        BEFORE UPDATE ON public.seed_products
        FOR EACH ROW EXECUTE FUNCTION public.mark_product_embedding_stale();
    EXCEPTION WHEN OTHERS THEN
      RAISE NOTICE 'seed_products embedding-stale trigger install failed: %', SQLERRM;
    END;
  ELSE
    BEGIN DROP TRIGGER IF EXISTS trg_products_embedding_stale ON public.seed_products;
    EXCEPTION WHEN OTHERS THEN NULL; END;
    DROP FUNCTION IF EXISTS public.mark_product_embedding_stale();
    RAISE NOTICE 'Skipping seed_products embedding-stale trigger: required columns missing';
  END IF;
END;
$install_triggers$;

-- ── Kick off the first backfill immediately so admins don't have to wait ──
-- Best-effort: if pg_net/pg_cron aren't installed (e.g. local dev), skip.
DO $kick_off$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_net') THEN
    PERFORM public.monitored_backfill_embeddings_cron();
  END IF;
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'initial backfill-embeddings dispatch failed: %', SQLERRM;
END;
$kick_off$;

-- ── Coverage helper for ops verification ──────────────────────────────────
-- Returns per-table embedding coverage so the recommendation team can
-- confirm the backfill is making progress (used by Done-criteria check).
CREATE OR REPLACE FUNCTION public.embedding_coverage_report()
RETURNS TABLE (
  table_name text,
  total_rows bigint,
  embedded_rows bigint,
  null_rows bigint,
  coverage_pct numeric
)
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT 'listings'::text,
         COUNT(*)::bigint,
         COUNT(embedding)::bigint,
         COUNT(*) FILTER (WHERE embedding IS NULL)::bigint,
         CASE WHEN COUNT(*) = 0 THEN 0
              ELSE ROUND(100.0 * COUNT(embedding) / COUNT(*), 2) END
  FROM listings
  UNION ALL
  SELECT 'marketplace_services'::text,
         COUNT(*)::bigint,
         COUNT(embedding)::bigint,
         COUNT(*) FILTER (WHERE embedding IS NULL)::bigint,
         CASE WHEN COUNT(*) = 0 THEN 0
              ELSE ROUND(100.0 * COUNT(embedding) / COUNT(*), 2) END
  FROM marketplace_services
  UNION ALL
  SELECT 'seed_products'::text,
         COUNT(*)::bigint,
         COUNT(embedding)::bigint,
         COUNT(*) FILTER (WHERE embedding IS NULL)::bigint,
         CASE WHEN COUNT(*) = 0 THEN 0
              ELSE ROUND(100.0 * COUNT(embedding) / COUNT(*), 2) END
  FROM seed_products;
END;
$$;

REVOKE ALL ON FUNCTION public.embedding_coverage_report() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.embedding_coverage_report() TO service_role;
