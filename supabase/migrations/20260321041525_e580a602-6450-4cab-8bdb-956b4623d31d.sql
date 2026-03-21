
-- ══════════════════════════════════════════════════
-- 1. KYC / KYB / AML / Limits / Compliance tables
-- ══════════════════════════════════════════════════

-- KYC profiles
CREATE TABLE IF NOT EXISTS public.user_kyc_profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE,
  kyc_level text NOT NULL DEFAULT 'none' CHECK (kyc_level IN ('none','basic','verified','enhanced')),
  status text NOT NULL DEFAULT 'not_started' CHECK (status IN ('not_started','pending','approved','rejected','expired')),
  first_name text,
  last_name text,
  date_of_birth date,
  nationality text,
  country_of_residence text,
  address_line_1 text,
  city text,
  country text,
  id_document_type text,
  id_document_number text,
  document_expiry date,
  verification_provider text,
  verification_reference text,
  risk_rating text DEFAULT 'low',
  sanctions_check_status text DEFAULT 'not_checked',
  pep_check_status text DEFAULT 'not_checked',
  screening_last_run_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
ALTER TABLE public.user_kyc_profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can read own KYC" ON public.user_kyc_profiles FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own KYC" ON public.user_kyc_profiles FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own KYC" ON public.user_kyc_profiles FOR UPDATE TO authenticated USING (auth.uid() = user_id);

-- KYC documents
CREATE TABLE IF NOT EXISTS public.kyc_documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  doc_type text NOT NULL,
  file_url text,
  file_back_url text,
  selfie_url text,
  status text DEFAULT 'pending' CHECK (status IN ('pending','approved','rejected')),
  rejection_reason text,
  uploaded_at timestamptz DEFAULT now(),
  reviewed_at timestamptz
);
ALTER TABLE public.kyc_documents ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage own KYC docs" ON public.kyc_documents FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Business compliance (KYB)
CREATE TABLE IF NOT EXISTS public.business_compliance_profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id text NOT NULL UNIQUE,
  legal_name text,
  trade_license_number text,
  company_type text,
  incorporation_country text,
  tax_number text,
  beneficial_owner_name text,
  beneficial_owner_id text,
  bank_account_name text,
  bank_account_last4 text,
  compliance_status text DEFAULT 'draft' CHECK (compliance_status IN ('draft','pending_review','approved','restricted','frozen')),
  payout_status text DEFAULT 'draft' CHECK (payout_status IN ('draft','pending_review','approved','restricted','frozen')),
  risk_rating text DEFAULT 'low',
  sanctions_check_status text DEFAULT 'not_checked',
  pep_check_status text DEFAULT 'not_checked',
  screening_last_run_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
ALTER TABLE public.business_compliance_profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated can read own bcp" ON public.business_compliance_profiles FOR SELECT TO authenticated USING (true);

-- AML events
CREATE TABLE IF NOT EXISTS public.aml_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid,
  shop_id text,
  entity_type text,
  entity_id text,
  event_type text NOT NULL,
  severity text DEFAULT 'low',
  score numeric DEFAULT 0,
  status text DEFAULT 'open' CHECK (status IN ('open','reviewing','cleared','escalated','blocked')),
  metadata_json jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now()
);
ALTER TABLE public.aml_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Service role only for AML" ON public.aml_events FOR SELECT TO authenticated USING (false);

-- Wallet limit profiles
CREATE TABLE IF NOT EXISTS public.wallet_limit_profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE,
  kyc_level text DEFAULT 'none',
  single_tx_limit numeric DEFAULT 100,
  daily_send_limit numeric DEFAULT 500,
  daily_receive_limit numeric DEFAULT 5000,
  monthly_send_limit numeric DEFAULT 5000,
  monthly_receive_limit numeric DEFAULT 50000,
  qr_pay_limit numeric DEFAULT 500,
  cashout_limit numeric DEFAULT 0,
  p2p_limit numeric DEFAULT 500,
  updated_at timestamptz DEFAULT now()
);
ALTER TABLE public.wallet_limit_profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can read own limits" ON public.wallet_limit_profiles FOR SELECT TO authenticated USING (auth.uid() = user_id);

-- Compliance cases
CREATE TABLE IF NOT EXISTS public.compliance_cases (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid,
  shop_id text,
  case_type text NOT NULL CHECK (case_type IN ('kyc','kyb','aml','limits','fraud','sanctions')),
  severity text DEFAULT 'low',
  status text DEFAULT 'open' CHECK (status IN ('open','investigating','resolved','escalated','closed')),
  assigned_to uuid,
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
ALTER TABLE public.compliance_cases ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Service role only for cases" ON public.compliance_cases FOR SELECT TO authenticated USING (false);

-- ══════════════════════════════════════════════════
-- 2. Atomic wallet transfer RPC
-- ══════════════════════════════════════════════════

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
  v_existing_transfer_id uuid;
BEGIN
  -- Idempotency check
  v_idem_key := COALESCE(p_idempotency_key, 'atf_' || gen_random_uuid()::text);
  
  SELECT id INTO v_existing_transfer_id
  FROM wallet_transfers
  WHERE metadata->>'idempotency_key' = v_idem_key
  LIMIT 1;
  
  IF v_existing_transfer_id IS NOT NULL THEN
    RETURN jsonb_build_object('success', true, 'duplicate', true, 'transfer_id', v_existing_transfer_id);
  END IF;

  -- Resolve sender wallet (lock row for update)
  SELECT id, COALESCE(balance, available_balance, 0) INTO v_sender_wallet_id, v_sender_balance
  FROM wallet_accounts
  WHERE owner_user_id = p_sender_user_id AND currency = p_currency
  LIMIT 1
  FOR UPDATE;
  
  IF v_sender_wallet_id IS NULL THEN
    RAISE EXCEPTION 'Sender wallet not found for currency %', p_currency;
  END IF;
  
  IF v_sender_balance < p_amount THEN
    RAISE EXCEPTION 'Insufficient balance. Available: % %', v_sender_balance, p_currency;
  END IF;

  -- Resolve receiver wallet (lock row)
  SELECT id INTO v_receiver_wallet_id
  FROM wallet_accounts
  WHERE owner_user_id = p_receiver_user_id AND currency = p_currency
  LIMIT 1
  FOR UPDATE;
  
  -- Auto-create receiver wallet if missing
  IF v_receiver_wallet_id IS NULL THEN
    INSERT INTO wallet_accounts (owner_user_id, currency, account_type, balance, available_balance, pending_balance, status)
    VALUES (p_receiver_user_id, p_currency, 'fiat', 0, 0, 0, 'active')
    RETURNING id INTO v_receiver_wallet_id;
  END IF;

  -- Create transfer record
  v_transfer_id := gen_random_uuid();
  INSERT INTO wallet_transfers (id, from_wallet_id, to_wallet_id, amount, currency, transfer_type, status, metadata)
  VALUES (
    v_transfer_id,
    v_sender_wallet_id,
    v_receiver_wallet_id,
    p_amount,
    p_currency,
    p_source,
    'completed',
    jsonb_build_object(
      'idempotency_key', v_idem_key,
      'sender_user_id', p_sender_user_id,
      'receiver_user_id', p_receiver_user_id,
      'note', p_note,
      'source', p_source
    )
  );

  -- Debit sender ledger
  INSERT INTO wallet_ledger_entries (wallet_account_id, direction, amount, currency, entry_type, reference_type, reference_id, external_txn_id, status, note)
  VALUES (v_sender_wallet_id, 'out', p_amount, p_currency, 'transfer', 'p2p_transfer', v_transfer_id::text, v_idem_key, 'posted', COALESCE(p_note, 'P2P transfer'));

  -- Credit receiver ledger
  INSERT INTO wallet_ledger_entries (wallet_account_id, direction, amount, currency, entry_type, reference_type, reference_id, external_txn_id, status, note)
  VALUES (v_receiver_wallet_id, 'in', p_amount, p_currency, 'transfer', 'p2p_transfer', v_transfer_id::text, v_idem_key || '_cr', 'posted', COALESCE(p_note, 'P2P transfer'));

  -- Atomic balance update
  UPDATE wallet_accounts SET balance = balance - p_amount, available_balance = available_balance - p_amount, updated_at = now() WHERE id = v_sender_wallet_id;
  UPDATE wallet_accounts SET balance = balance + p_amount, available_balance = available_balance + p_amount, updated_at = now() WHERE id = v_receiver_wallet_id;

  -- Write unified transaction history
  INSERT INTO unified_wallet_transactions (sender_id, recipient_id, amount, currency, context_type, title, subtitle, status, metadata)
  VALUES (p_sender_user_id, p_receiver_user_id, p_amount, p_currency, p_source, 'P2P Transfer', p_note, 'completed',
    jsonb_build_object('transfer_id', v_transfer_id, 'idempotency_key', v_idem_key));

  -- Audit log
  INSERT INTO audit_logs (user_id, action, metadata_json)
  VALUES (p_sender_user_id, 'atomic_wallet_transfer', jsonb_build_object(
    'transfer_id', v_transfer_id,
    'sender_user_id', p_sender_user_id,
    'receiver_user_id', p_receiver_user_id,
    'amount', p_amount,
    'currency', p_currency,
    'idempotency_key', v_idem_key
  ));

  RETURN jsonb_build_object('success', true, 'transfer_id', v_transfer_id, 'amount', p_amount, 'currency', p_currency);
END;
$$;
