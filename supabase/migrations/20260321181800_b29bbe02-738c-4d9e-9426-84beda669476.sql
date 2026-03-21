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
SET search_path TO 'public'
AS $$
DECLARE
  _call_id text;
  _call_type text;
  _resolved_receiver text;
BEGIN
  _call_id := 'call_' || substr(md5(random()::text), 1, 11);
  _call_type := CASE WHEN _is_video THEN 'video' ELSE 'audio' END;
  _resolved_receiver := _receiver_orbit_id;

  SELECT om.user_id::text
    INTO _resolved_receiver
  FROM public.org_members om
  WHERE om.org_id::text = _receiver_orbit_id
    AND om.user_id::text <> _caller_orbit_id
  ORDER BY om.created_at ASC NULLS LAST
  LIMIT 1;

  _resolved_receiver := COALESCE(_resolved_receiver, _receiver_orbit_id);

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
    _resolved_receiver,
    _call_type,
    'outgoing',
    'ringing',
    now(),
    now()
  );

  RETURN _call_id;
END;
$$;