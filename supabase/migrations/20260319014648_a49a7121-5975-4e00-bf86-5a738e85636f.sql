
-- ============================================================
-- 1. Evolve wallet_accounts
-- ============================================================
ALTER TABLE public.wallet_accounts
  ADD COLUMN IF NOT EXISTS owner_profile_id uuid,
  ADD COLUMN IF NOT EXISTS balance_cash numeric(18,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS balance_bonus numeric(18,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS balance_locked numeric(18,2) NOT NULL DEFAULT 0;

-- ============================================================
-- 2. wallet_pins
-- ============================================================
CREATE TABLE public.wallet_pins (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  wallet_account_id uuid NOT NULL REFERENCES public.wallet_accounts(id) ON DELETE CASCADE UNIQUE,
  pin_hash text NOT NULL,
  failed_attempts int NOT NULL DEFAULT 0,
  locked_until timestamptz,
  last_verified_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.wallet_pins ENABLE ROW LEVEL SECURITY;
CREATE POLICY "wallet_pins_owner" ON public.wallet_pins
  FOR ALL TO authenticated
  USING (wallet_account_id IN (SELECT id FROM public.wallet_accounts WHERE owner_user_id = auth.uid()))
  WITH CHECK (wallet_account_id IN (SELECT id FROM public.wallet_accounts WHERE owner_user_id = auth.uid()));

-- ============================================================
-- 3. wallet_order_splits
-- ============================================================
CREATE TABLE public.wallet_order_splits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  split_party_type text NOT NULL CHECK (split_party_type IN ('merchant','driver','platform')),
  wallet_account_id uuid NOT NULL REFERENCES public.wallet_accounts(id),
  gross_amount numeric(18,2) NOT NULL DEFAULT 0,
  net_amount numeric(18,2) NOT NULL DEFAULT 0,
  split_status text NOT NULL DEFAULT 'pending' CHECK (split_status IN ('pending','reserved','settled','reversed')),
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.wallet_order_splits ENABLE ROW LEVEL SECURITY;
CREATE POLICY "splits_read_own" ON public.wallet_order_splits
  FOR SELECT TO authenticated
  USING (wallet_account_id IN (SELECT id FROM public.wallet_accounts WHERE owner_user_id = auth.uid()));

-- ============================================================
-- 4. commission_rules
-- ============================================================
CREATE TABLE public.commission_rules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  vertical text NOT NULL,
  country_code text NOT NULL,
  city text,
  commission_mode text NOT NULL DEFAULT 'cash',
  commission_rate numeric(8,4) NOT NULL DEFAULT 0.05,
  commission_discount numeric(8,4) NOT NULL DEFAULT 0,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.commission_rules ENABLE ROW LEVEL SECURITY;
CREATE POLICY "commission_rules_read" ON public.commission_rules
  FOR SELECT TO authenticated USING (true);

-- ============================================================
-- 5. delivery_pricing_rules
-- ============================================================
CREATE TABLE public.delivery_pricing_rules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  country_code text NOT NULL,
  city text,
  base_fee numeric(18,2) NOT NULL DEFAULT 0,
  min_fee numeric(18,2) NOT NULL DEFAULT 0,
  max_fee numeric(18,2),
  per_km_rate numeric(18,2) NOT NULL DEFAULT 0,
  peak_multiplier numeric(8,4) NOT NULL DEFAULT 1,
  night_multiplier numeric(8,4) NOT NULL DEFAULT 1,
  premium_zone_multiplier numeric(8,4) NOT NULL DEFAULT 1,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.delivery_pricing_rules ENABLE ROW LEVEL SECURITY;
CREATE POLICY "delivery_pricing_rules_read" ON public.delivery_pricing_rules
  FOR SELECT TO authenticated USING (true);

-- ============================================================
-- 6. qr_order_targets
-- ============================================================
CREATE TABLE public.qr_order_targets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  merchant_profile_id uuid NOT NULL REFERENCES public.merchant_onboarding_profiles(id) ON DELETE CASCADE,
  storefront_page_id uuid NOT NULL REFERENCES public.storefront_pages(id) ON DELETE CASCADE,
  target_type text NOT NULL CHECK (target_type IN ('global_menu','table','counter','room_service')),
  target_label text NOT NULL,
  target_code text NOT NULL UNIQUE,
  table_number text,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.qr_order_targets ENABLE ROW LEVEL SECURITY;
CREATE POLICY "qr_targets_read" ON public.qr_order_targets FOR SELECT USING (active = true);
CREATE POLICY "qr_targets_manage" ON public.qr_order_targets
  FOR ALL TO authenticated
  USING (merchant_profile_id IN (SELECT id FROM public.merchant_onboarding_profiles WHERE claimed_by::uuid = auth.uid()))
  WITH CHECK (merchant_profile_id IN (SELECT id FROM public.merchant_onboarding_profiles WHERE claimed_by::uuid = auth.uid()));

-- ============================================================
-- 7. pos_orders
-- ============================================================
CREATE TABLE public.pos_orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE UNIQUE,
  source_type text NOT NULL CHECK (source_type IN ('qr','pos','staff')),
  order_type text NOT NULL CHECK (order_type IN ('dine_in','takeaway','delivery')),
  table_number text,
  notes text,
  kitchen_status text NOT NULL DEFAULT 'new' CHECK (kitchen_status IN ('new','preparing','ready','served','picked_up','cancelled')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.pos_orders ENABLE ROW LEVEL SECURITY;
CREATE POLICY "pos_orders_merchant" ON public.pos_orders
  FOR ALL TO authenticated
  USING (order_id IN (
    SELECT o.id FROM public.orders o
    JOIN public.merchant_onboarding_profiles m ON o.merchant_profile_id = m.id
    WHERE m.claimed_by::uuid = auth.uid()
  ))
  WITH CHECK (order_id IN (
    SELECT o.id FROM public.orders o
    JOIN public.merchant_onboarding_profiles m ON o.merchant_profile_id = m.id
    WHERE m.claimed_by::uuid = auth.uid()
  ));
CREATE POLICY "pos_orders_customer" ON public.pos_orders
  FOR SELECT TO authenticated
  USING (order_id IN (SELECT id FROM public.orders WHERE customer_user_id = auth.uid()));

-- ============================================================
-- 8. payout_profiles
-- ============================================================
CREATE TABLE public.payout_profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_type text NOT NULL CHECK (owner_type IN ('merchant','driver')),
  owner_profile_id uuid NOT NULL,
  payout_mode text NOT NULL DEFAULT 'internal_wallet',
  status text NOT NULL DEFAULT 'active',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.payout_profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "payout_profiles_owner" ON public.payout_profiles
  FOR ALL TO authenticated
  USING (owner_profile_id IN (
    SELECT id FROM public.merchant_onboarding_profiles WHERE claimed_by::uuid = auth.uid()
    UNION ALL
    SELECT id FROM public.driver_profiles WHERE user_id = auth.uid()
  ))
  WITH CHECK (owner_profile_id IN (
    SELECT id FROM public.merchant_onboarding_profiles WHERE claimed_by::uuid = auth.uid()
    UNION ALL
    SELECT id FROM public.driver_profiles WHERE user_id = auth.uid()
  ));

-- ============================================================
-- 9. Orders: add wallet commerce columns
-- ============================================================
ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS order_mode text DEFAULT 'onsite_qr',
  ADD COLUMN IF NOT EXISTS payment_mode text DEFAULT 'offline',
  ADD COLUMN IF NOT EXISTS payment_status text DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS wallet_status text DEFAULT 'not_captured',
  ADD COLUMN IF NOT EXISTS gross_amount numeric(18,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS platform_commission_amount numeric(18,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS merchant_net_amount numeric(18,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS driver_amount numeric(18,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS settlement_status text DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS customer_wallet_id uuid REFERENCES public.wallet_accounts(id),
  ADD COLUMN IF NOT EXISTS merchant_wallet_id uuid REFERENCES public.wallet_accounts(id),
  ADD COLUMN IF NOT EXISTS driver_wallet_id uuid REFERENCES public.wallet_accounts(id);

-- Realtime for kitchen display
ALTER PUBLICATION supabase_realtime ADD TABLE public.pos_orders;
