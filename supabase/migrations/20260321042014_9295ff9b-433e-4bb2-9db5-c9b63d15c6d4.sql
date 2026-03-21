
-- Add sender/receiver user IDs and idempotency_key to wallet_transfers
ALTER TABLE public.wallet_transfers ADD COLUMN IF NOT EXISTS sender_user_id uuid;
ALTER TABLE public.wallet_transfers ADD COLUMN IF NOT EXISTS receiver_user_id uuid;
ALTER TABLE public.wallet_transfers ADD COLUMN IF NOT EXISTS idempotency_key text;
ALTER TABLE public.wallet_transfers ADD COLUMN IF NOT EXISTS source text DEFAULT 'manual';
ALTER TABLE public.wallet_transfers ADD COLUMN IF NOT EXISTS challenge_id text;
ALTER TABLE public.wallet_transfers ADD COLUMN IF NOT EXISTS risk_score numeric DEFAULT 0;
ALTER TABLE public.wallet_transfers ADD COLUMN IF NOT EXISTS note text;
ALTER TABLE public.wallet_transfers ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now();

-- Unique constraint on idempotency_key (only for non-null values)
CREATE UNIQUE INDEX IF NOT EXISTS idx_wallet_transfers_idempotency_key 
ON public.wallet_transfers (idempotency_key) WHERE idempotency_key IS NOT NULL;

-- Replace the atomic RPC to use proper idempotency_key column
CREATE OR REPLACE FUNCTION public.atomic_wallet_transfer(
  p_sender_user_id uuid,
  p_receiver_user_id uuid,
  p_amount numeric,
  p_currency text DEFAULT 'AED',
  p_idempotency_key text DEFAULT NULL,
  p_source text DEFAULT 'manual',
  p_note text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_sender_wallet_id uuid;
  v_receiver_wallet_id uuid;
  v_transfer_id uuid;
  v_sender_balance numeric;
  v_idem_key text;
  v_existing record;
BEGIN
  v_idem_key := COALESCE(p_idempotency_key, 'atf_' || gen_random_uuid()::text);
  
  -- Idempotency: check wallet_transfers.idempotency_key
  SELECT id, status INTO v_existing
  FROM wallet_transfers
  WHERE idempotency_key = v_idem_key
  LIMIT 1;
  
  IF v_existing IS NOT NULL THEN
    RETURN jsonb_build_object('success', true, 'duplicate', true, 'transfer_id', v_existing.id);
  END IF;

  -- Lock + resolve sender wallet
  SELECT id, COALESCE(balance, available_balance, 0)
  INTO v_sender_wallet_id, v_sender_balance
  FROM wallet_accounts
  WHERE owner_user_id = p_sender_user_id AND currency = p_currency
  ORDER BY created_at ASC LIMIT 1
  FOR UPDATE;
  
  IF v_sender_wallet_id IS NULL THEN
    RAISE EXCEPTION 'Sender wallet not found for currency %', p_currency;
  END IF;
  
  IF v_sender_balance < p_amount THEN
    RAISE EXCEPTION 'Insufficient balance. Available: % %', v_sender_balance, p_currency;
  END IF;

  -- Lock + resolve receiver wallet
  SELECT id INTO v_receiver_wallet_id
  FROM wallet_accounts
  WHERE owner_user_id = p_receiver_user_id AND currency = p_currency
  ORDER BY created_at ASC LIMIT 1
  FOR UPDATE;
  
  IF v_receiver_wallet_id IS NULL THEN
    INSERT INTO wallet_accounts (owner_user_id, currency, account_type, balance, available_balance, pending_balance, status)
    VALUES (p_receiver_user_id, p_currency, 'fiat', 0, 0, 0, 'active')
    RETURNING id INTO v_receiver_wallet_id;
  END IF;

  -- Create transfer record with all fields
  v_transfer_id := gen_random_uuid();
  INSERT INTO wallet_transfers (
    id, from_wallet_id, to_wallet_id, amount, currency, transfer_type, status,
    sender_user_id, receiver_user_id, idempotency_key, source, note, metadata, updated_at
  ) VALUES (
    v_transfer_id, v_sender_wallet_id, v_receiver_wallet_id, p_amount, p_currency,
    'p2p', 'completed',
    p_sender_user_id, p_receiver_user_id, v_idem_key, p_source, p_note,
    jsonb_build_object('source', p_source), now()
  );

  -- Debit sender
  INSERT INTO wallet_ledger_entries (wallet_account_id, direction, amount, currency, entry_type, reference_type, reference_id, external_txn_id, status, note)
  VALUES (v_sender_wallet_id, 'out', p_amount, p_currency, 'transfer', 'p2p_transfer', v_transfer_id::text, v_idem_key, 'posted', COALESCE(p_note, 'P2P transfer'));

  -- Credit receiver
  INSERT INTO wallet_ledger_entries (wallet_account_id, direction, amount, currency, entry_type, reference_type, reference_id, external_txn_id, status, note)
  VALUES (v_receiver_wallet_id, 'in', p_amount, p_currency, 'transfer', 'p2p_transfer', v_transfer_id::text, v_idem_key || '_cr', 'posted', COALESCE(p_note, 'P2P transfer'));

  -- Atomic balance update
  UPDATE wallet_accounts SET balance = balance - p_amount, available_balance = available_balance - p_amount, updated_at = now() WHERE id = v_sender_wallet_id;
  UPDATE wallet_accounts SET balance = balance + p_amount, available_balance = available_balance + p_amount, updated_at = now() WHERE id = v_receiver_wallet_id;

  -- History
  INSERT INTO unified_wallet_transactions (sender_id, recipient_id, amount, currency, context_type, title, subtitle, status, metadata)
  VALUES (p_sender_user_id, p_receiver_user_id, p_amount, p_currency, p_source, 'P2P Transfer', p_note, 'completed',
    jsonb_build_object('transfer_id', v_transfer_id, 'idempotency_key', v_idem_key));

  -- Audit
  INSERT INTO audit_logs (user_id, action, metadata_json)
  VALUES (p_sender_user_id, 'atomic_wallet_transfer', jsonb_build_object(
    'transfer_id', v_transfer_id, 'sender_user_id', p_sender_user_id,
    'receiver_user_id', p_receiver_user_id, 'amount', p_amount, 'currency', p_currency,
    'idempotency_key', v_idem_key
  ));

  RETURN jsonb_build_object('success', true, 'transfer_id', v_transfer_id, 'amount', p_amount, 'currency', p_currency);
END;
$$;

-- Auto-create default limit profiles on KYC level
CREATE OR REPLACE FUNCTION public.auto_create_wallet_limits()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO wallet_limit_profiles (user_id, kyc_level, single_tx_limit, daily_send_limit, monthly_send_limit)
  VALUES (
    NEW.user_id,
    NEW.kyc_level,
    CASE NEW.kyc_level
      WHEN 'none' THEN 0
      WHEN 'basic' THEN 100
      WHEN 'verified' THEN 2000
      WHEN 'enhanced' THEN 10000
      ELSE 100
    END,
    CASE NEW.kyc_level
      WHEN 'none' THEN 0
      WHEN 'basic' THEN 500
      WHEN 'verified' THEN 10000
      WHEN 'enhanced' THEN 50000
      ELSE 500
    END,
    CASE NEW.kyc_level
      WHEN 'none' THEN 0
      WHEN 'basic' THEN 5000
      WHEN 'verified' THEN 50000
      WHEN 'enhanced' THEN 200000
      ELSE 5000
    END
  )
  ON CONFLICT (user_id) DO UPDATE SET
    kyc_level = EXCLUDED.kyc_level,
    single_tx_limit = EXCLUDED.single_tx_limit,
    daily_send_limit = EXCLUDED.daily_send_limit,
    monthly_send_limit = EXCLUDED.monthly_send_limit,
    updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_auto_wallet_limits ON public.user_kyc_profiles;
CREATE TRIGGER trg_auto_wallet_limits
AFTER INSERT OR UPDATE OF kyc_level ON public.user_kyc_profiles
FOR EACH ROW EXECUTE FUNCTION public.auto_create_wallet_limits();
