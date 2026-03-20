
-- 1. merchant_accounts
CREATE TABLE public.merchant_accounts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  shop_id uuid REFERENCES public.storefront_pages(id) ON DELETE SET NULL,
  kyc_status text NOT NULL DEFAULT 'not_started',
  payout_enabled boolean NOT NULL DEFAULT false,
  payout_provider_account_id text,
  legal_name text,
  country text DEFAULT 'AE',
  currency text DEFAULT 'AED',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, shop_id)
);

ALTER TABLE public.merchant_accounts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users see own merchant accounts"
  ON public.merchant_accounts FOR SELECT TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users insert own merchant accounts"
  ON public.merchant_accounts FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users update own merchant accounts"
  ON public.merchant_accounts FOR UPDATE TO authenticated
  USING (user_id = auth.uid());

-- 2. merchant_balances
CREATE TABLE public.merchant_balances (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  merchant_id uuid NOT NULL REFERENCES public.merchant_accounts(id) ON DELETE CASCADE,
  currency text NOT NULL DEFAULT 'AED',
  pending_balance numeric NOT NULL DEFAULT 0,
  available_balance numeric NOT NULL DEFAULT 0,
  locked_balance numeric NOT NULL DEFAULT 0,
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(merchant_id, currency)
);

ALTER TABLE public.merchant_balances ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.is_merchant_owner(_merchant_id uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.merchant_accounts
    WHERE id = _merchant_id AND user_id = auth.uid()
  );
$$;

CREATE POLICY "Merchants see own balances"
  ON public.merchant_balances FOR SELECT TO authenticated
  USING (public.is_merchant_owner(merchant_id));

-- 3. settlement_ledger
CREATE TABLE public.settlement_ledger (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  merchant_id uuid NOT NULL REFERENCES public.merchant_accounts(id) ON DELETE CASCADE,
  order_id uuid,
  booking_id uuid,
  payment_id text,
  gross_amount numeric NOT NULL,
  platform_fee numeric NOT NULL DEFAULT 0,
  processing_fee numeric NOT NULL DEFAULT 0,
  net_amount numeric NOT NULL,
  currency text NOT NULL DEFAULT 'AED',
  status text NOT NULL DEFAULT 'pending',
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.settlement_ledger ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Merchants see own settlements"
  ON public.settlement_ledger FOR SELECT TO authenticated
  USING (public.is_merchant_owner(merchant_id));

-- 4. order_status_history
CREATE TABLE public.order_status_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL,
  status text NOT NULL,
  actor_type text DEFAULT 'system',
  actor_id uuid,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.order_status_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users read order status history"
  ON public.order_status_history FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "Authenticated users insert order status history"
  ON public.order_status_history FOR INSERT TO authenticated
  WITH CHECK (true);

-- Enable realtime on key tables
ALTER PUBLICATION supabase_realtime ADD TABLE public.merchant_balances;
ALTER PUBLICATION supabase_realtime ADD TABLE public.order_status_history;
