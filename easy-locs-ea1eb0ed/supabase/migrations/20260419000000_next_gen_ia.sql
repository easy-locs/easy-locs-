-- Next-Gen IA: cost tracking, quotas, RAG memory, golden sets / evals,
-- recommendations cache, hybrid (BM25 + vector) retrieval on listings.

-- =============================================================
-- 1. AI interaction log (per-request cost / latency / provider)
-- =============================================================
CREATE TABLE IF NOT EXISTS public.ai_interactions (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id          uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  feature          text NOT NULL,                 -- e.g. "assistant", "rag", "recommendations", "enrichment"
  domain           text,                          -- e.g. "radar", "marketplace", "property", "ride"
  provider         text NOT NULL,                 -- "openai" | "anthropic"
  model            text NOT NULL,
  prompt_tokens    integer NOT NULL DEFAULT 0,
  completion_tokens integer NOT NULL DEFAULT 0,
  total_tokens     integer GENERATED ALWAYS AS (prompt_tokens + completion_tokens) STORED,
  cost_usd         numeric(12,6) NOT NULL DEFAULT 0,
  latency_ms       integer NOT NULL DEFAULT 0,
  fallback_used    boolean NOT NULL DEFAULT false,
  status           text NOT NULL DEFAULT 'ok',    -- ok | error | blocked
  block_reason     text,                          -- prompt_injection | pii | moderation | quota | rate_limit
  request_id       text,
  metadata         jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at       timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_ai_interactions_user_created
  ON public.ai_interactions (user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ai_interactions_feature_created
  ON public.ai_interactions (feature, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ai_interactions_status_created
  ON public.ai_interactions (status, created_at DESC) WHERE status <> 'ok';

ALTER TABLE public.ai_interactions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS ai_interactions_self_read ON public.ai_interactions;
CREATE POLICY ai_interactions_self_read ON public.ai_interactions
  FOR SELECT TO authenticated
  USING (user_id = auth.uid());

DROP POLICY IF EXISTS ai_interactions_service_all ON public.ai_interactions;
CREATE POLICY ai_interactions_service_all ON public.ai_interactions
  FOR ALL TO service_role USING (true) WITH CHECK (true);

-- =============================================================
-- 2. Per-user daily AI quotas (prompt/completion/cost caps)
-- =============================================================
CREATE TABLE IF NOT EXISTS public.ai_quotas (
  user_id        uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  quota_date     date NOT NULL DEFAULT (now() AT TIME ZONE 'utc')::date,
  feature        text NOT NULL,
  requests       integer NOT NULL DEFAULT 0,
  tokens_used    integer NOT NULL DEFAULT 0,
  cost_usd       numeric(12,6) NOT NULL DEFAULT 0,
  updated_at     timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, quota_date, feature)
);

ALTER TABLE public.ai_quotas ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS ai_quotas_self_read ON public.ai_quotas;
CREATE POLICY ai_quotas_self_read ON public.ai_quotas
  FOR SELECT TO authenticated
  USING (user_id = auth.uid());

DROP POLICY IF EXISTS ai_quotas_service_all ON public.ai_quotas;
CREATE POLICY ai_quotas_service_all ON public.ai_quotas
  FOR ALL TO service_role USING (true) WITH CHECK (true);

-- Atomic quota increment (service-role only)
CREATE OR REPLACE FUNCTION public.ai_quota_increment(
  p_user_id uuid,
  p_feature text,
  p_tokens  integer DEFAULT 0,
  p_cost    numeric DEFAULT 0
) RETURNS public.ai_quotas
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_row public.ai_quotas;
BEGIN
  INSERT INTO public.ai_quotas (user_id, quota_date, feature, requests, tokens_used, cost_usd, updated_at)
  VALUES (p_user_id, (now() AT TIME ZONE 'utc')::date, p_feature, 1, GREATEST(p_tokens, 0), GREATEST(p_cost, 0), now())
  ON CONFLICT (user_id, quota_date, feature) DO UPDATE
    SET requests    = public.ai_quotas.requests + 1,
        tokens_used = public.ai_quotas.tokens_used + GREATEST(p_tokens, 0),
        cost_usd    = public.ai_quotas.cost_usd + GREATEST(p_cost, 0),
        updated_at  = now()
  RETURNING * INTO v_row;
  RETURN v_row;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.ai_quota_increment FROM PUBLIC;
GRANT  EXECUTE ON FUNCTION public.ai_quota_increment TO service_role;

-- =============================================================
-- 3. RAG conversation memory (summarized history + citations)
-- =============================================================
CREATE TABLE IF NOT EXISTS public.ai_conversation_memory (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  conversation_id uuid NOT NULL,
  domain          text NOT NULL DEFAULT 'general',
  role            text NOT NULL CHECK (role IN ('user','assistant','system','summary')),
  content         text NOT NULL,
  citations       jsonb NOT NULL DEFAULT '[]'::jsonb,
  token_count     integer NOT NULL DEFAULT 0,
  created_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_ai_mem_conv_created
  ON public.ai_conversation_memory (conversation_id, created_at);
CREATE INDEX IF NOT EXISTS idx_ai_mem_user_created
  ON public.ai_conversation_memory (user_id, created_at DESC);

ALTER TABLE public.ai_conversation_memory ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS ai_mem_self ON public.ai_conversation_memory;
CREATE POLICY ai_mem_self ON public.ai_conversation_memory
  FOR ALL TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS ai_mem_service ON public.ai_conversation_memory;
CREATE POLICY ai_mem_service ON public.ai_conversation_memory
  FOR ALL TO service_role USING (true) WITH CHECK (true);

-- =============================================================
-- 4. Golden sets + eval runs (regression detection)
-- =============================================================
CREATE TABLE IF NOT EXISTS public.ai_golden_sets (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name          text NOT NULL,
  feature       text NOT NULL,                  -- which assistant/flow it targets
  domain        text,
  input         jsonb NOT NULL,                 -- messages / query / context
  expected      jsonb NOT NULL,                 -- expected output (contains/regex/exact/score)
  tags          text[] NOT NULL DEFAULT ARRAY[]::text[],
  active        boolean NOT NULL DEFAULT true,
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_golden_active_feature
  ON public.ai_golden_sets (feature) WHERE active;

ALTER TABLE public.ai_golden_sets ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS ai_golden_service ON public.ai_golden_sets;
CREATE POLICY ai_golden_service ON public.ai_golden_sets
  FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE TABLE IF NOT EXISTS public.ai_eval_runs (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  run_label       text NOT NULL,
  feature         text NOT NULL,
  golden_id       uuid NOT NULL REFERENCES public.ai_golden_sets(id) ON DELETE CASCADE,
  provider        text,
  model           text,
  passed          boolean NOT NULL,
  score           numeric(5,4),
  actual_output   jsonb,
  error           text,
  latency_ms      integer,
  cost_usd        numeric(12,6),
  created_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_eval_runs_label
  ON public.ai_eval_runs (run_label, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_eval_runs_feature_passed
  ON public.ai_eval_runs (feature, passed, created_at DESC);

ALTER TABLE public.ai_eval_runs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS ai_eval_service ON public.ai_eval_runs;
CREATE POLICY ai_eval_service ON public.ai_eval_runs
  FOR ALL TO service_role USING (true) WITH CHECK (true);

-- =============================================================
-- 5. Per-domain recommendations cache
-- =============================================================
CREATE TABLE IF NOT EXISTS public.ai_recommendations_cache (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  domain       text NOT NULL CHECK (domain IN ('radar','marketplace','property','ride','general')),
  context_hash text NOT NULL,
  items        jsonb NOT NULL,                  -- [{id, kind, score, reason}, ...]
  model        text,
  expires_at   timestamptz NOT NULL,
  created_at   timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_reco_user_domain_hash
  ON public.ai_recommendations_cache (user_id, domain, context_hash);
CREATE INDEX IF NOT EXISTS idx_reco_expires
  ON public.ai_recommendations_cache (expires_at);

ALTER TABLE public.ai_recommendations_cache ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS ai_reco_self_read ON public.ai_recommendations_cache;
CREATE POLICY ai_reco_self_read ON public.ai_recommendations_cache
  FOR SELECT TO authenticated USING (user_id = auth.uid());

DROP POLICY IF EXISTS ai_reco_service_all ON public.ai_recommendations_cache;
CREATE POLICY ai_reco_service_all ON public.ai_recommendations_cache
  FOR ALL TO service_role USING (true) WITH CHECK (true);

-- =============================================================
-- 6b. Content enrichment output store (descriptions, tags, SEO, alt)
-- =============================================================
CREATE TABLE IF NOT EXISTS public.content_enrichments (
  id                 uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_type        text NOT NULL,                      -- "listing" | "seed_product" | "marketplace_service" | ...
  entity_id          uuid NOT NULL,
  description        text,
  tags               text[] NOT NULL DEFAULT ARRAY[]::text[],
  seo_title          text,
  seo_description    text,
  seo_keywords       text[] NOT NULL DEFAULT ARRAY[]::text[],
  image_alts         jsonb NOT NULL DEFAULT '{}'::jsonb,  -- { "<image_url>": "alt text" }
  quality_score      numeric(4,3) NOT NULL DEFAULT 0,
  generator_model    text,
  generator_provider text,
  input_hash         text,                                -- to skip when inputs unchanged
  approved           boolean NOT NULL DEFAULT false,
  approved_by        uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  approved_at        timestamptz,
  created_at         timestamptz NOT NULL DEFAULT now(),
  updated_at         timestamptz NOT NULL DEFAULT now(),
  UNIQUE (entity_type, entity_id)
);

CREATE INDEX IF NOT EXISTS idx_content_enrichments_type_updated
  ON public.content_enrichments (entity_type, updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_content_enrichments_approved
  ON public.content_enrichments (entity_type, approved);

ALTER TABLE public.content_enrichments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS content_enrichments_read_all ON public.content_enrichments;
CREATE POLICY content_enrichments_read_all ON public.content_enrichments
  FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS content_enrichments_service_all ON public.content_enrichments;
CREATE POLICY content_enrichments_service_all ON public.content_enrichments
  FOR ALL TO service_role USING (true) WITH CHECK (true);

-- Touch updated_at on changes.
CREATE OR REPLACE FUNCTION public._content_enrichments_touch() RETURNS trigger
LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_content_enrichments_touch ON public.content_enrichments;
CREATE TRIGGER trg_content_enrichments_touch
  BEFORE UPDATE ON public.content_enrichments
  FOR EACH ROW EXECUTE FUNCTION public._content_enrichments_touch();

-- =============================================================
-- 6. Hybrid retrieval on listings: BM25 (tsvector) + vector (RRF)
-- =============================================================
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'listings' AND column_name = 'search_tsv'
  ) THEN
    EXECUTE $sql$
      ALTER TABLE public.listings
      ADD COLUMN search_tsv tsvector GENERATED ALWAYS AS (
        setweight(to_tsvector('simple', coalesce(title, '')), 'A') ||
        setweight(to_tsvector('simple', coalesce(category, '')), 'B') ||
        setweight(to_tsvector('simple', coalesce(city, '')), 'B') ||
        setweight(to_tsvector('simple', coalesce(description, '')), 'C')
      ) STORED
    $sql$;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_listings_search_tsv
  ON public.listings USING GIN (search_tsv);

-- Reciprocal Rank Fusion hybrid search returning listing ids + fused score + citations
CREATE OR REPLACE FUNCTION public.hybrid_search_listings(
  p_query text,
  p_query_embedding vector(1536),
  p_match_count int DEFAULT 10,
  p_rrf_k int DEFAULT 60
)
RETURNS TABLE (
  id uuid,
  title text,
  category text,
  city text,
  price numeric,
  bm25_rank double precision,
  vector_rank double precision,
  score double precision
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  WITH bm25 AS (
    SELECT l.id,
           ROW_NUMBER() OVER (ORDER BY ts_rank_cd(l.search_tsv, plainto_tsquery('simple', p_query)) DESC) AS r
    FROM   public.listings l
    WHERE  p_query IS NOT NULL
      AND  l.search_tsv @@ plainto_tsquery('simple', p_query)
    LIMIT  p_match_count * 4
  ),
  vec AS (
    SELECT l.id,
           ROW_NUMBER() OVER (ORDER BY l.embedding <=> p_query_embedding) AS r
    FROM   public.listings l
    WHERE  p_query_embedding IS NOT NULL
      AND  l.embedding IS NOT NULL
    LIMIT  p_match_count * 4
  ),
  fused AS (
    SELECT COALESCE(b.id, v.id) AS id,
           COALESCE(1.0 / (p_rrf_k + b.r), 0) + COALESCE(1.0 / (p_rrf_k + v.r), 0) AS score,
           b.r::double precision AS bm25_r,
           v.r::double precision AS vec_r
    FROM   bm25 b
    FULL OUTER JOIN vec v ON v.id = b.id
  )
  SELECT l.id,
         l.title,
         l.category,
         l.city,
         l.price,
         f.bm25_r AS bm25_rank,
         f.vec_r  AS vector_rank,
         f.score
  FROM   fused f
  JOIN   public.listings l ON l.id = f.id
  ORDER BY f.score DESC NULLS LAST
  LIMIT  p_match_count;
$$;

REVOKE EXECUTE ON FUNCTION public.hybrid_search_listings FROM PUBLIC;
GRANT  EXECUTE ON FUNCTION public.hybrid_search_listings TO authenticated, service_role;
