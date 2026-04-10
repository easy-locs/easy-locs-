
-- Drop the old function signature
DROP FUNCTION IF EXISTS public.create_call_idempotent(uuid, uuid, text, text, text, text, boolean);

-- Recreate with orbit_id params aligned to call_logs schema
CREATE OR REPLACE FUNCTION public.create_call_idempotent(
  _caller_orbit_id text,
  _receiver_orbit_id text,
  _thread_id text DEFAULT NULL,
  _context_type text DEFAULT 'listing',
  _context_id text DEFAULT NULL,
  _context_label text DEFAULT NULL,
  _is_video boolean DEFAULT false
)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _call_id text;
  _call_type text;
BEGIN
  _call_id := 'call_' || substr(md5(random()::text), 1, 11);
  _call_type := CASE WHEN _is_video THEN 'video' ELSE 'audio' END;

  INSERT INTO public.call_logs (
    id,
    conversation_id,
    session_id,
    caller_orbit_id,
    receiver_orbit_id,
    call_type,
    direction,
    status,
    started_at,
    created_at
  ) VALUES (
    _call_id,
    COALESCE(_thread_id, _call_id),
    NULL,
    _caller_orbit_id,
    _receiver_orbit_id,
    _call_type,
    'outgoing',
    'ringing',
    now(),
    now()
  );

  RETURN _call_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.create_call_idempotent(text, text, text, text, text, text, boolean) TO authenticated;
GRANT EXECUTE ON FUNCTION public.create_call_idempotent(text, text, text, text, text, text, boolean) TO service_role;
