
CREATE OR REPLACE FUNCTION public.create_call_idempotent(
  _caller_id uuid,
  _callee_org_id uuid,
  _thread_id uuid DEFAULT NULL,
  _context_type text DEFAULT 'listing',
  _context_id text DEFAULT NULL,
  _context_label text DEFAULT NULL,
  _is_video boolean DEFAULT false
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _existing_id uuid;
  _new_id uuid;
BEGIN
  -- Check for an existing active call from this caller to this org in the last 30 seconds
  SELECT id INTO _existing_id
  FROM public.call_logs
  WHERE caller_id = _caller_id
    AND callee_org_id = _callee_org_id
    AND status IN ('ringing', 'connecting', 'active')
    AND created_at > now() - interval '30 seconds'
  ORDER BY created_at DESC
  LIMIT 1;

  -- If an active call already exists, return its ID (idempotent)
  IF _existing_id IS NOT NULL THEN
    RETURN _existing_id;
  END IF;

  -- Create new call log entry
  INSERT INTO public.call_logs (
    caller_id, callee_org_id, thread_id, context_type, context_id,
    context_label, status, is_video
  )
  VALUES (
    _caller_id, _callee_org_id, _thread_id, _context_type, _context_id,
    _context_label, 'ringing', _is_video
  )
  RETURNING id INTO _new_id;

  RETURN _new_id;
END;
$$;
