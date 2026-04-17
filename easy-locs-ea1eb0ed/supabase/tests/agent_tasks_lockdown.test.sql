-- ============================================================================
-- LB Closeout #853 — public.agent_tasks lockdown regression suite
--
-- Verifies that after migration 20260429000000_agent_tasks_lockdown.sql:
--   • SELECT by row owner still works (legacy projection is preserved).
--   • INSERT by any authenticated user is denied.
--   • UPDATE by row owner is denied.
--   • DELETE by row owner is denied.
--
-- Run with:
--     psql "$DATABASE_URL" -f supabase/tests/agent_tasks_lockdown.test.sql
--
-- A clean run prints PASS lines and rolls back. Any FAIL aborts.
-- ============================================================================

BEGIN;

-- ── Setup ──────────────────────────────────────────────────────────────────
DO $$
DECLARE
  v_owner_uid UUID := '33333333-3333-3333-3333-333333333333';
BEGIN
  -- Seed an auth.users row + a pre-existing agent_tasks row owned by it
  -- (using service_role context, RLS bypassed).
  INSERT INTO auth.users (id, instance_id, email)
  VALUES (v_owner_uid, '00000000-0000-0000-0000-000000000000', 'lockdown-owner@test.local')
  ON CONFLICT (id) DO NOTHING;

  INSERT INTO public.agent_tasks (id, user_id, prompt, status)
  VALUES (
    '44444444-4444-4444-4444-444444444444',
    v_owner_uid,
    'pre-existing legacy row',
    'success'
  )
  ON CONFLICT (id) DO NOTHING;
  RAISE NOTICE 'PASS: setup seeded';
END $$;

-- ── 1. SELECT as owner still succeeds ──────────────────────────────────────
DO $$
DECLARE
  v_owner_uid UUID := '33333333-3333-3333-3333-333333333333';
  v_count     INT;
BEGIN
  PERFORM set_config('request.jwt.claim.sub', v_owner_uid::text, true);
  PERFORM set_config('role', 'authenticated', true);

  SET LOCAL ROLE authenticated;
  SELECT count(*) INTO v_count FROM public.agent_tasks WHERE user_id = v_owner_uid;
  IF v_count < 1 THEN
    RAISE EXCEPTION 'FAIL: owner SELECT returned no rows (expected legacy projection to remain readable)';
  END IF;
  RAISE NOTICE 'PASS: owner can still SELECT own agent_tasks';
END $$;

-- ── 2. INSERT is denied (RLS / privilege) ──────────────────────────────────
DO $$
DECLARE
  v_owner_uid UUID := '33333333-3333-3333-3333-333333333333';
BEGIN
  PERFORM set_config('request.jwt.claim.sub', v_owner_uid::text, true);
  SET LOCAL ROLE authenticated;

  BEGIN
    INSERT INTO public.agent_tasks (user_id, prompt) VALUES (v_owner_uid, 'should fail');
    RAISE EXCEPTION 'FAIL: owner INSERT was permitted — lockdown policy missing';
  EXCEPTION
    WHEN insufficient_privilege OR check_violation OR sqlstate '42501' THEN
      RAISE NOTICE 'PASS: owner INSERT correctly denied (%)', SQLERRM;
  END;
END $$;

-- ── 3. UPDATE is denied ───────────────────────────────────────────────────
DO $$
DECLARE
  v_owner_uid UUID := '33333333-3333-3333-3333-333333333333';
  v_rows      INT;
BEGIN
  PERFORM set_config('request.jwt.claim.sub', v_owner_uid::text, true);
  SET LOCAL ROLE authenticated;

  BEGIN
    UPDATE public.agent_tasks SET status = 'queued' WHERE user_id = v_owner_uid;
    GET DIAGNOSTICS v_rows = ROW_COUNT;
    IF v_rows > 0 THEN
      RAISE EXCEPTION 'FAIL: owner UPDATE modified % row(s) — lockdown policy missing', v_rows;
    END IF;
    RAISE NOTICE 'PASS: owner UPDATE silently affected zero rows (RLS denied)';
  EXCEPTION
    WHEN insufficient_privilege OR sqlstate '42501' THEN
      RAISE NOTICE 'PASS: owner UPDATE correctly denied (%)', SQLERRM;
  END;
END $$;

-- ── 4. DELETE is denied ───────────────────────────────────────────────────
DO $$
DECLARE
  v_owner_uid UUID := '33333333-3333-3333-3333-333333333333';
  v_rows      INT;
BEGIN
  PERFORM set_config('request.jwt.claim.sub', v_owner_uid::text, true);
  SET LOCAL ROLE authenticated;

  BEGIN
    DELETE FROM public.agent_tasks WHERE user_id = v_owner_uid;
    GET DIAGNOSTICS v_rows = ROW_COUNT;
    IF v_rows > 0 THEN
      RAISE EXCEPTION 'FAIL: owner DELETE removed % row(s) — lockdown policy missing', v_rows;
    END IF;
    RAISE NOTICE 'PASS: owner DELETE silently affected zero rows (RLS denied)';
  EXCEPTION
    WHEN insufficient_privilege OR sqlstate '42501' THEN
      RAISE NOTICE 'PASS: owner DELETE correctly denied (%)', SQLERRM;
  END;
END $$;

ROLLBACK;
