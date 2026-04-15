-- Schema Cleanup: Remove backward-compatibility views (Audit Item E-UP4)
-- These views were created during the multi-schema migration and are no longer needed
-- by any active client code.

-- Step 1: Drop legacy compat views that redirect to the canonical schema location.
-- Safety: wrap in DO blocks with IF EXISTS checks to avoid errors on fresh installs.

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_views WHERE schemaname = 'public' AND viewname = 'v_orbit_messages_compat'
  ) THEN
    DROP VIEW public.v_orbit_messages_compat;
    RAISE NOTICE 'Dropped public.v_orbit_messages_compat';
  END IF;

  IF EXISTS (
    SELECT 1 FROM pg_views WHERE schemaname = 'public' AND viewname = 'v_orbit_conversations_compat'
  ) THEN
    DROP VIEW public.v_orbit_conversations_compat;
    RAISE NOTICE 'Dropped public.v_orbit_conversations_compat';
  END IF;

  IF EXISTS (
    SELECT 1 FROM pg_views WHERE schemaname = 'public' AND viewname = 'v_wallet_transactions_compat'
  ) THEN
    DROP VIEW public.v_wallet_transactions_compat;
    RAISE NOTICE 'Dropped public.v_wallet_transactions_compat';
  END IF;

  IF EXISTS (
    SELECT 1 FROM pg_views WHERE schemaname = 'public' AND viewname = 'v_marketplace_listings_compat'
  ) THEN
    DROP VIEW public.v_marketplace_listings_compat;
    RAISE NOTICE 'Dropped public.v_marketplace_listings_compat';
  END IF;
END $$;

-- Step 2: Add an index on commonly queried columns in the canonical tables
-- to compensate for any views that were providing pre-filtered access.

CREATE INDEX IF NOT EXISTS idx_orbit_messages_conversation_created
  ON orbit.messages (conversation_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_wallet_transactions_user_created
  ON wallet.transactions (user_id, created_at DESC);

-- Step 3: Service-layer fix (E-UP5) — ensure the DB function used by
-- the service layer returns data from the canonical schema location.

CREATE OR REPLACE FUNCTION public.get_user_wallet_summary(p_user_id uuid)
RETURNS TABLE(balance numeric, currency text, last_tx_at timestamptz, tx_count bigint)
LANGUAGE plpgsql SECURITY DEFINER STABLE
AS $$
BEGIN
  RETURN QUERY
  SELECT
    COALESCE(w.balance, 0),
    COALESCE(w.currency, 'EUR'),
    MAX(t.created_at),
    COUNT(t.id)
  FROM wallet.wallets w
  LEFT JOIN wallet.transactions t ON t.wallet_id = w.id
  WHERE w.user_id = p_user_id
  GROUP BY w.balance, w.currency;
END;
$$;

COMMENT ON FUNCTION public.get_user_wallet_summary(uuid) IS
  'Returns wallet summary from canonical wallet schema. Replaces direct public table access (E-UP5).';
