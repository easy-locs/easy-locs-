-- ============================================================================
-- Sovereign Agent Control · LB1 follow-up 4 (#837)
-- AI router as registered-agent — seed `metadata.router` on each AI agent.
--
-- Before this migration, model / provider / API-key choices were hard-coded
-- inside `_shared/ai-router.ts`. From now on they live in
-- `system.agents.metadata.router`, sourced by `runner-aiRoute.ts` via the
-- new `createAgentRouterConfigLoader`.
--
-- Schema of `metadata.router`:
--
--   {
--     "kind": "chat" | "embedding",
--     "primary":   { "provider": "openai", "model": "...", "key_env": "...", "timeout_ms": 8000 },
--     "fallbacks": [ { "provider": "anthropic", "model": "...", "key_env": "..." }, ... ],
--     "cost_per_1k": { "<model>": { "prompt": <num>, "completion": <num> }, ... }
--   }
--
-- ONLY the env-var NAME for the API key is stored here — actual secrets stay
-- in the function's environment. Rotation = swap the env value or change
-- the `key_env` pointer; no code edit required.
--
-- Idempotent: every UPDATE jsonb-merges, so re-running this migration is a
-- no-op on already-migrated rows.
-- ============================================================================

-- ── ai.completion: OpenAI primary, Anthropic fallback ────────────────────
UPDATE system.agents
SET metadata = metadata || jsonb_build_object(
  'router', jsonb_build_object(
    'kind', 'chat',
    'primary', jsonb_build_object(
      'provider', 'openai',
      'model',    'gpt-4o-mini',
      'key_env',  'OPENAI_API_KEY',
      'timeout_ms', 8000
    ),
    'fallbacks', jsonb_build_array(
      jsonb_build_object(
        'provider', 'anthropic',
        'model',    'claude-3-5-haiku-20241022',
        'key_env',  'ANTHROPIC_API_KEY'
      )
    ),
    'cost_per_1k', jsonb_build_object(
      'gpt-4o-mini',                  jsonb_build_object('prompt', 0.00015, 'completion', 0.0006),
      'gpt-4o',                       jsonb_build_object('prompt', 0.0025,  'completion', 0.01),
      'claude-3-5-haiku-20241022',    jsonb_build_object('prompt', 0.0008,  'completion', 0.004)
    )
  )
)
WHERE slug = 'ai.completion';

-- ── ai.embedding: OpenAI text-embedding-3-small, no fallback ─────────────
UPDATE system.agents
SET metadata = metadata || jsonb_build_object(
  'router', jsonb_build_object(
    'kind', 'embedding',
    'primary', jsonb_build_object(
      'provider', 'openai',
      'model',    'text-embedding-3-small',
      'key_env',  'OPENAI_API_KEY'
    ),
    'fallbacks', '[]'::jsonb,
    'cost_per_1k', jsonb_build_object(
      'text-embedding-3-small', jsonb_build_object('prompt', 0.00002, 'completion', 0),
      'text-embedding-3-large', jsonb_build_object('prompt', 0.00013, 'completion', 0)
    )
  )
)
WHERE slug = 'ai.embedding';

-- ── ai.rag: same provider chain as completion ────────────────────────────
UPDATE system.agents
SET metadata = metadata || jsonb_build_object(
  'router', jsonb_build_object(
    'kind', 'chat',
    'primary', jsonb_build_object(
      'provider', 'openai',
      'model',    'gpt-4o-mini',
      'key_env',  'OPENAI_API_KEY',
      'timeout_ms', 8000
    ),
    'fallbacks', jsonb_build_array(
      jsonb_build_object(
        'provider', 'anthropic',
        'model',    'claude-3-5-haiku-20241022',
        'key_env',  'ANTHROPIC_API_KEY'
      )
    ),
    'cost_per_1k', jsonb_build_object(
      'gpt-4o-mini',               jsonb_build_object('prompt', 0.00015, 'completion', 0.0006),
      'claude-3-5-haiku-20241022', jsonb_build_object('prompt', 0.0008,  'completion', 0.004)
    )
  )
)
WHERE slug = 'ai.rag';

-- ── ai.tool_use: declares config for completeness, but the adapter does
--   not call the model directly (it materialises a proposed dispatch and
--   defers to the L5 inbox). Recorded so the agent inspector shows a
--   consistent posture across all four AI agents.
UPDATE system.agents
SET metadata = metadata || jsonb_build_object(
  'router', jsonb_build_object(
    'kind', 'chat',
    'primary', jsonb_build_object(
      'provider', 'openai',
      'model',    'gpt-4o-mini',
      'key_env',  'OPENAI_API_KEY'
    ),
    'fallbacks', jsonb_build_array(
      jsonb_build_object(
        'provider', 'anthropic',
        'model',    'claude-3-5-haiku-20241022',
        'key_env',  'ANTHROPIC_API_KEY'
      )
    ),
    'cost_per_1k', jsonb_build_object(
      'gpt-4o-mini',               jsonb_build_object('prompt', 0.00015, 'completion', 0.0006),
      'claude-3-5-haiku-20241022', jsonb_build_object('prompt', 0.0008,  'completion', 0.004)
    )
  )
)
WHERE slug = 'ai.tool_use';

-- ── Documentation comment on the column ──────────────────────────────────
COMMENT ON COLUMN system.agents.metadata IS
  'Free-form JSONB for agent-specific configuration. Reserved keys: ' ||
  '`router` (LB1 follow-up 4 #837) — { kind, primary, fallbacks, cost_per_1k }. ' ||
  'API-key env-var NAMES live here; actual secret values stay in env vars.';
