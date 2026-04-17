-- ============================================================================
-- L4 — /admin/agents cockpit (#813) · DB-layer auth regression suite
--
-- Verifies the privilege boundary on `system.set_agent_status`:
--   • super_admin succeeds
--   • plain admin is rejected with SQLSTATE 42501
--   • unauthenticated (no JWT subject) bypasses (service_role behaviour)
--
-- Run against a fresh DB after migrations are applied:
--     psql "$DATABASE_URL" -f supabase/tests/agent_set_status_super_admin.test.sql
--
-- A clean run prints PASS lines and rolls back. Any FAIL aborts.
-- ============================================================================

BEGIN;

-- ── Setup ──────────────────────────────────────────────────────────────────
DO $$
DECLARE
  v_agent system.agents;
BEGIN
  SELECT * INTO v_agent FROM system.register_agent(
    p_slug         => 'test.cockpit.guard',
    p_display_name => 'Cockpit Guard Test Agent',
    p_agent_kind   => 'business.adapter',
    p_initial_version => '1.0.0',
    p_capabilities => '[]'::jsonb
  );
  IF v_agent.id IS NULL THEN
    RAISE EXCEPTION 'FAIL: could not register test agent';
  END IF;
  RAISE NOTICE 'PASS: test agent registered';
END $$;

-- ── Seed two principals: a plain admin and a super_admin ───────────────────
DO $$
DECLARE
  v_admin_uid       UUID := '11111111-1111-1111-1111-111111111111';
  v_super_uid       UUID := '22222222-2222-2222-2222-222222222222';
BEGIN
  -- has_role reads from public.user_roles in this codebase.
  INSERT INTO public.user_roles (user_id, role)
    VALUES (v_admin_uid, 'admin'::public.app_role) ON CONFLICT DO NOTHING;
  INSERT INTO public.user_roles (user_id, role)
    VALUES (v_super_uid, 'super_admin'::public.app_role) ON CONFLICT DO NOTHING;
  RAISE NOTICE 'PASS: principals seeded';
END $$;

-- ── 1. plain admin must be REJECTED with 42501 ─────────────────────────────
DO $$
DECLARE
  v_caught BOOLEAN := false;
  v_sqlstate TEXT;
BEGIN
  PERFORM set_config(
    'request.jwt.claims',
    json_build_object('sub', '11111111-1111-1111-1111-111111111111')::text,
    true
  );
  BEGIN
    PERFORM system.set_agent_status('test.cockpit.guard', 'disabled', NULL);
  EXCEPTION WHEN OTHERS THEN
    v_caught := true;
    GET STACKED DIAGNOSTICS v_sqlstate = RETURNED_SQLSTATE;
  END;
  IF NOT v_caught THEN
    RAISE EXCEPTION 'FAIL: plain admin was allowed to set_agent_status';
  END IF;
  IF v_sqlstate <> '42501' THEN
    RAISE EXCEPTION 'FAIL: expected SQLSTATE 42501, got %', v_sqlstate;
  END IF;
  RAISE NOTICE 'PASS: plain admin rejected with 42501';
END $$;

-- ── 2. super_admin must SUCCEED ────────────────────────────────────────────
DO $$
DECLARE
  v_status TEXT;
BEGIN
  PERFORM set_config(
    'request.jwt.claims',
    json_build_object('sub', '22222222-2222-2222-2222-222222222222')::text,
    true
  );
  PERFORM system.set_agent_status('test.cockpit.guard', 'canary', 25);
  SELECT status INTO v_status
    FROM system.agents WHERE slug = 'test.cockpit.guard';
  IF v_status <> 'canary' THEN
    RAISE EXCEPTION 'FAIL: super_admin call did not flip status (got %)', v_status;
  END IF;
  RAISE NOTICE 'PASS: super_admin allowed; status flipped to canary';
END $$;

-- ── 3. service_role (no JWT subject) must SUCCEED ──────────────────────────
DO $$
DECLARE
  v_status TEXT;
BEGIN
  PERFORM set_config('request.jwt.claims', NULL, true);
  PERFORM system.set_agent_status('test.cockpit.guard', 'active', NULL);
  SELECT status INTO v_status
    FROM system.agents WHERE slug = 'test.cockpit.guard';
  IF v_status <> 'active' THEN
    RAISE EXCEPTION 'FAIL: service_role call did not flip status (got %)', v_status;
  END IF;
  RAISE NOTICE 'PASS: service_role bypass works';
END $$;

ROLLBACK;
