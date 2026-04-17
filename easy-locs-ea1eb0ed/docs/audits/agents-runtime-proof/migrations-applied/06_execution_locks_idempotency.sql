-- ============================================================================
-- Autonomous Execution Layer — Phase 2, task #751
-- Locks & Idempotency Layer.
--
-- Provides deterministic primitives for the upcoming ExecutionOrchestratorV2:
--   1. system.execution_locks                — dedicated table-backed locks
--      with a TTL safety window. Postgres advisory locks were considered but
--      rejected because they are session-scoped: Supabase routes RPC calls
--      through PgBouncer / short-lived HTTP connections, so an advisory lock
--      acquired in one RPC call would not survive into the next one. A
--      table-backed lock with explicit ownership + TTL gives us cross-call
--      durability, observable state, and orphan recovery without depending
--      on session affinity.
--   2. RPC primitives:
--        system.try_acquire_execution_lock(key, owner_id, ttl_seconds)
--        system.release_execution_lock(key, owner_id)
--        system.cleanup_expired_locks()
--      All SECURITY DEFINER, locked to authenticated/service_role.
--   3. Idempotency RPCs that operate against the existing
--      system.execution_tasks.idempotency_key column (added in
--      20260418300100_execution_tasks_hardening.sql):
--        system.claim_idempotency_key(key, task_id)
--        system.find_existing_result_by_idempotency_key(key)
--   4. pg_cron job that runs cleanup_expired_locks every minute so orphaned
--      locks (process crash, network drop, etc.) cannot wedge an entity.
--
-- This migration ships only primitives. It does not change any business
-- behaviour and is consumed exclusively by Phase-2 code in
-- src/core/execution/lock-service.ts and idempotency-service.ts.
-- ============================================================================

-- ── 1. Locks table ────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS system.execution_locks (
  lock_key     TEXT        PRIMARY KEY,
  owner_id     TEXT        NOT NULL,
  acquired_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at   TIMESTAMPTZ NOT NULL,
  metadata     JSONB       NOT NULL DEFAULT '{}'::jsonb
);

CREATE INDEX IF NOT EXISTS idx_execution_locks_expires_at
  ON system.execution_locks (expires_at);

CREATE INDEX IF NOT EXISTS idx_execution_locks_owner_id
  ON system.execution_locks (owner_id);

ALTER TABLE system.execution_locks ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "execution_locks_read_admin" ON system.execution_locks;
CREATE POLICY "execution_locks_read_admin"
  ON system.execution_locks FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::public.app_role));

DROP POLICY IF EXISTS "execution_locks_service_role_all" ON system.execution_locks;
CREATE POLICY "execution_locks_service_role_all"
  ON system.execution_locks FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

GRANT SELECT ON system.execution_locks TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON system.execution_locks TO service_role;
REVOKE INSERT, UPDATE, DELETE ON system.execution_locks FROM authenticated, anon, PUBLIC;

-- ── 2. Lock RPCs ──────────────────────────────────────────────────────────

-- try_acquire_execution_lock: returns TRUE if the caller now owns the lock.
-- Behaviour:
--   * If no row exists for this key            → INSERT and return TRUE.
--   * If a row exists but has expired          → atomically replace it and
--                                                 return TRUE (orphan recovery).
--   * If a row exists, still valid, same owner → refresh expiry + TRUE
--                                                 (re-entrant for the same actor).
--   * If a row exists, still valid, other owner → return FALSE (busy).
CREATE OR REPLACE FUNCTION system.try_acquire_execution_lock(
  p_lock_key    TEXT,
  p_owner_id    TEXT,
  p_ttl_seconds INT DEFAULT 60
) RETURNS TABLE (
  acquired   BOOLEAN,
  lock_key   TEXT,
  owner_id   TEXT,
  expires_at TIMESTAMPTZ,
  reason     TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, system
AS $$
DECLARE
  v_existing system.execution_locks;
  v_ttl      INT := GREATEST(1, COALESCE(p_ttl_seconds, 60));
  v_now      TIMESTAMPTZ := now();
  v_expires  TIMESTAMPTZ := v_now + make_interval(secs => v_ttl);
  v_owner    TEXT := NULLIF(BTRIM(p_owner_id), '');
  v_key      TEXT := NULLIF(BTRIM(p_lock_key), '');
BEGIN
  IF v_key IS NULL THEN
    RAISE EXCEPTION 'execution_lock acquire: lock_key is required'
      USING ERRCODE = '22023';
  END IF;
  IF v_owner IS NULL THEN
    RAISE EXCEPTION 'execution_lock acquire: owner_id is required'
      USING ERRCODE = '22023';
  END IF;

  -- Fast path: insert. UNIQUE on lock_key gives us atomic "first wins".
  BEGIN
    INSERT INTO system.execution_locks (lock_key, owner_id, acquired_at, expires_at)
    VALUES (v_key, v_owner, v_now, v_expires);
    RETURN QUERY SELECT TRUE, v_key, v_owner, v_expires, 'acquired'::TEXT;
    RETURN;
  EXCEPTION WHEN unique_violation THEN
    -- Fall through to contention handling below.
    NULL;
  END;

  -- Contention: inspect the existing row under FOR UPDATE so we cannot race
  -- with another acquirer between the check and the replacement.
  SELECT * INTO v_existing
    FROM system.execution_locks
   WHERE lock_key = v_key
   FOR UPDATE;

  IF NOT FOUND THEN
    -- Row vanished between INSERT failure and SELECT (another transaction
    -- released it). Retry once.
    BEGIN
      INSERT INTO system.execution_locks (lock_key, owner_id, acquired_at, expires_at)
      VALUES (v_key, v_owner, v_now, v_expires);
      RETURN QUERY SELECT TRUE, v_key, v_owner, v_expires, 'acquired_after_release'::TEXT;
      RETURN;
    EXCEPTION WHEN unique_violation THEN
      RETURN QUERY SELECT FALSE, v_key, NULL::TEXT, NULL::TIMESTAMPTZ, 'race_lost'::TEXT;
      RETURN;
    END;
  END IF;

  -- Expired? Atomically take it over and emit an orphan-recovery warning.
  IF v_existing.expires_at <= v_now THEN
    UPDATE system.execution_locks
       SET owner_id    = v_owner,
           acquired_at = v_now,
           expires_at  = v_expires
     WHERE lock_key = v_key;
    RAISE WARNING 'execution_lock orphan recovered: key=% prev_owner=% expired_at=%',
      v_key, v_existing.owner_id, v_existing.expires_at;
    RETURN QUERY SELECT TRUE, v_key, v_owner, v_expires, 'orphan_recovered'::TEXT;
    RETURN;
  END IF;

  -- Same owner re-entering: refresh the TTL window.
  IF v_existing.owner_id = v_owner THEN
    UPDATE system.execution_locks
       SET expires_at = v_expires
     WHERE lock_key = v_key;
    RETURN QUERY SELECT TRUE, v_key, v_owner, v_expires, 'reentrant_refresh'::TEXT;
    RETURN;
  END IF;

  -- Held by another owner, still valid → contention.
  RETURN QUERY SELECT FALSE, v_key, v_existing.owner_id, v_existing.expires_at, 'busy'::TEXT;
END;
$$;

REVOKE ALL ON FUNCTION system.try_acquire_execution_lock(TEXT, TEXT, INT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION system.try_acquire_execution_lock(TEXT, TEXT, INT)
  TO authenticated, service_role;

-- release_execution_lock: only the owning actor may release. Returns TRUE if
-- a row was deleted, FALSE otherwise (already released, expired/recovered by
-- another actor, or wrong owner). Never raises on ownership mismatch — the
-- caller treats FALSE as "lock was not yours anymore".
CREATE OR REPLACE FUNCTION system.release_execution_lock(
  p_lock_key TEXT,
  p_owner_id TEXT
) RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, system
AS $$
DECLARE
  v_deleted INT;
  v_owner   TEXT := NULLIF(BTRIM(p_owner_id), '');
  v_key     TEXT := NULLIF(BTRIM(p_lock_key), '');
BEGIN
  IF v_key IS NULL OR v_owner IS NULL THEN
    RETURN FALSE;
  END IF;

  WITH deleted AS (
    DELETE FROM system.execution_locks
     WHERE lock_key = v_key
       AND owner_id = v_owner
    RETURNING 1
  )
  SELECT COUNT(*) INTO v_deleted FROM deleted;

  RETURN v_deleted > 0;
END;
$$;

REVOKE ALL ON FUNCTION system.release_execution_lock(TEXT, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION system.release_execution_lock(TEXT, TEXT)
  TO authenticated, service_role;

-- cleanup_expired_locks: purge orphan locks past TTL. Safe to call any time.
CREATE OR REPLACE FUNCTION system.cleanup_expired_locks()
RETURNS INT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, system
AS $$
DECLARE
  v_deleted INT;
BEGIN
  WITH deleted AS (
    DELETE FROM system.execution_locks
     WHERE expires_at <= now()
    RETURNING 1
  )
  SELECT COUNT(*) INTO v_deleted FROM deleted;

  IF v_deleted > 0 THEN
    RAISE NOTICE 'execution_locks cleanup removed % orphan(s)', v_deleted;
  END IF;
  RETURN v_deleted;
END;
$$;

REVOKE ALL ON FUNCTION system.cleanup_expired_locks() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION system.cleanup_expired_locks()
  TO authenticated, service_role;

-- ── 3. Idempotency RPCs ───────────────────────────────────────────────────

-- claim_idempotency_key:
--   * If the given task already carries the key                       → TRUE (no-op).
--   * If no other task carries the key                                → set it on
--                                                                       the task and return TRUE.
--   * If another task already carries the key                         → FALSE
--                                                                       (caller must look up the existing
--                                                                       result via find_existing_result_by_idempotency_key).
CREATE OR REPLACE FUNCTION system.claim_idempotency_key(
  p_key     TEXT,
  p_task_id UUID
) RETURNS TABLE (
  claimed         BOOLEAN,
  winning_task_id UUID,
  reason          TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, system
AS $$
DECLARE
  v_key   TEXT := NULLIF(BTRIM(p_key), '');
  v_owner system.execution_tasks;
  v_task  system.execution_tasks;
BEGIN
  IF v_key IS NULL THEN
    RAISE EXCEPTION 'idempotency claim: key is required'
      USING ERRCODE = '22023';
  END IF;
  IF p_task_id IS NULL THEN
    RAISE EXCEPTION 'idempotency claim: task_id is required'
      USING ERRCODE = '22023';
  END IF;

  SELECT * INTO v_task
    FROM system.execution_tasks
   WHERE id = p_task_id
   FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'idempotency claim: task % not found', p_task_id
      USING ERRCODE = 'P0002';
  END IF;

  -- Already claimed by this task → idempotent success.
  IF v_task.idempotency_key = v_key THEN
    RETURN QUERY SELECT TRUE, p_task_id, 'already_claimed'::TEXT;
    RETURN;
  END IF;

  -- Already claimed by a different key → reject (one task = one key).
  IF v_task.idempotency_key IS NOT NULL AND v_task.idempotency_key <> v_key THEN
    RETURN QUERY SELECT FALSE, p_task_id, 'task_has_different_key'::TEXT;
    RETURN;
  END IF;

  -- Is the key already held by another task?
  SELECT * INTO v_owner
    FROM system.execution_tasks
   WHERE idempotency_key = v_key
     AND id <> p_task_id
   LIMIT 1;
  IF FOUND THEN
    RETURN QUERY SELECT FALSE, v_owner.id, 'duplicate'::TEXT;
    RETURN;
  END IF;

  BEGIN
    UPDATE system.execution_tasks
       SET idempotency_key = v_key
     WHERE id = p_task_id;
    RETURN QUERY SELECT TRUE, p_task_id, 'claimed'::TEXT;
    RETURN;
  EXCEPTION WHEN unique_violation THEN
    SELECT * INTO v_owner
      FROM system.execution_tasks
     WHERE idempotency_key = v_key
       AND id <> p_task_id
     LIMIT 1;
    RETURN QUERY SELECT FALSE,
      COALESCE(v_owner.id, p_task_id),
      'duplicate_race'::TEXT;
    RETURN;
  END;
END;
$$;

REVOKE ALL ON FUNCTION system.claim_idempotency_key(TEXT, UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION system.claim_idempotency_key(TEXT, UUID)
  TO authenticated, service_role;

-- find_existing_result_by_idempotency_key: return the most recent result row
-- for a given key. Used by retry paths so a replayed call returns the prior
-- outcome instead of re-executing.
CREATE OR REPLACE FUNCTION system.find_existing_result_by_idempotency_key(
  p_key TEXT
) RETURNS TABLE (
  task_id UUID,
  status  system.execution_task_status,
  result  JSONB,
  error   TEXT,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, system
AS $$
  SELECT id, status, result, error, created_at, updated_at
    FROM system.execution_tasks
   WHERE idempotency_key = NULLIF(BTRIM(p_key), '')
   ORDER BY created_at DESC
   LIMIT 1;
$$;

REVOKE ALL ON FUNCTION system.find_existing_result_by_idempotency_key(TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION system.find_existing_result_by_idempotency_key(TEXT)
  TO authenticated, service_role;

-- ── 4. Cron: orphan-lock cleanup every minute ─────────────────────────────
DO $cron_locks_cleanup$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN
    BEGIN
      PERFORM cron.unschedule('execution-locks-cleanup');
    EXCEPTION WHEN OTHERS THEN NULL;
    END;

    PERFORM cron.schedule(
      'execution-locks-cleanup',
      '* * * * *',
      $cron_body$SELECT system.cleanup_expired_locks()$cron_body$
    );
  END IF;
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'execution-locks-cleanup schedule failed: %', SQLERRM;
END;
$cron_locks_cleanup$;
