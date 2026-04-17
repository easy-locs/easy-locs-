-- ============================================================================
-- Phase 2 — Sovereign Internal Agent Control Layer · L1 (task #808)
--
-- Introduces the platform-native agent registry:
--   1. system.policy_profiles      — named, reusable governance bundles
--   2. system.agents               — first-class agent records (any kind)
--   3. system.agent_versions       — append-only version history per agent
--   4. system.agent_capabilities   — (domain, task_type) ownership map
--   5. system.v_agents_overview    — single-row-per-agent dashboard view
--   6. RPCs:
--        - system.register_agent
--        - system.bump_agent_version
--        - system.set_agent_status
--        - system.attach_capability
--        - system.set_policy_profile
--        - system.lookup_agent_for_task
--        - system.resolve_capability
--   7. New columns on system.execution_tasks: agent_id, agent_version_id
--   8. Updated system.dispatch_execution_task that stamps agent metadata on
--      every dispatched task; opt-in fail-closed mode for unregistered
--      (domain, task_type) pairs (controlled by GUC, defaults OFF until L7
--      completes the migration sweep).
--   9. Seed rows for the marketplace.publish / marketplace.unpublish agents.
--
-- Hard contract:
--   - `agent_kind` is FREE TEXT validated by a CHECK constraint we can extend
--     without ALTER TYPE. Documented canonical values:
--       business.adapter, ai.router, ai.tool, ops.scheduler,
--       dev.builder, dev.reviewer, dev.deployer, asis.cognitive,
--       system.internal
--     Other values are allowed as long as they match `^[a-z][a-z0-9_]*\.[a-z][a-z0-9_]*$`.
--   - A policy profile is a named bundle reusable across kinds — a future
--     dev.builder agent will reuse the same `dev-default` profile shape.
--   - One adapter per (domain, task_type), one capability row per pair, the
--     agent that owns the capability is the canonical agent for that pair.
-- ============================================================================

-- ── 1. policy_profiles ────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS system.policy_profiles (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug                  TEXT NOT NULL UNIQUE,
  description           TEXT,
  approval_required     BOOLEAN NOT NULL DEFAULT FALSE,
  risk_floor            system.execution_task_risk NOT NULL DEFAULT 'SAFE',
  max_cost_per_run_usd  NUMERIC(12,4),
  max_runs_per_min      INT,
  max_runs_per_day      INT,
  allowed_environments  TEXT[] NOT NULL DEFAULT ARRAY['production','staging','development']::TEXT[],
  metadata              JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_policy_profiles_slug ON system.policy_profiles(slug);

-- ── 2. agents ─────────────────────────────────────────────────────────────
-- agent_kind is intentionally TEXT (NOT enum) so future kinds can be added
-- by a single seed row without ALTER TYPE. The CHECK below allows the well-
-- known canonical kinds AND any future "<namespace>.<kind>" pattern.
CREATE TABLE IF NOT EXISTS system.agents (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug                TEXT NOT NULL UNIQUE,
  display_name        TEXT NOT NULL,
  agent_kind          TEXT NOT NULL,
  owner_team          TEXT,
  status              TEXT NOT NULL DEFAULT 'active',
  canary_pct          INT  NOT NULL DEFAULT 100,
  sla_target_ms       INT,
  quotas              JSONB NOT NULL DEFAULT '{}'::jsonb,
  metadata            JSONB NOT NULL DEFAULT '{}'::jsonb,
  policy_profile_id   UUID REFERENCES system.policy_profiles(id) ON DELETE SET NULL,
  current_version_id  UUID,  -- FK added after agent_versions exists
  last_health_status  TEXT,
  last_health_at      TIMESTAMPTZ,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT agents_kind_chk CHECK (
    agent_kind ~ '^[a-z][a-z0-9_]*\.[a-z][a-z0-9_]*$'
  ),
  CONSTRAINT agents_status_chk CHECK (
    status IN ('active','disabled','canary','deprecated')
  ),
  CONSTRAINT agents_canary_pct_chk CHECK (canary_pct BETWEEN 0 AND 100)
);

CREATE INDEX IF NOT EXISTS idx_agents_kind   ON system.agents(agent_kind);
CREATE INDEX IF NOT EXISTS idx_agents_status ON system.agents(status);
CREATE INDEX IF NOT EXISTS idx_agents_owner  ON system.agents(owner_team);

-- ── 3. agent_versions ─────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS system.agent_versions (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id        UUID NOT NULL REFERENCES system.agents(id) ON DELETE CASCADE,
  version         TEXT NOT NULL,
  released_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  released_by     TEXT,
  changelog       TEXT,
  metadata        JSONB NOT NULL DEFAULT '{}'::jsonb,
  CONSTRAINT agent_versions_unique UNIQUE (agent_id, version)
);

CREATE INDEX IF NOT EXISTS idx_agent_versions_agent ON system.agent_versions(agent_id, released_at DESC);

-- Now wire the FK on agents.current_version_id
DO $$ BEGIN
  ALTER TABLE system.agents
    ADD CONSTRAINT agents_current_version_fk
    FOREIGN KEY (current_version_id)
    REFERENCES system.agent_versions(id) ON DELETE SET NULL;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ── 4. agent_capabilities ─────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS system.agent_capabilities (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id      UUID NOT NULL REFERENCES system.agents(id) ON DELETE CASCADE,
  domain        TEXT NOT NULL,
  task_type     TEXT NOT NULL,
  metadata      JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT agent_capabilities_unique UNIQUE (domain, task_type)
);

CREATE INDEX IF NOT EXISTS idx_agent_capabilities_agent ON system.agent_capabilities(agent_id);

-- ── touch_updated_at triggers ────────────────────────────────────────────
CREATE OR REPLACE FUNCTION system.touch_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$;

DROP TRIGGER IF EXISTS trg_policy_profiles_touch ON system.policy_profiles;
CREATE TRIGGER trg_policy_profiles_touch
  BEFORE UPDATE ON system.policy_profiles
  FOR EACH ROW EXECUTE FUNCTION system.touch_updated_at();

DROP TRIGGER IF EXISTS trg_agents_touch ON system.agents;
CREATE TRIGGER trg_agents_touch
  BEFORE UPDATE ON system.agents
  FOR EACH ROW EXECUTE FUNCTION system.touch_updated_at();

-- ── 5. RLS ────────────────────────────────────────────────────────────────
-- Read: any authenticated user (registry is non-secret).
-- Write: service_role only (RPCs run SECURITY DEFINER under owner; UI calls
-- go through admin-gated RPCs below).
ALTER TABLE system.policy_profiles    ENABLE ROW LEVEL SECURITY;
ALTER TABLE system.agents             ENABLE ROW LEVEL SECURITY;
ALTER TABLE system.agent_versions     ENABLE ROW LEVEL SECURITY;
ALTER TABLE system.agent_capabilities ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY policy_profiles_read ON system.policy_profiles
    FOR SELECT TO authenticated USING (TRUE);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE POLICY policy_profiles_service ON system.policy_profiles
    FOR ALL TO service_role USING (TRUE) WITH CHECK (TRUE);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY agents_read ON system.agents
    FOR SELECT TO authenticated USING (TRUE);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE POLICY agents_service ON system.agents
    FOR ALL TO service_role USING (TRUE) WITH CHECK (TRUE);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY agent_versions_read ON system.agent_versions
    FOR SELECT TO authenticated USING (TRUE);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE POLICY agent_versions_service ON system.agent_versions
    FOR ALL TO service_role USING (TRUE) WITH CHECK (TRUE);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY agent_capabilities_read ON system.agent_capabilities
    FOR SELECT TO authenticated USING (TRUE);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE POLICY agent_capabilities_service ON system.agent_capabilities
    FOR ALL TO service_role USING (TRUE) WITH CHECK (TRUE);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

GRANT SELECT ON system.policy_profiles, system.agents,
                system.agent_versions, system.agent_capabilities
  TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE
  ON system.policy_profiles, system.agents,
     system.agent_versions, system.agent_capabilities
  TO service_role;

-- ── 6. Helper: caller-must-be-admin (or service_role) ────────────────────
CREATE OR REPLACE FUNCTION system._assert_admin_or_service()
RETURNS VOID LANGUAGE plpgsql AS $$
DECLARE v_caller UUID := auth.uid();
BEGIN
  IF v_caller IS NULL THEN RETURN; END IF; -- service_role bypass
  IF NOT public.has_role(v_caller, 'admin'::public.app_role) THEN
    RAISE EXCEPTION 'agents: caller % is not an admin', v_caller
      USING ERRCODE = '42501';
  END IF;
END;
$$;
REVOKE ALL ON FUNCTION system._assert_admin_or_service() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION system._assert_admin_or_service()
  TO authenticated, service_role;

-- ── 7. RPC: register_agent (idempotent upsert on slug) ───────────────────
CREATE OR REPLACE FUNCTION system.register_agent(
  p_slug              TEXT,
  p_display_name      TEXT,
  p_agent_kind        TEXT,
  p_initial_version   TEXT DEFAULT '1.0.0',
  p_owner_team        TEXT DEFAULT NULL,
  p_status            TEXT DEFAULT 'active',
  p_policy_profile    TEXT DEFAULT NULL,
  p_quotas            JSONB DEFAULT '{}'::jsonb,
  p_metadata          JSONB DEFAULT '{}'::jsonb,
  p_capabilities      JSONB DEFAULT '[]'::jsonb,  -- [{"domain":"x","task_type":"Y"}]
  p_changelog         TEXT DEFAULT NULL
) RETURNS system.agents
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, system
AS $$
DECLARE
  v_agent     system.agents;
  v_version   system.agent_versions;
  v_profile   UUID;
  v_cap       JSONB;
BEGIN
  PERFORM system._assert_admin_or_service();

  IF p_policy_profile IS NOT NULL THEN
    SELECT id INTO v_profile FROM system.policy_profiles WHERE slug = p_policy_profile;
  END IF;

  -- upsert agent
  INSERT INTO system.agents (
    slug, display_name, agent_kind, owner_team, status,
    quotas, metadata, policy_profile_id
  ) VALUES (
    p_slug, p_display_name, p_agent_kind,
    NULLIF(BTRIM(p_owner_team), ''),
    COALESCE(p_status, 'active'),
    COALESCE(p_quotas, '{}'::jsonb),
    COALESCE(p_metadata, '{}'::jsonb),
    v_profile
  )
  ON CONFLICT (slug) DO UPDATE
    SET display_name      = EXCLUDED.display_name,
        agent_kind        = EXCLUDED.agent_kind,
        owner_team        = COALESCE(EXCLUDED.owner_team, system.agents.owner_team),
        quotas            = COALESCE(EXCLUDED.quotas, system.agents.quotas),
        metadata          = system.agents.metadata || EXCLUDED.metadata,
        policy_profile_id = COALESCE(EXCLUDED.policy_profile_id, system.agents.policy_profile_id)
  RETURNING * INTO v_agent;

  -- upsert version
  INSERT INTO system.agent_versions (agent_id, version, changelog)
  VALUES (v_agent.id, p_initial_version, p_changelog)
  ON CONFLICT (agent_id, version) DO UPDATE
    SET changelog = COALESCE(EXCLUDED.changelog, system.agent_versions.changelog)
  RETURNING * INTO v_version;

  -- pin current_version_id if not yet set
  IF v_agent.current_version_id IS NULL THEN
    UPDATE system.agents
       SET current_version_id = v_version.id
     WHERE id = v_agent.id
    RETURNING * INTO v_agent;
  END IF;

  -- attach capabilities (idempotent)
  IF p_capabilities IS NOT NULL AND jsonb_typeof(p_capabilities) = 'array' THEN
    FOR v_cap IN SELECT * FROM jsonb_array_elements(p_capabilities)
    LOOP
      INSERT INTO system.agent_capabilities (agent_id, domain, task_type)
      VALUES (
        v_agent.id,
        v_cap->>'domain',
        v_cap->>'task_type'
      )
      ON CONFLICT (domain, task_type) DO UPDATE
        SET agent_id = EXCLUDED.agent_id;
    END LOOP;
  END IF;

  -- audit
  BEGIN
    INSERT INTO public.engine_run_logs (
      engine_name, category, status, started_at, finished_at, duration_ms,
      effect_summary, metadata_json, trigger_source
    ) VALUES (
      'agent-registry', 'agent.registered', 'ok', now(), now(), 0,
      format('AGENT_REGISTERED slug=%s kind=%s version=%s', v_agent.slug, v_agent.agent_kind, v_version.version),
      jsonb_build_object('agent_id', v_agent.id, 'version_id', v_version.id, 'capabilities', p_capabilities),
      'register_agent_rpc'
    );
  EXCEPTION WHEN OTHERS THEN NULL; END;

  RETURN v_agent;
END;
$$;
REVOKE ALL ON FUNCTION system.register_agent(
  TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, JSONB, JSONB, JSONB, TEXT
) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION system.register_agent(
  TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, JSONB, JSONB, JSONB, TEXT
) TO authenticated, service_role;

-- ── 8. RPC: bump_agent_version ───────────────────────────────────────────
CREATE OR REPLACE FUNCTION system.bump_agent_version(
  p_slug      TEXT,
  p_version   TEXT,
  p_changelog TEXT DEFAULT NULL,
  p_metadata  JSONB DEFAULT '{}'::jsonb
) RETURNS system.agent_versions
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, system
AS $$
DECLARE v_agent system.agents; v_version system.agent_versions;
BEGIN
  PERFORM system._assert_admin_or_service();
  SELECT * INTO v_agent FROM system.agents WHERE slug = p_slug;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'agents: unknown slug %', p_slug USING ERRCODE = '23503';
  END IF;
  INSERT INTO system.agent_versions (agent_id, version, changelog, metadata)
  VALUES (v_agent.id, p_version, p_changelog, COALESCE(p_metadata, '{}'::jsonb))
  ON CONFLICT (agent_id, version) DO UPDATE
    SET changelog = COALESCE(EXCLUDED.changelog, system.agent_versions.changelog),
        metadata  = system.agent_versions.metadata || EXCLUDED.metadata
  RETURNING * INTO v_version;
  UPDATE system.agents SET current_version_id = v_version.id WHERE id = v_agent.id;

  BEGIN
    INSERT INTO public.engine_run_logs (
      engine_name, category, status, started_at, finished_at, duration_ms,
      effect_summary, metadata_json, trigger_source
    ) VALUES (
      'agent-registry', 'agent.version_bumped', 'ok', now(), now(), 0,
      format('AGENT_VERSION_BUMPED slug=%s version=%s', v_agent.slug, p_version),
      jsonb_build_object('agent_id', v_agent.id, 'version_id', v_version.id),
      'bump_agent_version_rpc'
    );
  EXCEPTION WHEN OTHERS THEN NULL; END;

  RETURN v_version;
END;
$$;
REVOKE ALL ON FUNCTION system.bump_agent_version(TEXT, TEXT, TEXT, JSONB) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION system.bump_agent_version(TEXT, TEXT, TEXT, JSONB)
  TO authenticated, service_role;

-- ── 9. RPC: set_agent_status ─────────────────────────────────────────────
CREATE OR REPLACE FUNCTION system.set_agent_status(
  p_slug TEXT,
  p_status TEXT,
  p_canary_pct INT DEFAULT NULL
) RETURNS system.agents
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, system
AS $$
DECLARE v_agent system.agents;
BEGIN
  PERFORM system._assert_admin_or_service();
  IF p_status NOT IN ('active','disabled','canary','deprecated') THEN
    RAISE EXCEPTION 'agents: invalid status %', p_status USING ERRCODE = '22023';
  END IF;
  UPDATE system.agents
     SET status = p_status,
         canary_pct = COALESCE(p_canary_pct, system.agents.canary_pct)
   WHERE slug = p_slug
  RETURNING * INTO v_agent;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'agents: unknown slug %', p_slug USING ERRCODE = '23503';
  END IF;

  BEGIN
    INSERT INTO public.engine_run_logs (
      engine_name, category, status, started_at, finished_at, duration_ms,
      effect_summary, metadata_json, trigger_source
    ) VALUES (
      'agent-registry', 'agent.status_changed', 'ok', now(), now(), 0,
      format('AGENT_STATUS_CHANGED slug=%s status=%s canary=%s',
             v_agent.slug, v_agent.status, v_agent.canary_pct),
      jsonb_build_object('agent_id', v_agent.id),
      'set_agent_status_rpc'
    );
  EXCEPTION WHEN OTHERS THEN NULL; END;

  RETURN v_agent;
END;
$$;
REVOKE ALL ON FUNCTION system.set_agent_status(TEXT, TEXT, INT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION system.set_agent_status(TEXT, TEXT, INT)
  TO authenticated, service_role;

-- ── 10. RPC: attach_capability ───────────────────────────────────────────
CREATE OR REPLACE FUNCTION system.attach_capability(
  p_slug TEXT, p_domain TEXT, p_task_type TEXT, p_metadata JSONB DEFAULT '{}'::jsonb
) RETURNS system.agent_capabilities
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, system
AS $$
DECLARE v_agent system.agents; v_cap system.agent_capabilities;
BEGIN
  PERFORM system._assert_admin_or_service();
  SELECT * INTO v_agent FROM system.agents WHERE slug = p_slug;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'agents: unknown slug %', p_slug USING ERRCODE = '23503';
  END IF;
  INSERT INTO system.agent_capabilities (agent_id, domain, task_type, metadata)
  VALUES (v_agent.id, p_domain, p_task_type, COALESCE(p_metadata, '{}'::jsonb))
  ON CONFLICT (domain, task_type) DO UPDATE
    SET agent_id = EXCLUDED.agent_id,
        metadata = system.agent_capabilities.metadata || EXCLUDED.metadata
  RETURNING * INTO v_cap;
  RETURN v_cap;
END;
$$;
REVOKE ALL ON FUNCTION system.attach_capability(TEXT, TEXT, TEXT, JSONB) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION system.attach_capability(TEXT, TEXT, TEXT, JSONB)
  TO authenticated, service_role;

-- ── 11. RPC: set_policy_profile ──────────────────────────────────────────
CREATE OR REPLACE FUNCTION system.set_policy_profile(
  p_slug TEXT, p_profile_slug TEXT
) RETURNS system.agents
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, system
AS $$
DECLARE v_agent system.agents; v_profile UUID;
BEGIN
  PERFORM system._assert_admin_or_service();
  SELECT id INTO v_profile FROM system.policy_profiles WHERE slug = p_profile_slug;
  IF v_profile IS NULL THEN
    RAISE EXCEPTION 'agents: unknown policy profile %', p_profile_slug USING ERRCODE = '23503';
  END IF;
  UPDATE system.agents SET policy_profile_id = v_profile WHERE slug = p_slug
    RETURNING * INTO v_agent;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'agents: unknown slug %', p_slug USING ERRCODE = '23503';
  END IF;
  RETURN v_agent;
END;
$$;
REVOKE ALL ON FUNCTION system.set_policy_profile(TEXT, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION system.set_policy_profile(TEXT, TEXT)
  TO authenticated, service_role;

-- ── 12. Lookup: resolve agent + version for a (domain, task_type) ────────
CREATE OR REPLACE FUNCTION system.resolve_capability(
  p_domain TEXT, p_task_type TEXT
) RETURNS TABLE (agent_id UUID, agent_version_id UUID, agent_slug TEXT, agent_status TEXT)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public, system
AS $$
  SELECT a.id, a.current_version_id, a.slug, a.status
    FROM system.agent_capabilities c
    JOIN system.agents a ON a.id = c.agent_id
   WHERE c.domain = p_domain
     AND c.task_type = p_task_type
   LIMIT 1;
$$;
REVOKE ALL ON FUNCTION system.resolve_capability(TEXT, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION system.resolve_capability(TEXT, TEXT)
  TO authenticated, service_role;

CREATE OR REPLACE FUNCTION system.lookup_agent_for_task(p_task_id UUID)
RETURNS TABLE (agent_id UUID, agent_version_id UUID, agent_slug TEXT, agent_status TEXT)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public, system
AS $$
  SELECT r.*
    FROM system.execution_tasks t
    JOIN LATERAL system.resolve_capability(t.domain, t.type) r ON TRUE
   WHERE t.id = p_task_id;
$$;
REVOKE ALL ON FUNCTION system.lookup_agent_for_task(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION system.lookup_agent_for_task(UUID)
  TO authenticated, service_role;

-- ── 13. New columns on execution_tasks (nullable for backwards compat) ───
ALTER TABLE system.execution_tasks
  ADD COLUMN IF NOT EXISTS agent_id          UUID REFERENCES system.agents(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS agent_version_id  UUID REFERENCES system.agent_versions(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_execution_tasks_agent
  ON system.execution_tasks(agent_id) WHERE agent_id IS NOT NULL;

-- ── 14. agents_overview view ─────────────────────────────────────────────
CREATE OR REPLACE VIEW system.v_agents_overview AS
SELECT
  a.id,
  a.slug,
  a.display_name,
  a.agent_kind,
  a.owner_team,
  a.status,
  a.canary_pct,
  a.sla_target_ms,
  a.quotas,
  a.metadata,
  a.last_health_status,
  a.last_health_at,
  v.id      AS current_version_id,
  v.version AS current_version,
  v.released_at AS current_version_released_at,
  pp.slug   AS policy_profile_slug,
  pp.approval_required,
  pp.risk_floor,
  pp.max_runs_per_min,
  pp.max_runs_per_day,
  COALESCE(
    (SELECT jsonb_agg(jsonb_build_object('domain', c.domain, 'task_type', c.task_type)
            ORDER BY c.domain, c.task_type)
       FROM system.agent_capabilities c WHERE c.agent_id = a.id),
    '[]'::jsonb
  ) AS capabilities,
  (SELECT t.id FROM system.execution_tasks t
     WHERE t.agent_id = a.id
     ORDER BY COALESCE(t.completed_at, t.failed_at, t.updated_at) DESC NULLS LAST
     LIMIT 1) AS last_run_task_id,
  (SELECT COALESCE(t.completed_at, t.failed_at, t.updated_at) FROM system.execution_tasks t
     WHERE t.agent_id = a.id
     ORDER BY COALESCE(t.completed_at, t.failed_at, t.updated_at) DESC NULLS LAST
     LIMIT 1) AS last_run_at,
  a.created_at,
  a.updated_at
FROM system.agents a
LEFT JOIN system.agent_versions v  ON v.id  = a.current_version_id
LEFT JOIN system.policy_profiles pp ON pp.id = a.policy_profile_id;

GRANT SELECT ON system.v_agents_overview TO authenticated, service_role;

-- ── 15. Wire dispatch_execution_task to stamp agent_id / agent_version_id ─
-- We extend the existing v2 function. The fail-closed "AGENT_NOT_REGISTERED"
-- behaviour is opt-in via the per-domain `metadata->>'strict_routing'` flag
-- on the agent (default OFF), AND a global GUC `system.agent_strict_routing`
-- (default OFF). L7 will flip the global flag once all domains are migrated.
CREATE OR REPLACE FUNCTION system.dispatch_execution_task(
  p_type              TEXT,
  p_domain            TEXT,
  p_risk_level        system.execution_task_risk,
  p_status            system.execution_task_status,
  p_payload           JSONB DEFAULT '{}'::jsonb,
  p_requested_by      TEXT  DEFAULT 'system',
  p_parent_task_id    UUID  DEFAULT NULL,
  p_max_attempts      INT   DEFAULT 3,
  p_approved_by       TEXT  DEFAULT NULL,
  p_blocked_reason    TEXT  DEFAULT NULL,
  p_idempotency_key   TEXT  DEFAULT NULL,
  p_root_task_id      UUID  DEFAULT NULL,
  p_correlation_id    TEXT  DEFAULT NULL,
  p_entity_type       TEXT  DEFAULT NULL,
  p_entity_id         TEXT  DEFAULT NULL,
  p_approval_policy   TEXT  DEFAULT 'none',
  p_requires_approval BOOLEAN DEFAULT FALSE,
  p_retry_policy      JSONB DEFAULT NULL
) RETURNS system.execution_tasks
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, system
AS $$
DECLARE
  v_caller       UUID := auth.uid();
  v_existing     system.execution_tasks;
  v_row          system.execution_tasks;
  v_approved_by  TEXT := NULLIF(BTRIM(p_approved_by), '');
  v_approved_at  TIMESTAMPTZ := NULL;
  v_server_risk  system.execution_task_risk;
  v_status       system.execution_task_status := p_status;
  v_blocked_rsn  TEXT := p_blocked_reason;
  v_normalized_t TEXT := UPPER(BTRIM(COALESCE(p_type, '')));
  v_policy       TEXT := COALESCE(NULLIF(BTRIM(p_approval_policy), ''), 'none');
  v_agent_id     UUID;
  v_agent_ver    UUID;
  v_agent_slug   TEXT;
  v_agent_status TEXT;
  v_strict       BOOLEAN := FALSE;
BEGIN
  IF v_caller IS NOT NULL THEN
    IF NOT public.has_role(v_caller, 'admin'::public.app_role) THEN
      RAISE EXCEPTION 'execution_tasks dispatch denied: caller % is not an admin', v_caller
        USING ERRCODE = '42501';
    END IF;
  END IF;

  IF p_idempotency_key IS NOT NULL AND BTRIM(p_idempotency_key) <> '' THEN
    SELECT * INTO v_existing
      FROM system.execution_tasks
     WHERE idempotency_key = p_idempotency_key
       AND status IN ('pending_review','approved','queued','running','blocked','failed')
     LIMIT 1;
    IF FOUND THEN RETURN v_existing; END IF;
  END IF;

  IF v_status NOT IN ('draft','pending_review','approved','queued','blocked') THEN
    RAISE EXCEPTION 'execution_tasks dispatch denied: status % not allowed at creation', v_status
      USING ERRCODE = '22023';
  END IF;

  v_server_risk := system.classify_task_risk(v_normalized_t);
  IF v_server_risk <> p_risk_level THEN
    v_blocked_rsn := COALESCE(v_blocked_rsn, '') ||
      CASE WHEN COALESCE(v_blocked_rsn,'') = '' THEN '' ELSE ' | ' END ||
      format('RISK_MISMATCH: client=%s server=%s', p_risk_level, v_server_risk);
  END IF;

  IF v_server_risk = 'CRITICAL' THEN
    v_status := 'blocked';
    v_approved_by := NULL;
    v_blocked_rsn := COALESCE(v_blocked_rsn, '') ||
      CASE WHEN COALESCE(v_blocked_rsn,'') = '' THEN '' ELSE ' | ' END ||
      'PHASE1_CRITICAL_FORBIDDEN: CRITICAL task types cannot execute in phase 1';
  END IF;

  IF p_requires_approval AND v_status = 'queued' AND v_server_risk <> 'CRITICAL' THEN
    v_status := 'pending_review';
  END IF;

  -- ── Agent resolution ──
  SELECT r.agent_id, r.agent_version_id, r.agent_slug, r.agent_status
    INTO v_agent_id, v_agent_ver, v_agent_slug, v_agent_status
    FROM system.resolve_capability(p_domain, v_normalized_t) r;

  -- Strict routing (fail-closed): default ON. A (domain, task_type) pair
  -- with no registered capability is dispatched as `blocked` with
  -- `AGENT_NOT_REGISTERED`. The behaviour can be temporarily disabled per
  -- session via `SELECT set_config('system.agent_strict_routing','off',false);`
  -- — kept as an escape hatch only for the L7 migration sweep window.
  BEGIN
    v_strict := COALESCE(current_setting('system.agent_strict_routing', TRUE), 'on') <> 'off';
  EXCEPTION WHEN OTHERS THEN v_strict := TRUE; END;

  IF v_agent_id IS NULL AND v_strict THEN
    v_status := 'blocked';
    v_blocked_rsn := COALESCE(v_blocked_rsn, '') ||
      CASE WHEN COALESCE(v_blocked_rsn,'') = '' THEN '' ELSE ' | ' END ||
      format('AGENT_NOT_REGISTERED: no capability for (%s, %s)', p_domain, v_normalized_t);
  END IF;

  IF v_agent_id IS NOT NULL AND v_agent_status = 'disabled' THEN
    v_status := 'blocked';
    v_blocked_rsn := COALESCE(v_blocked_rsn, '') ||
      CASE WHEN COALESCE(v_blocked_rsn,'') = '' THEN '' ELSE ' | ' END ||
      format('AGENT_DISABLED: agent %s is disabled', v_agent_slug);
  END IF;

  IF v_approved_by IS NOT NULL THEN v_approved_at := now(); END IF;

  INSERT INTO system.execution_tasks (
    type, domain, risk_level, status, payload, requested_by,
    parent_task_id, attempt_count, max_attempts, blocked_reason,
    approved_by, approved_at, idempotency_key,
    root_task_id, correlation_id, entity_type, entity_id,
    approval_policy, requires_approval, retry_policy,
    agent_id, agent_version_id
  ) VALUES (
    v_normalized_t, p_domain, v_server_risk, v_status,
    COALESCE(p_payload, '{}'::jsonb),
    COALESCE(NULLIF(BTRIM(p_requested_by), ''), 'system'),
    p_parent_task_id, 0, COALESCE(p_max_attempts, 3), v_blocked_rsn,
    v_approved_by, v_approved_at,
    NULLIF(BTRIM(p_idempotency_key), ''),
    p_root_task_id,
    NULLIF(BTRIM(p_correlation_id), ''),
    NULLIF(BTRIM(p_entity_type), ''),
    NULLIF(BTRIM(p_entity_id), ''),
    v_policy,
    COALESCE(p_requires_approval, FALSE),
    p_retry_policy,
    v_agent_id, v_agent_ver
  )
  RETURNING * INTO v_row;

  RETURN v_row;
EXCEPTION
  WHEN unique_violation THEN
    IF p_idempotency_key IS NOT NULL THEN
      SELECT * INTO v_existing
        FROM system.execution_tasks
       WHERE idempotency_key = p_idempotency_key
         AND status IN ('pending_review','approved','queued','running','blocked','failed')
       LIMIT 1;
      IF FOUND THEN RETURN v_existing; END IF;
    END IF;
    RAISE;
END;
$$;

REVOKE ALL ON FUNCTION system.dispatch_execution_task(
  TEXT, TEXT, system.execution_task_risk, system.execution_task_status,
  JSONB, TEXT, UUID, INT, TEXT, TEXT, TEXT,
  UUID, TEXT, TEXT, TEXT, TEXT, BOOLEAN, JSONB
) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION system.dispatch_execution_task(
  TEXT, TEXT, system.execution_task_risk, system.execution_task_status,
  JSONB, TEXT, UUID, INT, TEXT, TEXT, TEXT,
  UUID, TEXT, TEXT, TEXT, TEXT, BOOLEAN, JSONB
) TO authenticated, service_role;

-- ── 16. Seed: default policy profiles + marketplace agents ───────────────
INSERT INTO system.policy_profiles (slug, description, approval_required, risk_floor, max_runs_per_min, max_runs_per_day)
VALUES
  ('safe-default',     'Default for SAFE business adapters',  FALSE, 'SAFE',   600, 100000),
  ('medium-default',   'Default for MEDIUM business adapters',FALSE, 'MEDIUM', 120, 20000),
  ('medium-approval',  'MEDIUM with mandatory human approval',TRUE,  'MEDIUM', 60,  10000),
  ('critical-approval','CRITICAL — always pending_review',    TRUE,  'CRITICAL', 30, 1000),
  ('ai-default',       'Default for AI router agents (LB1)',  FALSE, 'MEDIUM', 300, 50000),
  ('ai-sensitive',     'AI with mandatory approval (LB1)',    TRUE,  'MEDIUM', 30,  5000),
  ('dev-default',      'Default for dev/build agents (Level C)', TRUE,  'MEDIUM', 30, 1000),
  ('asis-default',     'Default for ASIS cognitive modules',  TRUE,  'CRITICAL', 10, 200)
ON CONFLICT (slug) DO NOTHING;

-- Seed marketplace agents — first real agents on the platform.
DO $$
DECLARE v_publish UUID; v_unpublish UUID;
BEGIN
  PERFORM system.register_agent(
    p_slug            := 'marketplace.publish',
    p_display_name    := 'Marketplace Publish Agent',
    p_agent_kind      := 'business.adapter',
    p_initial_version := '1.0.0',
    p_owner_team      := 'marketplace',
    p_status          := 'active',
    p_policy_profile  := 'medium-approval',
    p_quotas          := jsonb_build_object('max_runs_per_min', 60, 'max_runs_per_day', 5000),
    p_metadata        := jsonb_build_object(
      'description', 'Publishes a property listing (status active) with KYC + verifier gates.',
      'rollback_strategy', 'auto',
      'verifier', 'marketplace.listing'
    ),
    p_capabilities    := jsonb_build_array(jsonb_build_object('domain','marketplace','task_type','MARKETPLACE.LISTING.PUBLISH')),
    p_changelog       := 'Initial registration as Level A · L1 first real agent.'
  );

  PERFORM system.register_agent(
    p_slug            := 'marketplace.unpublish',
    p_display_name    := 'Marketplace Unpublish Agent',
    p_agent_kind      := 'business.adapter',
    p_initial_version := '1.0.0',
    p_owner_team      := 'marketplace',
    p_status          := 'active',
    p_policy_profile  := 'medium-default',
    p_quotas          := jsonb_build_object('max_runs_per_min', 60, 'max_runs_per_day', 5000),
    p_metadata        := jsonb_build_object(
      'description', 'Unpublishes a property listing (status paused).',
      'rollback_strategy', 'auto',
      'verifier', 'marketplace.listing'
    ),
    p_capabilities    := jsonb_build_array(jsonb_build_object('domain','marketplace','task_type','MARKETPLACE.LISTING.UNPUBLISH')),
    p_changelog       := 'Initial registration as Level A · L1 first real agent.'
  );
END $$;
