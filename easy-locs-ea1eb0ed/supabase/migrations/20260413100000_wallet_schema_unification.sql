DROP FUNCTION IF EXISTS public.ensure_wallet_account(uuid, text);

CREATE OR REPLACE FUNCTION public.ensure_wallet_account(target_user_id uuid, target_currency text DEFAULT 'AED')
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  wallet_row public.wallet_accounts%ROWTYPE;
  calling_uid uuid;
BEGIN
  calling_uid := auth.uid();
  IF calling_uid IS NULL THEN
    RAISE EXCEPTION 'ensure_wallet_account requires an authenticated session';
  END IF;
  IF calling_uid <> target_user_id THEN
    RAISE EXCEPTION 'ensure_wallet_account: caller % cannot create wallet for user %', calling_uid, target_user_id;
  END IF;

  SELECT * INTO wallet_row
  FROM public.wallet_accounts
  WHERE owner_user_id = target_user_id
    AND currency = target_currency
    AND status = 'active'
  ORDER BY created_at ASC NULLS LAST, id ASC
  LIMIT 1;

  IF FOUND THEN
    RETURN jsonb_build_object('status', 'exists', 'wallet_id', wallet_row.id, 'currency', wallet_row.currency);
  END IF;

  BEGIN
    INSERT INTO public.wallet_accounts (
      owner_user_id,
      currency,
      balance,
      available_balance,
      pending_balance,
      balance_cash,
      balance_bonus,
      balance_locked,
      status
    )
    VALUES (
      target_user_id,
      target_currency,
      0,
      0,
      0,
      0,
      0,
      0,
      'active'
    )
    RETURNING * INTO wallet_row;
  EXCEPTION
    WHEN unique_violation THEN
      NULL;
  END;

  IF wallet_row.id IS NULL THEN
    SELECT * INTO wallet_row
    FROM public.wallet_accounts
    WHERE owner_user_id = target_user_id
      AND currency = target_currency
      AND status = 'active'
    ORDER BY created_at ASC NULLS LAST, id ASC
    LIMIT 1;
  END IF;

  RETURN jsonb_build_object('status', CASE WHEN wallet_row.id IS NOT NULL THEN 'ready' ELSE 'missing' END, 'wallet_id', wallet_row.id, 'currency', wallet_row.currency);
END;
$$;
