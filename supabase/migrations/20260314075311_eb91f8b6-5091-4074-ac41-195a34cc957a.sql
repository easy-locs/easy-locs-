
-- Anti-replay nonce table for QR payments
CREATE TABLE IF NOT EXISTS public.payment_nonces (
  nonce TEXT PRIMARY KEY,
  user_id UUID NOT NULL,
  used_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  payload_json JSONB
);
ALTER TABLE public.payment_nonces ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Service role only" ON public.payment_nonces FOR ALL USING (false);

-- Create index for fast nonce lookups
CREATE INDEX IF NOT EXISTS idx_payment_nonces_created ON public.payment_nonces (used_at);

-- Auto-cleanup old nonces (> 24h)
CREATE OR REPLACE FUNCTION public.cleanup_expired_nonces()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE deleted_count integer;
BEGIN
  WITH expired AS (
    DELETE FROM public.payment_nonces WHERE used_at < now() - interval '24 hours' RETURNING nonce
  )
  SELECT count(*) INTO deleted_count FROM expired;
  RETURN deleted_count;
END;
$$;

-- Atomic LOCS transfer function
CREATE OR REPLACE FUNCTION public.transfer_locs(
  _sender_id UUID,
  _recipient_id UUID,
  _amount NUMERIC,
  _description TEXT DEFAULT 'LOCS Transfer',
  _thread_id UUID DEFAULT NULL,
  _reference_type TEXT DEFAULT NULL,
  _reference_id TEXT DEFAULT NULL,
  _qr_nonce TEXT DEFAULT NULL,
  _metadata JSONB DEFAULT '{}'
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _sender_balance NUMERIC;
  _recipient_balance NUMERIC;
  _tx_out_id UUID;
  _tx_in_id UUID;
BEGIN
  -- Validate caller is the sender
  IF auth.uid() IS NULL OR auth.uid() != _sender_id THEN
    RETURN jsonb_build_object('success', false, 'error', 'Unauthorized');
  END IF;

  -- Cannot self-transfer
  IF _sender_id = _recipient_id THEN
    RETURN jsonb_build_object('success', false, 'error', 'Cannot transfer to yourself');
  END IF;

  -- Validate amount
  IF _amount <= 0 THEN
    RETURN jsonb_build_object('success', false, 'error', 'Invalid amount');
  END IF;

  -- Anti-replay: check QR nonce if provided
  IF _qr_nonce IS NOT NULL THEN
    IF EXISTS (SELECT 1 FROM public.payment_nonces WHERE nonce = _qr_nonce) THEN
      RETURN jsonb_build_object('success', false, 'error', 'QR code already used');
    END IF;
    INSERT INTO public.payment_nonces (nonce, user_id, payload_json)
    VALUES (_qr_nonce, _sender_id, _metadata);
  END IF;

  -- Lock sender row to prevent concurrent transfers
  SELECT balance INTO _sender_balance
  FROM public.wallet_balances
  WHERE user_id = _sender_id AND currency = 'LOCS'
  FOR UPDATE;

  IF _sender_balance IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'No wallet found');
  END IF;

  IF _sender_balance < _amount THEN
    RETURN jsonb_build_object('success', false, 'error', 'Insufficient balance');
  END IF;

  -- Debit sender
  UPDATE public.wallet_balances
  SET balance = balance - _amount,
      total_spent = COALESCE(total_spent, 0) + _amount,
      updated_at = now()
  WHERE user_id = _sender_id AND currency = 'LOCS';

  -- Credit recipient (upsert)
  INSERT INTO public.wallet_balances (user_id, currency, balance, frozen_balance, total_purchased, total_spent)
  VALUES (_recipient_id, 'LOCS', _amount, 0, 0, 0)
  ON CONFLICT (user_id, currency)
  DO UPDATE SET
    balance = wallet_balances.balance + _amount,
    updated_at = now();

  -- Record outgoing transaction
  INSERT INTO public.wallet_transactions (
    user_id, counterpart_user_id, type, direction, amount, currency,
    description, status, thread_id, reference_type, reference_id, metadata_json
  ) VALUES (
    _sender_id, _recipient_id, 'transfer', 'out', _amount, 'LOCS',
    _description, 'completed', _thread_id, _reference_type, _reference_id, _metadata
  ) RETURNING id INTO _tx_out_id;

  -- Record incoming transaction
  INSERT INTO public.wallet_transactions (
    user_id, counterpart_user_id, type, direction, amount, currency,
    description, status, thread_id, reference_type, reference_id, metadata_json
  ) VALUES (
    _recipient_id, _sender_id, 'transfer', 'in', _amount, 'LOCS',
    COALESCE(_description, 'LOCS received'), 'completed', _thread_id, _reference_type, _reference_id, _metadata
  ) RETURNING id INTO _tx_in_id;

  -- Audit
  INSERT INTO public.audit_logs (user_id, action, metadata_json)
  VALUES (_sender_id, 'locs_transfer', jsonb_build_object(
    'amount', _amount,
    'recipient_id', _recipient_id,
    'tx_out_id', _tx_out_id,
    'tx_in_id', _tx_in_id,
    'thread_id', _thread_id,
    'qr_nonce', _qr_nonce
  ));

  RETURN jsonb_build_object(
    'success', true,
    'tx_out_id', _tx_out_id,
    'tx_in_id', _tx_in_id
  );
END;
$$;
