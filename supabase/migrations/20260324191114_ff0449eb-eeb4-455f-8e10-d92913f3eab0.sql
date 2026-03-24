
DROP FUNCTION IF EXISTS public.ensure_wallet_account(uuid, text);

CREATE OR REPLACE FUNCTION public.ensure_wallet_account(target_user_id uuid, target_currency text DEFAULT 'AED')
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  wallet_row wallet_accounts%ROWTYPE;
BEGIN
  SELECT * INTO wallet_row
  FROM wallet_accounts
  WHERE owner_user_id = target_user_id AND status = 'active'
  LIMIT 1;

  IF FOUND THEN
    RETURN jsonb_build_object('status', 'exists', 'wallet_id', wallet_row.id);
  END IF;

  INSERT INTO wallet_accounts (owner_user_id, currency, balance, status)
  VALUES (target_user_id, target_currency, 0, 'active')
  ON CONFLICT DO NOTHING
  RETURNING * INTO wallet_row;

  IF wallet_row.id IS NOT NULL THEN
    RETURN jsonb_build_object('status', 'created', 'wallet_id', wallet_row.id);
  END IF;

  SELECT * INTO wallet_row
  FROM wallet_accounts
  WHERE owner_user_id = target_user_id AND status = 'active'
  LIMIT 1;

  RETURN jsonb_build_object('status', 'exists', 'wallet_id', wallet_row.id);
END;
$$;
