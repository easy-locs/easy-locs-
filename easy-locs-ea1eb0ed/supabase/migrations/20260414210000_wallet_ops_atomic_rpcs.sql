-- Atomic wallet operations RPCs
-- These RPCs wrap multi-step wallet operations in single transactions
-- to prevent partial state on failure.

CREATE OR REPLACE FUNCTION wallet_authorize(
  p_order_id UUID,
  p_customer_wallet_id UUID,
  p_amount NUMERIC,
  p_currency TEXT,
  p_anomaly_score INT DEFAULT 0,
  p_anomaly_flags TEXT[] DEFAULT '{}'
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_wallet RECORD;
  v_new_cash NUMERIC;
  v_new_locked NUMERIC;
  v_tx_id UUID;
  v_review_required BOOLEAN;
BEGIN
  SELECT balance_cash, balance_locked INTO v_wallet
    FROM wallet_accounts
    WHERE id = p_customer_wallet_id
    FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('error', 'Wallet not found');
  END IF;

  IF v_wallet.balance_cash < p_amount THEN
    RETURN jsonb_build_object('error', 'Insufficient balance');
  END IF;

  v_new_cash := v_wallet.balance_cash - p_amount;
  v_new_locked := v_wallet.balance_locked + p_amount;

  UPDATE wallet_accounts
    SET balance_cash = v_new_cash,
        balance_locked = v_new_locked,
        updated_at = NOW()
    WHERE id = p_customer_wallet_id;

  INSERT INTO wallet_transactions (
    transaction_type, source_wallet_id, destination_wallet_id,
    order_id, status, value_type, amount, currency, metadata
  ) VALUES (
    'order_authorization', p_customer_wallet_id, NULL,
    p_order_id, 'authorized', 'cash', p_amount, p_currency,
    CASE WHEN p_anomaly_score >= 40
      THEN jsonb_build_object('anomaly_flags', p_anomaly_flags, 'anomaly_score', p_anomaly_score)
      ELSE '{}'::jsonb
    END
  ) RETURNING id INTO v_tx_id;

  INSERT INTO wallet_ledger_entries (
    transaction_id, wallet_account_id, entry_type, amount, currency, value_type
  ) VALUES (
    v_tx_id, p_customer_wallet_id, 'lock', p_amount, p_currency, 'cash'
  );

  v_review_required := p_anomaly_score >= 40;

  UPDATE orders
    SET payment_status = CASE WHEN v_review_required THEN 'review_required' ELSE 'authorized' END,
        wallet_status = 'authorized',
        payment_mode = 'wallet_internal',
        customer_wallet_id = p_customer_wallet_id
    WHERE id = p_order_id;

  RETURN jsonb_build_object(
    'success', TRUE,
    'transaction_id', v_tx_id,
    'review_required', v_review_required
  );
END;
$$;

CREATE OR REPLACE FUNCTION wallet_settle(
  p_order_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_order RECORD;
  v_split RECORD;
  v_dest_wallet RECORD;
  v_tx_id UUID;
  v_order_currency TEXT;
  v_splits_count INT := 0;
  v_cw RECORD;
  v_unlock_tx_id UUID;
BEGIN
  SELECT wallet_status, customer_wallet_id, gross_amount, payment_status, currency
    INTO v_order FROM orders WHERE id = p_order_id FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('error', 'Order not found');
  END IF;

  IF v_order.wallet_status = 'settled' THEN
    RETURN jsonb_build_object('already_settled', TRUE);
  END IF;

  IF v_order.wallet_status NOT IN ('captured', 'authorized') THEN
    RETURN jsonb_build_object('error', 'Cannot settle from status: ' || v_order.wallet_status);
  END IF;

  IF v_order.payment_status = 'review_required' THEN
    RETURN jsonb_build_object('error', 'Transaction flagged for review');
  END IF;

  v_order_currency := COALESCE(v_order.currency, 'AED');

  FOR v_split IN
    SELECT * FROM wallet_order_splits
      WHERE order_id = p_order_id AND split_status = 'pending'
      FOR UPDATE
  LOOP
    IF v_split.net_amount <= 0 THEN CONTINUE; END IF;

    SELECT balance_cash INTO v_dest_wallet
      FROM wallet_accounts WHERE id = v_split.wallet_account_id FOR UPDATE;

    IF NOT FOUND THEN CONTINUE; END IF;

    UPDATE wallet_accounts
      SET balance_cash = v_dest_wallet.balance_cash + v_split.net_amount,
          updated_at = NOW()
      WHERE id = v_split.wallet_account_id;

    INSERT INTO wallet_transactions (
      transaction_type, source_wallet_id, destination_wallet_id,
      order_id, status, value_type, amount, currency, metadata
    ) VALUES (
      CASE v_split.split_party_type
        WHEN 'driver' THEN 'driver_payout'
        WHEN 'platform' THEN 'platform_commission'
        ELSE 'order_settlement'
      END,
      v_order.customer_wallet_id, v_split.wallet_account_id,
      p_order_id, 'settled', 'cash', v_split.net_amount, v_order_currency,
      jsonb_build_object('split_party_type', v_split.split_party_type)
    ) RETURNING id INTO v_tx_id;

    INSERT INTO wallet_ledger_entries (
      transaction_id, wallet_account_id, entry_type, amount, currency, value_type
    ) VALUES (
      v_tx_id, v_split.wallet_account_id, 'credit', v_split.net_amount, v_order_currency, 'cash'
    );

    UPDATE wallet_order_splits SET split_status = 'settled', updated_at = NOW() WHERE id = v_split.id;
    v_splits_count := v_splits_count + 1;
  END LOOP;

  IF v_splits_count = 0 THEN
    RETURN jsonb_build_object('error', 'No pending splits');
  END IF;

  IF v_order.customer_wallet_id IS NOT NULL THEN
    SELECT balance_locked INTO v_cw
      FROM wallet_accounts WHERE id = v_order.customer_wallet_id FOR UPDATE;

    IF FOUND THEN
      UPDATE wallet_accounts
        SET balance_locked = GREATEST(0, v_cw.balance_locked - v_order.gross_amount),
            updated_at = NOW()
        WHERE id = v_order.customer_wallet_id;

      INSERT INTO wallet_transactions (
        transaction_type, source_wallet_id, order_id, status, value_type,
        amount, currency, metadata
      ) VALUES (
        'order_settlement', v_order.customer_wallet_id, p_order_id, 'settled', 'cash',
        v_order.gross_amount, v_order_currency, '{"stage":"unlock_customer"}'::jsonb
      ) RETURNING id INTO v_unlock_tx_id;

      INSERT INTO wallet_ledger_entries (
        transaction_id, wallet_account_id, entry_type, amount, currency, value_type
      ) VALUES (
        v_unlock_tx_id, v_order.customer_wallet_id, 'unlock', v_order.gross_amount, v_order_currency, 'cash'
      );
    END IF;
  END IF;

  UPDATE orders
    SET payment_status = 'settled', wallet_status = 'settled', settlement_status = 'settled'
    WHERE id = p_order_id;

  RETURN jsonb_build_object('success', TRUE, 'splits_count', v_splits_count);
END;
$$;

CREATE OR REPLACE FUNCTION wallet_reverse(
  p_order_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_order RECORD;
  v_cw RECORD;
  v_tx_id UUID;
  v_order_currency TEXT;
BEGIN
  SELECT customer_wallet_id, gross_amount, wallet_status, currency
    INTO v_order FROM orders WHERE id = p_order_id FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('error', 'Order not found');
  END IF;

  IF v_order.wallet_status = 'reversed' THEN
    RETURN jsonb_build_object('already_reversed', TRUE);
  END IF;

  IF v_order.wallet_status = 'settled' THEN
    RETURN jsonb_build_object('error', 'Cannot reverse settled order — use refund');
  END IF;

  v_order_currency := COALESCE(v_order.currency, 'AED');

  IF v_order.customer_wallet_id IS NOT NULL THEN
    SELECT balance_cash, balance_locked INTO v_cw
      FROM wallet_accounts WHERE id = v_order.customer_wallet_id FOR UPDATE;

    IF FOUND THEN
      UPDATE wallet_accounts
        SET balance_cash = v_cw.balance_cash + v_order.gross_amount,
            balance_locked = GREATEST(0, v_cw.balance_locked - v_order.gross_amount),
            updated_at = NOW()
        WHERE id = v_order.customer_wallet_id;

      INSERT INTO wallet_transactions (
        transaction_type, source_wallet_id, destination_wallet_id,
        order_id, status, value_type, amount, currency, metadata
      ) VALUES (
        'reversal', NULL, v_order.customer_wallet_id,
        p_order_id, 'reversed', 'cash', v_order.gross_amount, v_order_currency,
        '{"stage":"reverse"}'::jsonb
      ) RETURNING id INTO v_tx_id;

      INSERT INTO wallet_ledger_entries (
        transaction_id, wallet_account_id, entry_type, amount, currency, value_type
      ) VALUES
        (v_tx_id, v_order.customer_wallet_id, 'unlock', v_order.gross_amount, v_order_currency, 'cash'),
        (v_tx_id, v_order.customer_wallet_id, 'credit', v_order.gross_amount, v_order_currency, 'cash');
    END IF;
  END IF;

  UPDATE wallet_order_splits
    SET split_status = 'reversed', updated_at = NOW()
    WHERE order_id = p_order_id;

  UPDATE orders
    SET payment_status = 'reversed', wallet_status = 'reversed',
        settlement_status = 'reversed', status = 'cancelled'
    WHERE id = p_order_id;

  RETURN jsonb_build_object('success', TRUE);
END;
$$;

CREATE OR REPLACE FUNCTION qr_confirm_security_action(
  p_action TEXT,
  p_payload_user_id UUID DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_user_id UUID;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object('error', 'User not authenticated');
  END IF;

  IF p_action NOT IN ('login_verify', 'device_link') THEN
    RETURN jsonb_build_object('error', 'Unsupported action: ' || p_action);
  END IF;

  INSERT INTO audit_logs (user_id, action, metadata_json)
  VALUES (
    v_user_id,
    CASE p_action
      WHEN 'login_verify' THEN 'qr_login_verified'
      WHEN 'device_link' THEN 'qr_device_linked'
    END,
    jsonb_build_object('payload_user', p_payload_user_id, 'ts', NOW()::text, 'server_confirmed', true)
  );

  RETURN jsonb_build_object('success', TRUE, 'action', p_action);
END;
$$;

REVOKE EXECUTE ON FUNCTION wallet_authorize FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION wallet_settle FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION wallet_reverse FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION wallet_authorize TO service_role;
GRANT EXECUTE ON FUNCTION wallet_settle TO service_role;
GRANT EXECUTE ON FUNCTION wallet_reverse TO service_role;

REVOKE EXECUTE ON FUNCTION qr_confirm_security_action FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION qr_confirm_security_action TO authenticated, service_role;
