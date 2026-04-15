-- Wallet Security Hardening Migration
-- 1. Revoke client SELECT on wallet_pin_hash via column privileges
-- 2. Block direct client UPDATE on daily_transfer_limit, wallet_pin_hash, lockout columns
-- 3. Tighten wallet_pins RLS to service_role only
-- 4. Create safe profile view for client use
-- 5. Atomic PIN lockout RPC

-- Revoke SELECT privilege on sensitive columns from authenticated/anon roles
-- This ensures wallet_pin_hash is NEVER readable by client queries
REVOKE SELECT (wallet_pin_hash) ON public.profiles FROM authenticated;
REVOKE SELECT (wallet_pin_hash) ON public.profiles FROM anon;

-- Revoke UPDATE privilege on protected columns from client roles
-- Only service_role (used by edge functions) can modify these
REVOKE UPDATE (wallet_pin_hash, wallet_pin_failed_attempts, wallet_pin_locked_until, daily_transfer_limit)
  ON public.profiles FROM authenticated;
REVOKE UPDATE (wallet_pin_hash, wallet_pin_failed_attempts, wallet_pin_locked_until, daily_transfer_limit)
  ON public.profiles FROM anon;

-- Ensure wallet_pins table has strict RLS (service_role only)
ALTER TABLE IF EXISTS public.wallet_pins ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'wallet_pins_owner' AND tablename = 'wallet_pins') THEN
    DROP POLICY "wallet_pins_owner" ON public.wallet_pins;
  END IF;
END $$;

-- No client-facing policies on wallet_pins — only service_role can access
-- This ensures PIN hashes are never readable from the client

-- Create a safe view for profiles that masks the pin hash for client queries
-- Clients should use this view when they need to check if a PIN is set
CREATE OR REPLACE VIEW public.profiles_safe AS
SELECT
  id, full_name, username, avatar_url, email, phone,
  kyc_status, device_bound, contacts_synced, security_flag,
  daily_transfer_limit,
  wallet_pin_failed_attempts,
  wallet_pin_locked_until,
  face_id_enabled, login_2fa_enabled, biometric_enabled,
  CASE WHEN wallet_pin_hash IS NOT NULL THEN TRUE ELSE FALSE END AS has_wallet_pin,
  created_at, updated_at
FROM public.profiles;

-- Grant SELECT on safe view to authenticated users
GRANT SELECT ON public.profiles_safe TO authenticated;

-- Atomic PIN lockout increment RPC
-- Uses a single UPDATE...RETURNING to avoid race conditions on concurrent attempts
CREATE OR REPLACE FUNCTION public.atomic_pin_fail_increment(
  p_user_id UUID,
  p_max_attempts INT DEFAULT 5,
  p_lockout_seconds INT DEFAULT 900
)
RETURNS TABLE(
  new_attempts INT,
  is_locked BOOLEAN,
  locked_until TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_lock_until TIMESTAMPTZ;
  v_new_attempts INT;
BEGIN
  UPDATE profiles
  SET
    wallet_pin_failed_attempts = wallet_pin_failed_attempts + 1,
    wallet_pin_locked_until = CASE
      WHEN wallet_pin_failed_attempts + 1 >= p_max_attempts
      THEN NOW() + (p_lockout_seconds || ' seconds')::INTERVAL
      ELSE wallet_pin_locked_until
    END
  WHERE id = p_user_id
  RETURNING
    wallet_pin_failed_attempts,
    wallet_pin_locked_until
  INTO v_new_attempts, v_lock_until;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'User not found';
  END IF;

  RETURN QUERY SELECT
    v_new_attempts,
    (v_new_attempts >= p_max_attempts),
    v_lock_until;
END;
$$;

-- Atomic PIN success reset RPC
CREATE OR REPLACE FUNCTION public.atomic_pin_success_reset(
  p_user_id UUID
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE profiles
  SET
    wallet_pin_failed_attempts = 0,
    wallet_pin_locked_until = NULL
  WHERE id = p_user_id
    AND (wallet_pin_failed_attempts > 0 OR wallet_pin_locked_until IS NOT NULL);
END;
$$;

-- Restrict RPC execution to service_role only
-- Edge functions use service_role key, so they can call these RPCs
-- Clients (authenticated/anon) cannot call them directly
REVOKE EXECUTE ON FUNCTION public.atomic_pin_fail_increment(UUID, INT, INT) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.atomic_pin_success_reset(UUID) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.atomic_pin_fail_increment(UUID, INT, INT) TO service_role;
GRANT EXECUTE ON FUNCTION public.atomic_pin_success_reset(UUID) TO service_role;
