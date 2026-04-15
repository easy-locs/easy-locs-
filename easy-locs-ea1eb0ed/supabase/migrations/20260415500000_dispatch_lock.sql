CREATE TABLE IF NOT EXISTS dispatch_locks (
  job_id TEXT PRIMARY KEY,
  claimed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMPTZ NOT NULL
);

ALTER TABLE dispatch_locks ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_dispatch_locks_expires ON dispatch_locks (expires_at);

CREATE OR REPLACE FUNCTION try_claim_dispatch_lock(p_job_id TEXT, p_lock_ttl_seconds INT)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_now TIMESTAMPTZ := NOW();
  v_expires TIMESTAMPTZ := v_now + (p_lock_ttl_seconds || ' seconds')::INTERVAL;
BEGIN
  DELETE FROM dispatch_locks WHERE expires_at < v_now;

  INSERT INTO dispatch_locks (job_id, claimed_at, expires_at)
  VALUES (p_job_id, v_now, v_expires)
  ON CONFLICT (job_id) DO UPDATE
    SET claimed_at = v_now, expires_at = v_expires
    WHERE dispatch_locks.expires_at < v_now;

  RETURN FOUND;
END;
$$;

REVOKE ALL ON TABLE dispatch_locks FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION try_claim_dispatch_lock(TEXT, INT) FROM anon;
GRANT EXECUTE ON FUNCTION try_claim_dispatch_lock(TEXT, INT) TO authenticated;
