-- ============================================================================
-- Phase 2 — ExecutionOrchestratorV2 supporting RPCs (task #752)
--
-- This migration adds the Postgres surface needed by the Phase-2 lock and
-- idempotency services consumed by ExecutionOrchestratorV2:
--
--   1. system.execution_locks          — TTL-bounded distributed lock table.
--   2. system.try_acquire_execution_lock(key, owner, ttl_seconds)
--   3. system.release_execution_lock(key, owner)
--   4. system.cleanup_expired_execution_locks()
--   5. system.find_idempotent_result(key) — returns the execution_result of a
--      prior `succeeded` task that holds the same idempotency key, or NULL.
--
-- We deliberately use a TTL table instead of pg_try_advisory_lock because
-- advisory locks are session-scoped, and our Edge Function callers each open
-- a fresh PostgREST session per RPC. A row-based lock survives across calls
-- and can be reaped by the TTL cleanup job.
-- ============================================================================

CREATE TABLE IF NOT EXISTS system.execution_locks (
  lock_key    TEXT PRIMARY KEY,
  owner_id    TEXT NOT NULL,
  acquired_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at  TIMESTAMPTZ NOT NULL
);

ALTER TABLE system.execution_locks ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_execution_locks_expires_at
  ON system.execution_locks (expires_at);

REVOKE ALL ON TABLE system.execution_locks FROM anon, authenticated;

-- ── RPC: acquire ─────────────────────────────────────────────────────────────
-- Returns TRUE if `owner_id` now holds the lock (either fresh acquisition or
-- already owned by `owner_id` — re-entrant for the same owner). Returns FALSE
-- if a different live owner holds it.
CREATE OR REPLACE FUNCTION system.try_acquire_execution_lock(
  p_lock_key TEXT,
  p_owner_id TEXT,
  p_ttl_seconds INT DEFAULT 60
) RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, system
AS $$
DECLARE
  v_now     TIMESTAMPTZ := now();
  v_expires TIMESTAMPTZ := now() + make_interval(secs => GREATEST(1, p_ttl_seconds));
  v_held    BOOLEAN := FALSE;
BEGIN
  IF p_lock_key IS NULL OR BTRIM(p_lock_key) = '' THEN
    RAISE EXCEPTION 'execution_locks: lock_key is required' USING ERRCODE = '22023';
  END IF;
  IF p_owner_id IS NULL OR BTRIM(p_owner_id) = '' THEN
    RAISE EXCEPTION 'execution_locks: owner_id is required' USING ERRCODE = '22023';
  END IF;

  -- Reap any expired row for this key opportunistically.
  DELETE FROM system.execution_locks
   WHERE lock_key = p_lock_key AND expires_at < v_now;

  INSERT INTO system.execution_locks (lock_key, owner_id, acquired_at, expires_at)
  VALUES (p_lock_key, p_owner_id, v_now, v_expires)
  ON CONFLICT (lock_key) DO UPDATE
    SET owner_id    = EXCLUDED.owner_id,
        acquired_at = EXCLUDED.acquired_at,
        expires_at  = EXCLUDED.expires_at
    WHERE system.execution_locks.owner_id = EXCLUDED.owner_id
       OR system.execution_locks.expires_at < v_now;

  SELECT TRUE INTO v_held
    FROM system.execution_locks
   WHERE lock_key = p_lock_key AND owner_id = p_owner_id AND expires_at >= v_now
   LIMIT 1;

  RETURN COALESCE(v_held, FALSE);
END;
$$;

REVOKE ALL ON FUNCTION system.try_acquire_execution_lock(TEXT, TEXT, INT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION system.try_acquire_execution_lock(TEXT, TEXT, INT)
  TO authenticated, service_role;

-- ── RPC: release ─────────────────────────────────────────────────────────────
-- Only the owner may release a lock. Returns TRUE if a row was deleted.
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
BEGIN
  DELETE FROM system.execution_locks
   WHERE lock_key = p_lock_key AND owner_id = p_owner_id;
  GET DIAGNOSTICS v_deleted = ROW_COUNT;
  RETURN v_deleted > 0;
END;
$$;

REVOKE ALL ON FUNCTION system.release_execution_lock(TEXT, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION system.release_execution_lock(TEXT, TEXT)
  TO authenticated, service_role;

-- ── RPC: TTL cleanup ─────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION system.cleanup_expired_execution_locks()
RETURNS INT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, system
AS $$
DECLARE
  v_count INT;
BEGIN
  DELETE FROM system.execution_locks WHERE expires_at < now();
  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END;
$$;

REVOKE ALL ON FUNCTION system.cleanup_expired_execution_locks() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION system.cleanup_expired_execution_locks()
  TO authenticated, service_role;

-- ── RPC: idempotency lookup ──────────────────────────────────────────────────
-- Returns the execution_result of the most recent `succeeded` task for the
-- given key, if any. Used by ExecutionOrchestratorV2 to short-circuit before
-- invoking the adapter when an identical effect has already been committed.
CREATE OR REPLACE FUNCTION system.find_idempotent_result(p_idempotency_key TEXT)
RETURNS JSONB
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, system
AS $$
DECLARE
  v_result JSONB;
BEGIN
  IF p_idempotency_key IS NULL OR BTRIM(p_idempotency_key) = '' THEN
    RETURN NULL;
  END IF;

  SELECT execution_result INTO v_result
    FROM system.execution_tasks
   WHERE idempotency_key = p_idempotency_key
     AND status = 'succeeded'
     AND execution_result IS NOT NULL
   ORDER BY completed_at DESC NULLS LAST, updated_at DESC
   LIMIT 1;

  RETURN v_result;
END;
$$;

REVOKE ALL ON FUNCTION system.find_idempotent_result(TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION system.find_idempotent_result(TEXT)
  TO authenticated, service_role;
