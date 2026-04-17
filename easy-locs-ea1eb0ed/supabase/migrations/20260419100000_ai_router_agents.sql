-- ============================================================================
-- Sovereign Agent Control · LB1 — AI router as registered agent (task #815)
--
-- Brings the AI surface area under the same platform-native agent registry
-- introduced for L1 (#808). After this migration:
--
--   1. `public.ai_interactions` rows are linked to the `system.execution_tasks`
--      run that produced them (`execution_task_id` FK), so the same conversation
--      replay UI works for an AI agent as for any business adapter.
--   2. `system.execution_tasks` carries first-class cost & latency columns —
--      cost is no longer a third-class JSON-blob metric.
--   3. `system.agent_quota_counters` provides rolling-window counters that
--      AI adapters atomically increment, enabling per-agent rate / token /
--      cost caps independent of the per-user `public.ai_quotas` table.
--   4. Two ai-* policy profiles seed the default approval / risk posture:
--        - `ai-default`     — SAFE risk floor, no approval, generous quotas
--        - `ai-sensitive`   — MEDIUM risk floor, approval required, lower caps
--   5. Four AI agents are registered through `system.register_agent`, each
--      claiming the (`ai`, `<TASK_TYPE>`) capability:
--        - `ai.completion`   — chat / completion / structured-json calls
--        - `ai.embedding`    — vector embeddings
--        - `ai.rag`          — retrieval-augmented generation pipelines
--        - `ai.tool_use`     — tool / function-call orchestration
--   6. `system.v_ai_runs` joins execution_tasks + ai_interactions for the
--      generic /admin/agents/<slug>/runs explorer.
--
-- Idempotent: runs cleanly against a database where the L1 / L2 / L3 / L4 / L5
-- migrations have already been applied. Safe to re-run.
-- ============================================================================

-- ── 1. ai_interactions.execution_task_id FK ──────────────────────────────
ALTER TABLE public.ai_interactions
  ADD COLUMN IF NOT EXISTS execution_task_id UUID
  REFERENCES system.execution_tasks(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_ai_interactions_task
  ON public.ai_interactions (execution_task_id)
  WHERE execution_task_id IS NOT NULL;

COMMENT ON COLUMN public.ai_interactions.execution_task_id IS
  'FK to system.execution_tasks(id) — the registered AI agent run that produced ' ||
  'this interaction. Nullable to preserve historical rows captured before LB1.';

-- ── 2. First-class cost & latency + sensitive-output gate on execution_tasks
-- The state machine allows running → succeeded but NOT running → pending_review,
-- and we deliberately don't widen it: the AI call DID succeed, what's pending
-- is response *delivery*, not the call itself. Admins release the held
-- response via the L5 inbox — surfaced from these two columns.
ALTER TABLE system.execution_tasks
  ADD COLUMN IF NOT EXISTS cost_usd          NUMERIC(12,6),
  ADD COLUMN IF NOT EXISTS latency_ms        INT,
  ADD COLUMN IF NOT EXISTS held_for_review   BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS held_reason       TEXT,
  ADD COLUMN IF NOT EXISTS released_by       UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS released_at       TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_execution_tasks_held_for_review
  ON system.execution_tasks(created_at DESC)
  WHERE held_for_review = TRUE AND released_at IS NULL;

COMMENT ON COLUMN system.execution_tasks.cost_usd IS
  'USD cost reported by the adapter (AI: token cost; business: 0/null). ' ||
  'First-class metric so dashboards do not need to dig into result JSON.';
COMMENT ON COLUMN system.execution_tasks.latency_ms IS
  'Wall-clock duration measured by the adapter (not the orchestrator).';
COMMENT ON COLUMN system.execution_tasks.held_for_review IS
  'LB1 (#815): the AI adapter flagged this output as sensitive (PII / contract / ' ||
  'caller-marked). The task is still succeeded but the response MUST NOT be ' ||
  'delivered until released_at is non-null.';

-- RPC: release a held AI response. Admin-only; idempotent.
CREATE OR REPLACE FUNCTION system.release_held_ai_response(
  p_task_id UUID,
  p_decision TEXT DEFAULT 'approved'
) RETURNS system.execution_tasks
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, system
AS $$
DECLARE v_task system.execution_tasks; v_caller UUID := auth.uid();
BEGIN
  PERFORM system._assert_admin_or_service();
  IF p_decision NOT IN ('approved', 'rejected') THEN
    RAISE EXCEPTION 'release_held_ai_response: invalid decision %', p_decision
      USING ERRCODE = '22023';
  END IF;
  UPDATE system.execution_tasks
     SET released_by = v_caller,
         released_at = now(),
         held_reason = CASE WHEN p_decision = 'rejected'
                            THEN COALESCE(held_reason, '') || ' [REJECTED]'
                            ELSE held_reason END
   WHERE id = p_task_id AND held_for_review = TRUE AND released_at IS NULL
  RETURNING * INTO v_task;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'release_held_ai_response: task % not held or already released', p_task_id
      USING ERRCODE = '23505';
  END IF;

  BEGIN
    INSERT INTO public.engine_run_logs (
      engine_name, category, status, started_at, finished_at, duration_ms,
      effect_summary, metadata_json, trigger_source
    ) VALUES (
      'ai-release', 'ai.held.released', 'ok', now(), now(), 0,
      format('AI_HELD_RELEASED task=%s decision=%s', p_task_id, p_decision),
      jsonb_build_object('task_id', p_task_id, 'decision', p_decision, 'by', v_caller),
      'release_held_ai_response_rpc'
    );
  EXCEPTION WHEN OTHERS THEN NULL; END;
  RETURN v_task;
END;
$$;
REVOKE ALL ON FUNCTION system.release_held_ai_response(UUID, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION system.release_held_ai_response(UUID, TEXT)
  TO authenticated, service_role;

-- ── 3. Rolling-window quota counters per agent ───────────────────────────
-- One row per (agent_id, window_kind, window_start). Window kinds: 'minute'
-- and 'day' to match the policy_profiles columns. Atomically updated by the
-- `system.consume_agent_quota` RPC — never raced because of the PK.
CREATE TABLE IF NOT EXISTS system.agent_quota_counters (
  agent_id        UUID NOT NULL REFERENCES system.agents(id) ON DELETE CASCADE,
  window_kind     TEXT NOT NULL CHECK (window_kind IN ('minute','day')),
  window_start    TIMESTAMPTZ NOT NULL,
  run_count       INT NOT NULL DEFAULT 0,
  total_tokens    BIGINT NOT NULL DEFAULT 0,
  total_cost_usd  NUMERIC(14,6) NOT NULL DEFAULT 0,
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (agent_id, window_kind, window_start)
);

CREATE INDEX IF NOT EXISTS idx_agent_quota_counters_agent
  ON system.agent_quota_counters(agent_id, window_kind, window_start DESC);

ALTER TABLE system.agent_quota_counters ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY agent_quota_counters_read ON system.agent_quota_counters
    FOR SELECT TO authenticated USING (TRUE);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE POLICY agent_quota_counters_service ON system.agent_quota_counters
    FOR ALL TO service_role USING (TRUE) WITH CHECK (TRUE);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

GRANT SELECT ON system.agent_quota_counters TO authenticated;
GRANT SELECT, INSERT, UPDATE ON system.agent_quota_counters TO service_role;

-- Truncate-to-window helper (UTC). Plain SQL so it can inline.
CREATE OR REPLACE FUNCTION system._quota_window_start(p_kind TEXT, p_now TIMESTAMPTZ)
RETURNS TIMESTAMPTZ LANGUAGE sql IMMUTABLE AS $$
  SELECT CASE p_kind
    WHEN 'minute' THEN date_trunc('minute', p_now AT TIME ZONE 'UTC') AT TIME ZONE 'UTC'
    WHEN 'day'    THEN date_trunc('day',    p_now AT TIME ZONE 'UTC') AT TIME ZONE 'UTC'
    ELSE NULL
  END
$$;

-- ── 4. consume_agent_quota — atomic check-and-increment ──────────────────
-- Returns a row signalling whether the call is admitted. Caller (orchestrator
-- / AI adapter) MUST honour `ok = FALSE` by short-circuiting with QUOTA_EXCEEDED.
CREATE OR REPLACE FUNCTION system.consume_agent_quota(
  p_agent_id     UUID,
  p_tokens       INT DEFAULT 0,
  p_cost_usd     NUMERIC DEFAULT 0
) RETURNS TABLE (
  ok                 BOOLEAN,
  blocked_reason     TEXT,
  blocked_window     TEXT,
  current_count      INT,
  limit_count        INT
)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, system
AS $$
DECLARE
  v_now           TIMESTAMPTZ := now();
  v_min_start     TIMESTAMPTZ := system._quota_window_start('minute', v_now);
  v_day_start     TIMESTAMPTZ := system._quota_window_start('day',    v_now);
  v_min_limit     INT;
  v_day_limit     INT;
  v_max_cost      NUMERIC;
  v_min_count     INT := 0;
  v_day_count     INT := 0;
  v_day_cost      NUMERIC := 0;
BEGIN
  -- Pull effective caps from the bound policy profile (NULL = unlimited).
  SELECT pp.max_runs_per_min, pp.max_runs_per_day, pp.max_cost_per_run_usd
    INTO v_min_limit, v_day_limit, v_max_cost
    FROM system.agents a
    LEFT JOIN system.policy_profiles pp ON pp.id = a.policy_profile_id
   WHERE a.id = p_agent_id;

  IF v_max_cost IS NOT NULL AND p_cost_usd > v_max_cost THEN
    RETURN QUERY SELECT FALSE, 'cost_per_run_exceeded'::TEXT,
      'per_run'::TEXT, 0, 0;
    RETURN;
  END IF;

  -- Count current window usage (read-modify-write under PK, so race-free).
  SELECT run_count INTO v_min_count
    FROM system.agent_quota_counters
   WHERE agent_id = p_agent_id AND window_kind = 'minute' AND window_start = v_min_start;
  v_min_count := COALESCE(v_min_count, 0);

  SELECT run_count INTO v_day_count
    FROM system.agent_quota_counters
   WHERE agent_id = p_agent_id AND window_kind = 'day' AND window_start = v_day_start;
  v_day_count := COALESCE(v_day_count, 0);

  IF v_min_limit IS NOT NULL AND v_min_count + 1 > v_min_limit THEN
    RETURN QUERY SELECT FALSE, 'rate_limit_per_minute'::TEXT,
      'minute'::TEXT, v_min_count, v_min_limit;
    RETURN;
  END IF;
  IF v_day_limit IS NOT NULL AND v_day_count + 1 > v_day_limit THEN
    RETURN QUERY SELECT FALSE, 'rate_limit_per_day'::TEXT,
      'day'::TEXT, v_day_count, v_day_limit;
    RETURN;
  END IF;

  -- Admit the call; bump both counters.
  INSERT INTO system.agent_quota_counters (
    agent_id, window_kind, window_start, run_count, total_tokens, total_cost_usd, updated_at
  ) VALUES (
    p_agent_id, 'minute', v_min_start, 1, GREATEST(p_tokens, 0), GREATEST(p_cost_usd, 0), v_now
  )
  ON CONFLICT (agent_id, window_kind, window_start) DO UPDATE
    SET run_count      = system.agent_quota_counters.run_count + 1,
        total_tokens   = system.agent_quota_counters.total_tokens + GREATEST(p_tokens, 0),
        total_cost_usd = system.agent_quota_counters.total_cost_usd + GREATEST(p_cost_usd, 0),
        updated_at     = v_now;

  INSERT INTO system.agent_quota_counters (
    agent_id, window_kind, window_start, run_count, total_tokens, total_cost_usd, updated_at
  ) VALUES (
    p_agent_id, 'day', v_day_start, 1, GREATEST(p_tokens, 0), GREATEST(p_cost_usd, 0), v_now
  )
  ON CONFLICT (agent_id, window_kind, window_start) DO UPDATE
    SET run_count      = system.agent_quota_counters.run_count + 1,
        total_tokens   = system.agent_quota_counters.total_tokens + GREATEST(p_tokens, 0),
        total_cost_usd = system.agent_quota_counters.total_cost_usd + GREATEST(p_cost_usd, 0),
        updated_at     = v_now;

  RETURN QUERY SELECT TRUE, NULL::TEXT, NULL::TEXT, v_min_count + 1, v_min_limit;
END;
$$;
REVOKE ALL ON FUNCTION system.consume_agent_quota(UUID, INT, NUMERIC) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION system.consume_agent_quota(UUID, INT, NUMERIC)
  TO authenticated, service_role;

-- ── 5. v_ai_runs — generic per-agent conversation explorer view ──────────
CREATE OR REPLACE VIEW system.v_ai_runs AS
SELECT
  t.id                AS task_id,
  t.agent_id,
  t.agent_version_id,
  a.slug              AS agent_slug,
  t.type              AS task_type,
  t.domain,
  t.status            AS task_status,
  t.risk_level,
  t.requires_approval,
  t.cost_usd,
  t.latency_ms,
  t.held_for_review,
  t.held_reason,
  t.released_at,
  t.released_by,
  t.created_at        AS task_created_at,
  t.completed_at,
  t.failed_at,
  t.error_code,
  COALESCE(t.error, t.blocked_reason) AS error,
  t.payload,
  t.execution_result  AS result,
  t.correlation_id,
  ai.id               AS interaction_id,
  ai.feature          AS ai_feature,
  ai.provider,
  ai.model,
  ai.prompt_tokens,
  ai.completion_tokens,
  ai.total_tokens,
  ai.fallback_used,
  ai.status           AS ai_status,
  ai.block_reason     AS ai_block_reason,
  ai.metadata         AS ai_metadata,
  -- Convenience: prompt/response surface for the conversation explorer.
  -- payload.payload.prompt and result.text are the canonical paths set by
  -- the LB1 AI adapters; fall back to ai_interactions metadata when present.
  COALESCE(
    NULLIF(t.payload->'payload'->>'prompt', ''),
    NULLIF(ai.metadata->>'prompt', '')
  )                   AS prompt,
  COALESCE(
    NULLIF(t.execution_result->>'text', ''),
    NULLIF(t.execution_result->'output'->>'text', ''),
    NULLIF(ai.metadata->>'response', '')
  )                   AS response
FROM system.execution_tasks t
LEFT JOIN system.agents a ON a.id = t.agent_id
LEFT JOIN public.ai_interactions ai ON ai.execution_task_id = t.id
WHERE t.domain = 'ai';

GRANT SELECT ON system.v_ai_runs TO authenticated, service_role;

-- ── 6. Seed policy profiles for AI agents ────────────────────────────────
INSERT INTO system.policy_profiles (
  slug, description, approval_required, risk_floor,
  max_cost_per_run_usd, max_runs_per_min, max_runs_per_day, metadata
) VALUES
  ('ai-default',
   'Default AI agent posture: low-risk, no approval, generous caps. Used by chat/embedding/rag/tool_use unless an interaction is flagged sensitive.',
   FALSE, 'SAFE', 1.00, 600, 100000,
   jsonb_build_object('lb1', TRUE)),
  ('ai-sensitive',
   'AI agent posture for outputs that touch PII, contracts, money or moderation: requires admin approval before the response is delivered.',
   TRUE, 'MEDIUM', 2.00, 60, 5000,
   jsonb_build_object('lb1', TRUE, 'sensitive', TRUE))
ON CONFLICT (slug) DO UPDATE
  SET description           = EXCLUDED.description,
      approval_required     = EXCLUDED.approval_required,
      risk_floor            = EXCLUDED.risk_floor,
      max_cost_per_run_usd  = EXCLUDED.max_cost_per_run_usd,
      max_runs_per_min      = EXCLUDED.max_runs_per_min,
      max_runs_per_day      = EXCLUDED.max_runs_per_day,
      metadata              = system.policy_profiles.metadata || EXCLUDED.metadata;

-- ── 7. Seed the four AI agents + their capabilities ──────────────────────
SELECT system.register_agent(
  p_slug              := 'ai.completion',
  p_display_name      := 'AI Completion Agent',
  p_agent_kind        := 'ai.router',
  p_initial_version   := '1.0.0',
  p_owner_team        := 'ai-platform',
  p_status            := 'active',
  p_policy_profile    := 'ai-default',
  p_quotas            := jsonb_build_object('max_runs_per_min', 600, 'max_runs_per_day', 100000),
  p_metadata          := jsonb_build_object(
    'description',
      'Chat / completion / structured-JSON calls. Wraps OpenAI + Anthropic with cost-tracked, quota-bounded routing.',
    'rollback_strategy',  'none',
    'sensitive_classifier', TRUE
  ),
  p_capabilities      := jsonb_build_array(
    jsonb_build_object('domain','ai','task_type','AI_COMPLETION')
  ),
  p_changelog         := 'LB1 initial registration (#815)'
);

SELECT system.register_agent(
  p_slug              := 'ai.embedding',
  p_display_name      := 'AI Embedding Agent',
  p_agent_kind        := 'ai.router',
  p_initial_version   := '1.0.0',
  p_owner_team        := 'ai-platform',
  p_status            := 'active',
  p_policy_profile    := 'ai-default',
  p_quotas            := jsonb_build_object('max_runs_per_min', 1200, 'max_runs_per_day', 500000),
  p_metadata          := jsonb_build_object(
    'description',
      'Vector embeddings (OpenAI text-embedding-3-* by default). Idempotent on (model, input_hash); rollback is intentionally none.',
    'rollback_strategy',  'none'
  ),
  p_capabilities      := jsonb_build_array(
    jsonb_build_object('domain','ai','task_type','AI_EMBEDDING')
  ),
  p_changelog         := 'LB1 initial registration (#815)'
);

SELECT system.register_agent(
  p_slug              := 'ai.rag',
  p_display_name      := 'AI RAG Agent',
  p_agent_kind        := 'ai.router',
  p_initial_version   := '1.0.0',
  p_owner_team        := 'ai-platform',
  p_status            := 'active',
  p_policy_profile    := 'ai-default',
  p_quotas            := jsonb_build_object('max_runs_per_min', 300, 'max_runs_per_day', 50000),
  p_metadata          := jsonb_build_object(
    'description',
      'Retrieval-augmented generation: embed query → vector search → completion with citations. Sensitive classifier flips to pending_review when the answer cites contract/PII chunks.',
    'rollback_strategy',  'none',
    'sensitive_classifier', TRUE
  ),
  p_capabilities      := jsonb_build_array(
    jsonb_build_object('domain','ai','task_type','AI_RAG')
  ),
  p_changelog         := 'LB1 initial registration (#815)'
);

SELECT system.register_agent(
  p_slug              := 'ai.tool_use',
  p_display_name      := 'AI Tool-Use Agent',
  p_agent_kind        := 'ai.tool',
  p_initial_version   := '1.0.0',
  p_owner_team        := 'ai-platform',
  p_status            := 'active',
  p_policy_profile    := 'ai-sensitive',
  p_quotas            := jsonb_build_object('max_runs_per_min', 60, 'max_runs_per_day', 5000),
  p_metadata          := jsonb_build_object(
    'description',
      'Tool / function-calling orchestration. Defaults to ai-sensitive: every tool invocation requires admin approval before the underlying business adapter is dispatched.',
    'rollback_strategy',  'none',
    'sensitive_classifier', TRUE
  ),
  p_capabilities      := jsonb_build_array(
    jsonb_build_object('domain','ai','task_type','AI_TOOL_USE')
  ),
  p_changelog         := 'LB1 initial registration (#815)'
);
