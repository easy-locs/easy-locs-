
-- Fix all security errors in one migration

-- 1. guest_sessions: remove open anon SELECT
DROP POLICY IF EXISTS "Anon can read own session" ON public.guest_sessions;

-- 2. guest_call_signals: remove open anon SELECT
DROP POLICY IF EXISTS "Anon can read own call signals" ON public.guest_call_signals;

-- 3. group_messages: fix self-comparison
DROP POLICY IF EXISTS "Members can view group messages" ON public.group_messages;
CREATE POLICY "Members can view group messages" ON public.group_messages FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.group_members gm WHERE gm.group_id = group_messages.group_id AND gm.user_id = auth.uid()));

DROP POLICY IF EXISTS "Members can send group messages" ON public.group_messages;
CREATE POLICY "Members can send group messages" ON public.group_messages FOR INSERT TO authenticated
  WITH CHECK (sender_id = auth.uid() AND EXISTS (SELECT 1 FROM public.group_members gm WHERE gm.group_id = group_messages.group_id AND gm.user_id = auth.uid()));

-- 4. group_members: fix self-comparison
DROP POLICY IF EXISTS "Members can view group members" ON public.group_members;
CREATE POLICY "Members can view group members" ON public.group_members FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.group_members gm2 WHERE gm2.group_id = group_members.group_id AND gm2.user_id = auth.uid()));

DROP POLICY IF EXISTS "Admins can manage members" ON public.group_members;
CREATE POLICY "Admins can manage members" ON public.group_members FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid() OR EXISTS (SELECT 1 FROM public.group_members gm WHERE gm.group_id = group_members.group_id AND gm.user_id = auth.uid() AND gm.role = 'admin'));

DROP POLICY IF EXISTS "Admins can remove members" ON public.group_members;
CREATE POLICY "Admins can remove members" ON public.group_members FOR DELETE TO authenticated
  USING (user_id = auth.uid() OR EXISTS (SELECT 1 FROM public.group_members gm WHERE gm.group_id = group_members.group_id AND gm.user_id = auth.uid() AND gm.role = 'admin'));

-- 5. booking_requests: remove PII leak
DROP POLICY IF EXISTS "Guests can read their own booking requests" ON public.booking_requests;

-- 6. user_presence: remove unrestricted read
DROP POLICY IF EXISTS "Authenticated users can read presence" ON public.user_presence;

-- 7. audit_logs: remove permissive insert
DROP POLICY IF EXISTS "Users insert own audit logs" ON public.audit_logs;
