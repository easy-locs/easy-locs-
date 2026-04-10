
-- Fix audit_logs RLS: allow authenticated users to insert their own logs
DROP POLICY IF EXISTS "Users insert own audit logs" ON public.audit_logs;
CREATE POLICY "Users insert own audit logs"
  ON public.audit_logs
  FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

-- Also allow anon insert for system events (org_id NULL, user_id matches)
DROP POLICY IF EXISTS "Anon audit insert" ON public.audit_logs;

-- Increase inquiry quota from 5/hour to 20/hour
CREATE OR REPLACE FUNCTION public.check_inquiry_quota(_user_id uuid)
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT jsonb_build_object(
    'used', (
      SELECT count(*)::int
      FROM public.messages
      WHERE sender_id = _user_id
        AND message_type = 'inquiry'
        AND created_at > now() - interval '1 hour'
    ),
    'limit', 20,
    'allowed', (
      SELECT count(*) < 20
      FROM public.messages
      WHERE sender_id = _user_id
        AND message_type = 'inquiry'
        AND created_at > now() - interval '1 hour'
    ),
    'remaining', greatest(0, 20 - (
      SELECT count(*)::int
      FROM public.messages
      WHERE sender_id = _user_id
        AND message_type = 'inquiry'
        AND created_at > now() - interval '1 hour'
    ))
  );
$$;
