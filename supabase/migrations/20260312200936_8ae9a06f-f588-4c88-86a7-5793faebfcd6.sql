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
AS $function$
DECLARE
  _existing_id uuid;
  _new_id uuid;
  _auth_uid uuid;
  _scope_key text;
BEGIN
  -- Hard auth guard: caller_id must match the authenticated user
  _auth_uid := auth.uid();
  IF _auth_uid IS NULL OR _auth_uid <> _caller_id THEN
    RAISE EXCEPTION 'Unauthorized call creation request';
  END IF;

  -- Serialize same call scope to avoid race conditions across taps/devices/tabs
  _scope_key := concat_ws('|',
    coalesce(_caller_id::text, ''),
    coalesce(_callee_org_id::text, ''),
    coalesce(_thread_id::text, ''),
    coalesce(_context_type, ''),
    coalesce(_context_id, '')
  );
  PERFORM pg_advisory_xact_lock(hashtextextended(_scope_key, 0));

  -- Auto-close stale ringing/connecting rows in this exact scope
  UPDATE public.call_logs
  SET
    status = 'missed',
    ended_at = coalesce(ended_at, now())
  WHERE caller_id = _caller_id
    AND callee_org_id = _callee_org_id
    AND coalesce(thread_id::text, '') = coalesce(_thread_id::text, '')
    AND coalesce(context_type, '') = coalesce(_context_type, '')
    AND coalesce(context_id, '') = coalesce(_context_id, '')
    AND status IN ('ringing', 'connecting')
    AND created_at < now() - interval '90 seconds';

  -- Return active call in same scope if it exists
  SELECT id INTO _existing_id
  FROM public.call_logs
  WHERE caller_id = _caller_id
    AND callee_org_id = _callee_org_id
    AND coalesce(thread_id::text, '') = coalesce(_thread_id::text, '')
    AND coalesce(context_type, '') = coalesce(_context_type, '')
    AND coalesce(context_id, '') = coalesce(_context_id, '')
    AND status IN ('ringing', 'connecting', 'active')
  ORDER BY created_at DESC
  LIMIT 1;

  IF _existing_id IS NOT NULL THEN
    RETURN _existing_id;
  END IF;

  -- Create new call row
  INSERT INTO public.call_logs (
    caller_id,
    callee_org_id,
    thread_id,
    context_type,
    context_id,
    context_label,
    status,
    is_video
  )
  VALUES (
    _caller_id,
    _callee_org_id,
    _thread_id,
    _context_type,
    _context_id,
    _context_label,
    'ringing',
    _is_video
  )
  RETURNING id INTO _new_id;

  RETURN _new_id;
END;
$function$;