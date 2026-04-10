
-- ====================================================================
-- CRITICAL FIX 1: wallet_accounts — drop blanket true policies
-- ====================================================================
DROP POLICY IF EXISTS "wallet_accounts_select_auth" ON public.wallet_accounts;
DROP POLICY IF EXISTS "wallet_accounts_insert_auth" ON public.wallet_accounts;
DROP POLICY IF EXISTS "wallet_accounts_update_auth" ON public.wallet_accounts;

DROP POLICY IF EXISTS "Users update own wallets" ON public.wallet_accounts;
CREATE POLICY "Users update own wallets"
ON public.wallet_accounts FOR UPDATE TO authenticated
USING (owner_user_id = auth.uid())
WITH CHECK (owner_user_id = auth.uid());

-- ====================================================================
-- CRITICAL FIX 2: wallet_ledger_entries — drop blanket true policies
-- ====================================================================
DROP POLICY IF EXISTS "wallet_ledger_entries_select_auth" ON public.wallet_ledger_entries;
DROP POLICY IF EXISTS "wallet_ledger_entries_insert_auth" ON public.wallet_ledger_entries;

DROP POLICY IF EXISTS "Users insert own ledger" ON public.wallet_ledger_entries;
CREATE POLICY "Users insert own ledger"
ON public.wallet_ledger_entries FOR INSERT TO authenticated
WITH CHECK (
  wallet_account_id IN (
    SELECT id FROM public.wallet_accounts WHERE owner_user_id = auth.uid()
  )
);

-- ====================================================================
-- CRITICAL FIX 3: payment_requests — fix status=pending leak
-- ====================================================================
DROP POLICY IF EXISTS "payment_requests_select_own" ON public.payment_requests;
CREATE POLICY "payment_requests_select_own"
ON public.payment_requests FOR SELECT TO authenticated
USING (
  auth.uid() = requester_id
  OR auth.uid() = recipient_id
  OR auth.uid() = sender_id
  OR auth.uid() = paid_by
);

-- ====================================================================
-- CRITICAL FIX 4: refund_requests — replace blanket true
-- ====================================================================
DROP POLICY IF EXISTS "Authenticated users can manage refund_requests" ON public.refund_requests;

CREATE POLICY "refund_requests_select_own"
ON public.refund_requests FOR SELECT TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "refund_requests_insert_own"
ON public.refund_requests FOR INSERT TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "refund_requests_update_own"
ON public.refund_requests FOR UPDATE TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- ====================================================================
-- CRITICAL FIX 5: user_trust_graph — replace blanket true
-- ====================================================================
DROP POLICY IF EXISTS "Authenticated users can manage user_trust_graph" ON public.user_trust_graph;

CREATE POLICY "user_trust_graph_select_own"
ON public.user_trust_graph FOR SELECT TO authenticated
USING (auth.uid() = user_id);

-- ====================================================================
-- CRITICAL FIX 6: storefront_refund_policies — fix owner check
-- ====================================================================
DROP POLICY IF EXISTS "Owner manages refund policy" ON public.storefront_refund_policies;

CREATE POLICY "Owner manages refund policy"
ON public.storefront_refund_policies FOR ALL TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.storefront_pages sp
    WHERE sp.id = storefront_refund_policies.shop_id
      AND sp.user_id = auth.uid()
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.storefront_pages sp
    WHERE sp.id = storefront_refund_policies.shop_id
      AND sp.user_id = auth.uid()
  )
);

-- ====================================================================
-- CRITICAL FIX 7: dino_* tables — remove public role access
-- ====================================================================
DROP POLICY IF EXISTS "Service role full access on dino_entity_state" ON public.dino_entity_state;
DROP POLICY IF EXISTS "Service role full access on dino_media_rules" ON public.dino_media_rules;
DROP POLICY IF EXISTS "Service role full access on dino_notifications" ON public.dino_notifications;
DROP POLICY IF EXISTS "allow all insert notifications" ON public.dino_notifications;
DROP POLICY IF EXISTS "Service role full access on dino_page_audits" ON public.dino_page_audits;
DROP POLICY IF EXISTS "Service role full access on dino_quality_scores" ON public.dino_quality_scores;
DROP POLICY IF EXISTS "Service role full access on dino_route_registry" ON public.dino_route_registry;
DROP POLICY IF EXISTS "Service role full access on dino_sync_jobs" ON public.dino_sync_jobs;

-- ====================================================================
-- WARN FIX 8: executive_kpi_snapshots — restrict to service role
-- ====================================================================
DROP POLICY IF EXISTS "Authenticated users can insert executive_kpi_snapshots" ON public.executive_kpi_snapshots;
DROP POLICY IF EXISTS "Authenticated users can read executive_kpi_snapshots" ON public.executive_kpi_snapshots;
DROP POLICY IF EXISTS "Authenticated users can update executive_kpi_snapshots" ON public.executive_kpi_snapshots;

-- ====================================================================
-- WARN FIX 9: storefront_growth_metrics — remove anon access
-- ====================================================================
DROP POLICY IF EXISTS "System inserts growth metrics" ON public.storefront_growth_metrics;

-- ====================================================================
-- WARN FIX 10: call_signals — restrict to authenticated participants
-- ====================================================================
DROP POLICY IF EXISTS "anyone can read call signals" ON public.call_signals;

CREATE POLICY "participant reads call signals"
ON public.call_signals FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.call_sessions cs
    WHERE cs.id = call_signals.session_id::uuid
      AND (cs.initiator_id = auth.uid() OR cs.recipient_id = auth.uid())
  )
);

-- ====================================================================
-- WARN FIX 11: team_* tables — scope to workspace members
-- ====================================================================
DROP POLICY IF EXISTS "Authenticated users can manage team_tasks" ON public.team_tasks;
DROP POLICY IF EXISTS "Authenticated users can manage team_workspaces" ON public.team_workspaces;
DROP POLICY IF EXISTS "Authenticated users can manage team_workspace_members" ON public.team_workspace_members;

CREATE POLICY "team_workspaces_member_access"
ON public.team_workspaces FOR ALL TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.team_workspace_members twm
    WHERE twm.workspace_id = team_workspaces.id
      AND twm.user_id = auth.uid()
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.team_workspace_members twm
    WHERE twm.workspace_id = team_workspaces.id
      AND twm.user_id = auth.uid()
  )
);

CREATE POLICY "team_workspace_members_access"
ON public.team_workspace_members FOR ALL TO authenticated
USING (
  user_id = auth.uid()
  OR EXISTS (
    SELECT 1 FROM public.team_workspace_members twm2
    WHERE twm2.workspace_id = team_workspace_members.workspace_id
      AND twm2.user_id = auth.uid()
      AND twm2.role IN ('owner', 'admin')
  )
)
WITH CHECK (
  user_id = auth.uid()
  OR EXISTS (
    SELECT 1 FROM public.team_workspace_members twm2
    WHERE twm2.workspace_id = team_workspace_members.workspace_id
      AND twm2.user_id = auth.uid()
      AND twm2.role IN ('owner', 'admin')
  )
);

CREATE POLICY "team_tasks_member_access"
ON public.team_tasks FOR ALL TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.team_workspace_members twm
    WHERE twm.workspace_id = team_tasks.workspace_id
      AND twm.user_id = auth.uid()
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.team_workspace_members twm
    WHERE twm.workspace_id = team_tasks.workspace_id
      AND twm.user_id = auth.uid()
  )
);

-- ====================================================================
-- FIX 12: phone_otp_sessions — scope to own sessions
-- ====================================================================
DROP POLICY IF EXISTS "Users can insert own otp sessions" ON public.phone_otp_sessions;
DROP POLICY IF EXISTS "Users can read own otp sessions" ON public.phone_otp_sessions;
DROP POLICY IF EXISTS "Users can update own otp sessions" ON public.phone_otp_sessions;
DROP POLICY IF EXISTS "phone_otp_sessions_insert" ON public.phone_otp_sessions;
DROP POLICY IF EXISTS "phone_otp_sessions_select" ON public.phone_otp_sessions;
DROP POLICY IF EXISTS "phone_otp_sessions_update" ON public.phone_otp_sessions;

CREATE POLICY "otp_sessions_select_own"
ON public.phone_otp_sessions FOR SELECT TO authenticated
USING (user_id = auth.uid() OR user_id IS NULL);

CREATE POLICY "otp_sessions_insert_auth"
ON public.phone_otp_sessions FOR INSERT TO authenticated
WITH CHECK (user_id = auth.uid() OR user_id IS NULL);

CREATE POLICY "otp_sessions_update_own"
ON public.phone_otp_sessions FOR UPDATE TO authenticated
USING (user_id = auth.uid() OR user_id IS NULL)
WITH CHECK (user_id = auth.uid() OR user_id IS NULL);

-- ====================================================================
-- FIX 13: workspace_members security definer function
-- ====================================================================
CREATE OR REPLACE FUNCTION public.add_workspace_member(
  _workspace_id uuid,
  _user_id uuid,
  _role text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM public.workspace_members wm
    WHERE wm.workspace_id = _workspace_id
      AND wm.user_id = auth.uid()
      AND wm.role IN ('owner', 'admin')
  ) THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;
  IF _role NOT IN ('member', 'manager', 'admin') THEN
    RAISE EXCEPTION 'Invalid role';
  END IF;
  INSERT INTO public.workspace_members (workspace_id, user_id, role, status)
  VALUES (_workspace_id, _user_id, _role, 'active')
  ON CONFLICT DO NOTHING;
END;
$$;

GRANT EXECUTE ON FUNCTION public.add_workspace_member(uuid, uuid, text) TO authenticated;

-- ====================================================================
-- FIX 14: Harden all public functions search_path
-- ====================================================================
DO $$
DECLARE r RECORD;
BEGIN
  FOR r IN
    SELECT n.nspname AS schema_name, p.proname AS function_name,
           pg_get_function_identity_arguments(p.oid) AS args
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
  LOOP
    BEGIN
      EXECUTE format(
        'ALTER FUNCTION %I.%I(%s) SET search_path = public',
        r.schema_name, r.function_name, r.args
      );
    EXCEPTION WHEN OTHERS THEN
      NULL;
    END;
  END LOOP;
END $$;
