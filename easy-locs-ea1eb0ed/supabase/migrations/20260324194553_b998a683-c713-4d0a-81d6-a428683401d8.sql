-- Harden wallet integrity: deactivate historical duplicate active wallets and prevent future duplicates.

-- 1) Keep only the oldest active wallet per owner/currency, deactivate the rest safely.
WITH ranked AS (
  SELECT
    id,
    owner_user_id,
    currency,
    created_at,
    ROW_NUMBER() OVER (
      PARTITION BY owner_user_id, currency
      ORDER BY created_at ASC NULLS LAST, id ASC
    ) AS rn
  FROM public.wallet_accounts
  WHERE status = 'active'
    AND owner_user_id IS NOT NULL
    AND currency IS NOT NULL
)
UPDATE public.wallet_accounts wa
SET status = 'merged_duplicate'
FROM ranked r
WHERE wa.id = r.id
  AND r.rn > 1;

-- 2) Enforce exactly one active wallet per owner/currency going forward.
CREATE UNIQUE INDEX IF NOT EXISTS wallet_accounts_one_active_per_owner_currency_idx
ON public.wallet_accounts (owner_user_id, currency)
WHERE status = 'active' AND owner_user_id IS NOT NULL AND currency IS NOT NULL;

-- 3) Make ensure_wallet_account deterministic and race-safe with the partial unique index.
DROP FUNCTION IF EXISTS public.ensure_wallet_account(uuid, text);

CREATE OR REPLACE FUNCTION public.ensure_wallet_account(target_user_id uuid, target_currency text DEFAULT 'AED')
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  wallet_row public.wallet_accounts%ROWTYPE;
BEGIN
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
      status
    )
    VALUES (
      target_user_id,
      target_currency,
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