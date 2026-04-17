CREATE OR REPLACE FUNCTION system.try_acquire_execution_lock(p_lock_key text, p_owner_id text, p_ttl_seconds integer DEFAULT 60)
 RETURNS TABLE(acquired boolean, lock_key text, owner_id text, expires_at timestamp with time zone, reason text)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'system'
AS $function$
DECLARE
  v_existing system.execution_locks;
  v_ttl      INT := GREATEST(1, COALESCE(p_ttl_seconds, 60));
  v_now      TIMESTAMPTZ := now();
  v_expires  TIMESTAMPTZ := v_now + make_interval(secs => v_ttl);
  v_owner    TEXT := NULLIF(BTRIM(p_owner_id), '');
  v_key      TEXT := NULLIF(BTRIM(p_lock_key), '');
BEGIN
  IF v_key IS NULL THEN
    RAISE EXCEPTION 'execution_lock acquire: lock_key is required' USING ERRCODE = '22023';
  END IF;
  IF v_owner IS NULL THEN
    RAISE EXCEPTION 'execution_lock acquire: owner_id is required' USING ERRCODE = '22023';
  END IF;

  BEGIN
    INSERT INTO system.execution_locks (lock_key, owner_id, acquired_at, expires_at)
    VALUES (v_key, v_owner, v_now, v_expires);
    RETURN QUERY SELECT TRUE, v_key, v_owner, v_expires, 'acquired'::TEXT;
    RETURN;
  EXCEPTION WHEN unique_violation THEN
    NULL;
  END;

  -- Contention path: load the existing row using fully-qualified column names.
  SELECT *
    INTO v_existing
    FROM system.execution_locks AS el
   WHERE el.lock_key = v_key
   FOR UPDATE;

  -- If the existing lock has expired, steal it.
  IF v_existing.expires_at IS NOT NULL AND v_existing.expires_at <= v_now THEN
    UPDATE system.execution_locks AS el
       SET owner_id = v_owner, acquired_at = v_now, expires_at = v_expires
     WHERE el.lock_key = v_key;
    RETURN QUERY SELECT TRUE, v_key, v_owner, v_expires, 'stolen-expired'::TEXT;
    RETURN;
  END IF;

  -- Same owner re-acquire: extend TTL, idempotent.
  IF v_existing.owner_id = v_owner THEN
    UPDATE system.execution_locks AS el
       SET expires_at = v_expires
     WHERE el.lock_key = v_key;
    RETURN QUERY SELECT TRUE, v_key, v_owner, v_expires, 're-acquired'::TEXT;
    RETURN;
  END IF;

  -- Otherwise, denied.
  RETURN QUERY SELECT FALSE, v_key, v_existing.owner_id, v_existing.expires_at, 'held-by-other'::TEXT;
  RETURN;
END;
$function$;
