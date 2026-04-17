-- ════════════════════════════════════════════════════════════════════════
-- Sovereign Agent Control · L4 hardening (#813)
--
-- Closes a privilege boundary mismatch in the L1 agent registry:
--   - The /admin/agents cockpit is gated by `SuperAdminGate`
--     (super_admin only) at the route layer.
--   - But `system.set_agent_status` was guarded by
--     `system._assert_admin_or_service`, which accepts plain `admin`.
--   - An `admin` (non-super) could therefore call the RPC directly
--     via the API and bypass the cockpit boundary, flipping any
--     agent's lifecycle status (active/canary/disabled/deprecated).
--
-- Fix:
--   1. Add `system._assert_super_admin_or_service`  — same shape as
--      the existing helper, but checks the `super_admin` role.
--   2. Rebind `system.set_agent_status` to the new, stricter helper.
--
-- We deliberately leave `register_agent` / `bump_agent_version` on
-- the original `admin` helper because those are deploy-time RPCs run
-- by release pipelines (admin-class identities), not from the cockpit.
-- Agent status is the only run-time governance lever and must be
-- super_admin-locked to match L5 invariants.
-- ════════════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION system._assert_super_admin_or_service()
RETURNS VOID LANGUAGE plpgsql AS $$
DECLARE v_caller UUID := auth.uid();
BEGIN
  -- service_role calls (no JWT subject) bypass the role check, matching
  -- the pre-existing convention in `_assert_admin_or_service`.
  IF v_caller IS NULL THEN RETURN; END IF;
  IF NOT public.has_role(v_caller, 'super_admin'::public.app_role) THEN
    RAISE EXCEPTION 'agents: caller % is not a super_admin', v_caller
      USING ERRCODE = '42501';
  END IF;
END;
$$;

REVOKE ALL ON FUNCTION system._assert_super_admin_or_service() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION system._assert_super_admin_or_service()
  TO authenticated, service_role;

-- Rebind the run-time governance lever. Signature is preserved so the
-- client-side wrapper in `agents-repo.ts` keeps working unchanged.
CREATE OR REPLACE FUNCTION system.set_agent_status(
  p_slug        TEXT,
  p_status      TEXT,
  p_canary_pct  INT DEFAULT NULL
) RETURNS VOID
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, system AS $$
DECLARE
  v_agent_id UUID;
BEGIN
  PERFORM system._assert_super_admin_or_service();

  IF p_status NOT IN ('active','disabled','canary','deprecated') THEN
    RAISE EXCEPTION 'set_agent_status: invalid status %', p_status
      USING ERRCODE = '22023';
  END IF;
  IF p_canary_pct IS NOT NULL
     AND (p_canary_pct < 0 OR p_canary_pct > 100) THEN
    RAISE EXCEPTION 'set_agent_status: canary_pct must be 0..100'
      USING ERRCODE = '22023';
  END IF;

  UPDATE system.agents
     SET status      = p_status,
         canary_pct  = COALESCE(p_canary_pct, canary_pct),
         updated_at  = now()
   WHERE slug = p_slug
   RETURNING id INTO v_agent_id;

  IF v_agent_id IS NULL THEN
    RAISE EXCEPTION 'set_agent_status: unknown agent slug %', p_slug
      USING ERRCODE = 'P0002';
  END IF;

  -- Best-effort audit row; mirrors the prior implementation.
  BEGIN
    INSERT INTO public.agent_command_history
      (user_id, command_text, interpreted_intent, agents_used,
       result_summary, detailed_log, correlation_id)
    VALUES (
      auth.uid(),
      format('set_agent_status %s -> %s', p_slug, p_status),
      'set_agent_status',
      jsonb_build_array(jsonb_build_object('slug', p_slug, 'id', v_agent_id)),
      jsonb_build_object('status', p_status, 'canary_pct', p_canary_pct),
      jsonb_build_object(
        'slug', p_slug,
        'new_status', p_status,
        'new_canary_pct', p_canary_pct
      ),
      'set_agent_status_rpc'
    );
  EXCEPTION WHEN OTHERS THEN
    -- Audit must never block governance actions.
    NULL;
  END;
END;
$$;

REVOKE ALL ON FUNCTION system.set_agent_status(TEXT, TEXT, INT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION system.set_agent_status(TEXT, TEXT, INT)
  TO authenticated, service_role;

COMMENT ON FUNCTION system.set_agent_status(TEXT, TEXT, INT) IS
  'L4 (#813): super_admin-only lifecycle lever for registered agents. '
  'Audited via agent_command_history. The L4 cockpit (/admin/agents) is '
  'the canonical UI; direct RPC calls are equally constrained.';
