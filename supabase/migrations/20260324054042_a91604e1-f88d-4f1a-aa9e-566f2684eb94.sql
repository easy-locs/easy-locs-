CREATE OR REPLACE FUNCTION public.ensure_wallet_account(
  target_user_id uuid,
  target_currency text DEFAULT 'AED'
)
RETURNS TABLE(wallet_id uuid, wallet_status text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _wallet_id uuid;
  _wallet_status text;
BEGIN
  SELECT wa.id, wa.status INTO _wallet_id, _wallet_status
  FROM wallet_accounts wa
  WHERE wa.owner_user_id = target_user_id
    AND wa.status = 'active'
    AND wa.currency = target_currency
  LIMIT 1;

  IF _wallet_id IS NOT NULL THEN
    RETURN QUERY SELECT _wallet_id, _wallet_status;
    RETURN;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM profiles p WHERE p.id = target_user_id) THEN
    RAISE EXCEPTION 'User does not exist: %', target_user_id;
  END IF;

  INSERT INTO wallet_accounts (owner_user_id, currency, balance, available_balance, pending_balance, status, owner_type, account_type)
  VALUES (target_user_id, target_currency, 0, 0, 0, 'active', 'user', 'fiat')
  ON CONFLICT DO NOTHING
  RETURNING id, status INTO _wallet_id, _wallet_status;

  IF _wallet_id IS NULL THEN
    SELECT wa.id, wa.status INTO _wallet_id, _wallet_status
    FROM wallet_accounts wa
    WHERE wa.owner_user_id = target_user_id
      AND wa.status = 'active'
      AND wa.currency = target_currency
    LIMIT 1;
  END IF;

  RETURN QUERY SELECT _wallet_id, COALESCE(_wallet_status, 'missing');
END;
$$;