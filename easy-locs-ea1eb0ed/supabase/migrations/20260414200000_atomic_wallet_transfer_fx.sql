CREATE OR REPLACE FUNCTION public.atomic_wallet_transfer_fx(
  p_sender_user_id uuid,
  p_receiver_user_id uuid,
  p_sender_amount numeric,
  p_sender_currency text,
  p_receiver_amount numeric,
  p_receiver_currency text,
  p_fx_rate numeric DEFAULT NULL,
  p_fx_spread numeric DEFAULT NULL,
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
  v_idem_key := COALESCE(p_idempotency_key, 'atfx_' || gen_random_uuid()::text);

  SELECT id, status INTO v_existing
  FROM wallet_transfers
  WHERE idempotency_key = v_idem_key
  LIMIT 1;

  IF v_existing IS NOT NULL THEN
    RETURN jsonb_build_object('success', true, 'duplicate', true, 'transfer_id', v_existing.id);
  END IF;

  SELECT id, COALESCE(balance, available_balance, 0)
  INTO v_sender_wallet_id, v_sender_balance
  FROM wallet_accounts
  WHERE owner_user_id = p_sender_user_id AND currency = p_sender_currency
  ORDER BY created_at ASC LIMIT 1
  FOR UPDATE;

  IF v_sender_wallet_id IS NULL THEN
    RAISE EXCEPTION 'Sender wallet not found for currency %', p_sender_currency;
  END IF;

  IF v_sender_balance < p_sender_amount THEN
    RAISE EXCEPTION 'Insufficient balance. Available: % %', v_sender_balance, p_sender_currency;
  END IF;

  SELECT id INTO v_receiver_wallet_id
  FROM wallet_accounts
  WHERE owner_user_id = p_receiver_user_id AND currency = p_receiver_currency
  ORDER BY created_at ASC LIMIT 1
  FOR UPDATE;

  IF v_receiver_wallet_id IS NULL THEN
    INSERT INTO wallet_accounts (owner_user_id, currency, account_type, balance, available_balance, pending_balance, status)
    VALUES (p_receiver_user_id, p_receiver_currency, 'fiat', 0, 0, 0, 'active')
    RETURNING id INTO v_receiver_wallet_id;
  END IF;

  v_transfer_id := gen_random_uuid();
  INSERT INTO wallet_transfers (
    id, from_wallet_id, to_wallet_id, amount, currency, transfer_type, status,
    sender_user_id, receiver_user_id, idempotency_key, source, note, metadata, updated_at
  ) VALUES (
    v_transfer_id, v_sender_wallet_id, v_receiver_wallet_id, p_sender_amount, p_sender_currency,
    'p2p_fx', 'completed',
    p_sender_user_id, p_receiver_user_id, v_idem_key, p_source, p_note,
    jsonb_build_object(
      'source', p_source,
      'fx_rate', p_fx_rate,
      'fx_spread', p_fx_spread,
      'sender_amount', p_sender_amount,
      'sender_currency', p_sender_currency,
      'receiver_amount', p_receiver_amount,
      'receiver_currency', p_receiver_currency
    ), now()
  );

  INSERT INTO wallet_ledger_entries (wallet_account_id, direction, amount, currency, entry_type, reference_type, reference_id, external_txn_id, status, note)
  VALUES (v_sender_wallet_id, 'out', p_sender_amount, p_sender_currency, 'transfer', 'p2p_fx_transfer', v_transfer_id::text, v_idem_key, 'posted', COALESCE(p_note, 'FX transfer'));

  INSERT INTO wallet_ledger_entries (wallet_account_id, direction, amount, currency, entry_type, reference_type, reference_id, external_txn_id, status, note)
  VALUES (v_receiver_wallet_id, 'in', p_receiver_amount, p_receiver_currency, 'transfer', 'p2p_fx_transfer', v_transfer_id::text, v_idem_key || '_cr', 'posted', COALESCE(p_note, 'FX transfer'));

  UPDATE wallet_accounts SET balance = balance - p_sender_amount, available_balance = available_balance - p_sender_amount, updated_at = now() WHERE id = v_sender_wallet_id;
  UPDATE wallet_accounts SET balance = balance + p_receiver_amount, available_balance = available_balance + p_receiver_amount, updated_at = now() WHERE id = v_receiver_wallet_id;

  INSERT INTO unified_wallet_transactions (sender_id, recipient_id, amount, currency, context_type, title, subtitle, status, metadata)
  VALUES (p_sender_user_id, p_receiver_user_id, p_sender_amount, p_sender_currency, p_source, 'FX Transfer',
    p_note, 'completed',
    jsonb_build_object(
      'transfer_id', v_transfer_id, 'idempotency_key', v_idem_key,
      'fx_rate', p_fx_rate, 'fx_spread', p_fx_spread,
      'receiver_amount', p_receiver_amount, 'receiver_currency', p_receiver_currency
    ));

  INSERT INTO audit_logs (user_id, action, metadata_json)
  VALUES (p_sender_user_id, 'atomic_wallet_transfer_fx', jsonb_build_object(
    'transfer_id', v_transfer_id,
    'sender_user_id', p_sender_user_id,
    'receiver_user_id', p_receiver_user_id,
    'sender_amount', p_sender_amount,
    'sender_currency', p_sender_currency,
    'receiver_amount', p_receiver_amount,
    'receiver_currency', p_receiver_currency,
    'fx_rate', p_fx_rate,
    'fx_spread', p_fx_spread,
    'idempotency_key', v_idem_key
  ));

  RETURN jsonb_build_object(
    'success', true,
    'transfer_id', v_transfer_id,
    'sender_amount', p_sender_amount,
    'sender_currency', p_sender_currency,
    'receiver_amount', p_receiver_amount,
    'receiver_currency', p_receiver_currency,
    'fx_rate', p_fx_rate
  );
END;
$$;
