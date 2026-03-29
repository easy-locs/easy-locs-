
-- WAVE 11: Final 2 custom findings

-- 1. phone_otp_sessions — make OTP write-only (no SELECT)
DROP POLICY IF EXISTS "strict_own_otp_read" ON public.phone_otp_sessions;

-- 2. abandoned_cart_events — fix NULL workspace_id bypass
DROP POLICY IF EXISTS "workspace_member_select_carts" ON public.abandoned_cart_events;
DROP POLICY IF EXISTS "workspace_member_insert_carts" ON public.abandoned_cart_events;
DROP POLICY IF EXISTS "workspace_member_update_carts" ON public.abandoned_cart_events;

CREATE POLICY "cart_owner_or_workspace" ON public.abandoned_cart_events
FOR SELECT TO authenticated USING (
  customer_user_id = auth.uid()
  OR (workspace_id IS NOT NULL AND is_workspace_member(workspace_id))
  OR public.has_role(auth.uid(), 'admin')
);
CREATE POLICY "cart_insert_scoped" ON public.abandoned_cart_events
FOR INSERT TO authenticated WITH CHECK (
  customer_user_id = auth.uid()
  OR (workspace_id IS NOT NULL AND is_workspace_member(workspace_id))
  OR public.has_role(auth.uid(), 'admin')
);
CREATE POLICY "cart_update_scoped" ON public.abandoned_cart_events
FOR UPDATE TO authenticated USING (
  customer_user_id = auth.uid()
  OR (workspace_id IS NOT NULL AND is_workspace_member(workspace_id))
  OR public.has_role(auth.uid(), 'admin')
);
