-- Enable pgvector extension for vector similarity search
CREATE EXTENSION IF NOT EXISTS vector;

-- Add vector columns to key tables for cosine similarity recommendations
-- Using 1536 dimensions to match OpenAI text-embedding-3-small output

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'listings' AND column_name = 'embedding'
  ) THEN
    ALTER TABLE listings ADD COLUMN embedding vector(1536);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'seed_products' AND column_name = 'embedding'
  ) THEN
    ALTER TABLE seed_products ADD COLUMN embedding vector(1536);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'marketplace_services' AND column_name = 'embedding'
  ) THEN
    ALTER TABLE marketplace_services ADD COLUMN embedding vector(1536);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'embedding'
  ) THEN
    ALTER TABLE profiles ADD COLUMN embedding vector(1536);
  END IF;
END $$;

-- Create indexes for fast cosine similarity search (IVFFlat)
-- These use ivfflat with cosine distance for approximate nearest neighbor search

CREATE INDEX IF NOT EXISTS idx_listings_embedding
  ON listings USING ivfflat (embedding vector_cosine_ops)
  WITH (lists = 100);

CREATE INDEX IF NOT EXISTS idx_seed_products_embedding
  ON seed_products USING ivfflat (embedding vector_cosine_ops)
  WITH (lists = 100);

CREATE INDEX IF NOT EXISTS idx_marketplace_services_embedding
  ON marketplace_services USING ivfflat (embedding vector_cosine_ops)
  WITH (lists = 100);

CREATE INDEX IF NOT EXISTS idx_profiles_embedding
  ON profiles USING ivfflat (embedding vector_cosine_ops)
  WITH (lists = 50);

-- RPC function for cosine similarity search across any table
CREATE OR REPLACE FUNCTION match_embeddings(
  p_table_name text,
  p_query_embedding vector(1536),
  p_match_threshold float DEFAULT 0.7,
  p_match_count int DEFAULT 10
)
RETURNS TABLE (
  id uuid,
  similarity float
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF p_table_name = 'listings' THEN
    RETURN QUERY
    SELECT l.id, 1 - (l.embedding <=> p_query_embedding) AS similarity
    FROM listings l
    WHERE l.embedding IS NOT NULL
      AND 1 - (l.embedding <=> p_query_embedding) > p_match_threshold
    ORDER BY l.embedding <=> p_query_embedding
    LIMIT p_match_count;
  ELSIF p_table_name = 'seed_products' THEN
    RETURN QUERY
    SELECT sp.id, 1 - (sp.embedding <=> p_query_embedding) AS similarity
    FROM seed_products sp
    WHERE sp.embedding IS NOT NULL
      AND 1 - (sp.embedding <=> p_query_embedding) > p_match_threshold
    ORDER BY sp.embedding <=> p_query_embedding
    LIMIT p_match_count;
  ELSIF p_table_name = 'marketplace_services' THEN
    RETURN QUERY
    SELECT ms.id, 1 - (ms.embedding <=> p_query_embedding) AS similarity
    FROM marketplace_services ms
    WHERE ms.embedding IS NOT NULL
      AND 1 - (ms.embedding <=> p_query_embedding) > p_match_threshold
    ORDER BY ms.embedding <=> p_query_embedding
    LIMIT p_match_count;
  ELSIF p_table_name = 'profiles' THEN
    RETURN QUERY
    SELECT p.id, 1 - (p.embedding <=> p_query_embedding) AS similarity
    FROM profiles p
    WHERE p.embedding IS NOT NULL
      AND 1 - (p.embedding <=> p_query_embedding) > p_match_threshold
    ORDER BY p.embedding <=> p_query_embedding
    LIMIT p_match_count;
  ELSE
    RAISE EXCEPTION 'Unknown table: %', p_table_name;
  END IF;
END;
$$;

-- Convenience function: find similar listings by listing ID
CREATE OR REPLACE FUNCTION find_similar_listings(
  p_listing_id uuid,
  p_match_count int DEFAULT 5
)
RETURNS TABLE (
  id uuid,
  title text,
  category text,
  city text,
  price numeric,
  similarity float
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_embedding vector(1536);
BEGIN
  SELECT l.embedding INTO v_embedding
  FROM listings l
  WHERE l.id = p_listing_id;

  IF v_embedding IS NULL THEN
    RETURN;
  END IF;

  RETURN QUERY
  SELECT
    l.id,
    l.title,
    l.category,
    l.city,
    l.price,
    1 - (l.embedding <=> v_embedding) AS similarity
  FROM listings l
  WHERE l.id != p_listing_id
    AND l.embedding IS NOT NULL
  ORDER BY l.embedding <=> v_embedding
  LIMIT p_match_count;
END;
$$;

-- Convenience function: find similar products by product ID
CREATE OR REPLACE FUNCTION find_similar_products(
  p_product_id uuid,
  p_match_count int DEFAULT 5
)
RETURNS TABLE (
  id uuid,
  name text,
  category text,
  price numeric,
  similarity float
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_embedding vector(1536);
BEGIN
  SELECT sp.embedding INTO v_embedding
  FROM seed_products sp
  WHERE sp.id = p_product_id;

  IF v_embedding IS NULL THEN
    RETURN;
  END IF;

  RETURN QUERY
  SELECT
    sp.id,
    sp.name,
    sp.category,
    sp.price,
    1 - (sp.embedding <=> v_embedding) AS similarity
  FROM seed_products sp
  WHERE sp.id != p_product_id
    AND sp.embedding IS NOT NULL
  ORDER BY sp.embedding <=> v_embedding
  LIMIT p_match_count;
END;
$$;

-- Convenience function: find similar services by service ID
CREATE OR REPLACE FUNCTION find_similar_services(
  p_service_id uuid,
  p_match_count int DEFAULT 5
)
RETURNS TABLE (
  id uuid,
  title text,
  category text,
  price numeric,
  similarity float
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_embedding vector(1536);
BEGIN
  SELECT ms.embedding INTO v_embedding
  FROM marketplace_services ms
  WHERE ms.id = p_service_id;

  IF v_embedding IS NULL THEN
    RETURN;
  END IF;

  RETURN QUERY
  SELECT
    ms.id,
    ms.title,
    ms.category,
    ms.price,
    1 - (ms.embedding <=> v_embedding) AS similarity
  FROM marketplace_services ms
  WHERE ms.id != p_service_id
    AND ms.embedding IS NOT NULL
  ORDER BY ms.embedding <=> v_embedding
  LIMIT p_match_count;
END;
$$;

-- Semantic search RPC: takes a query embedding and searches across tables
CREATE OR REPLACE FUNCTION semantic_search(
  p_query_embedding vector(1536),
  p_tables text[] DEFAULT ARRAY['listings', 'seed_products', 'marketplace_services', 'profiles'],
  p_match_count int DEFAULT 10,
  p_threshold float DEFAULT 0.6
)
RETURNS TABLE (
  id uuid,
  table_name text,
  similarity float
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  (
    SELECT l.id, 'listings'::text AS table_name,
           1 - (l.embedding <=> p_query_embedding) AS similarity
    FROM listings l
    WHERE 'listings' = ANY(p_tables)
      AND l.embedding IS NOT NULL
      AND 1 - (l.embedding <=> p_query_embedding) > p_threshold
    ORDER BY l.embedding <=> p_query_embedding
    LIMIT p_match_count
  )
  UNION ALL
  (
    SELECT sp.id, 'seed_products'::text AS table_name,
           1 - (sp.embedding <=> p_query_embedding) AS similarity
    FROM seed_products sp
    WHERE 'seed_products' = ANY(p_tables)
      AND sp.embedding IS NOT NULL
      AND 1 - (sp.embedding <=> p_query_embedding) > p_threshold
    ORDER BY sp.embedding <=> p_query_embedding
    LIMIT p_match_count
  )
  UNION ALL
  (
    SELECT ms.id, 'marketplace_services'::text AS table_name,
           1 - (ms.embedding <=> p_query_embedding) AS similarity
    FROM marketplace_services ms
    WHERE 'marketplace_services' = ANY(p_tables)
      AND ms.embedding IS NOT NULL
      AND 1 - (ms.embedding <=> p_query_embedding) > p_threshold
    ORDER BY ms.embedding <=> p_query_embedding
    LIMIT p_match_count
  )
  UNION ALL
  (
    SELECT p.id, 'profiles'::text AS table_name,
           1 - (p.embedding <=> p_query_embedding) AS similarity
    FROM profiles p
    WHERE 'profiles' = ANY(p_tables)
      AND p.embedding IS NOT NULL
      AND 1 - (p.embedding <=> p_query_embedding) > p_threshold
    ORDER BY p.embedding <=> p_query_embedding
    LIMIT p_match_count
  )
  ORDER BY similarity DESC
  LIMIT p_match_count;
END;
$$;

-- Lock down vector RPC privileges: revoke PUBLIC, grant only to authenticated and service_role
REVOKE EXECUTE ON FUNCTION match_embeddings FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION find_similar_listings FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION find_similar_products FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION find_similar_services FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION semantic_search FROM PUBLIC;

GRANT EXECUTE ON FUNCTION match_embeddings TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION find_similar_listings TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION find_similar_products TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION find_similar_services TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION semantic_search TO authenticated, service_role;
