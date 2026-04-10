
-- Ride earnings/cancellation/dispute columns
ALTER TABLE public.ride_requests
  ADD COLUMN IF NOT EXISTS gross_amount numeric DEFAULT 0,
  ADD COLUMN IF NOT EXISTS platform_fee numeric DEFAULT 0,
  ADD COLUMN IF NOT EXISTS driver_net_amount numeric DEFAULT 0,
  ADD COLUMN IF NOT EXISTS cancellation_fee numeric DEFAULT 0,
  ADD COLUMN IF NOT EXISTS cancellation_reason text,
  ADD COLUMN IF NOT EXISTS cancelled_by uuid,
  ADD COLUMN IF NOT EXISTS cancelled_at timestamptz,
  ADD COLUMN IF NOT EXISTS dispute_status text DEFAULT 'none';

-- Driver earnings ledger
CREATE TABLE IF NOT EXISTS public.driver_earnings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  driver_id uuid NOT NULL,
  ride_request_id uuid NOT NULL,
  gross_amount numeric NOT NULL DEFAULT 0,
  platform_fee numeric NOT NULL DEFAULT 0,
  tip_amount numeric NOT NULL DEFAULT 0,
  net_amount numeric NOT NULL DEFAULT 0,
  currency text NOT NULL DEFAULT 'AED',
  earning_status text NOT NULL DEFAULT 'pending',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_driver_earnings_driver_id ON public.driver_earnings(driver_id);
CREATE INDEX IF NOT EXISTS idx_driver_earnings_ride_request_id ON public.driver_earnings(ride_request_id);

-- Disputes
CREATE TABLE IF NOT EXISTS public.ride_disputes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ride_request_id uuid NOT NULL,
  opened_by uuid NOT NULL,
  against_user_id uuid,
  dispute_type text NOT NULL,
  status text NOT NULL DEFAULT 'open',
  reason text,
  resolution text,
  refund_amount numeric DEFAULT 0,
  admin_note text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_ride_disputes_ride_request_id ON public.ride_disputes(ride_request_id);

-- Driver payouts
CREATE TABLE IF NOT EXISTS public.driver_payouts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  driver_id uuid NOT NULL,
  amount numeric NOT NULL,
  currency text DEFAULT 'AED',
  payout_status text DEFAULT 'pending',
  method text,
  reference text,
  created_at timestamptz DEFAULT now(),
  processed_at timestamptz
);

CREATE INDEX IF NOT EXISTS idx_driver_payouts_driver ON public.driver_payouts(driver_id);

-- Loyalty
CREATE TABLE IF NOT EXISTS public.user_loyalty (
  user_id uuid PRIMARY KEY,
  points numeric DEFAULT 0,
  tier text DEFAULT 'bronze',
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.loyalty_transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid,
  points numeric,
  type text,
  reference_id uuid,
  created_at timestamptz DEFAULT now()
);

-- RLS
ALTER TABLE public.driver_earnings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ride_disputes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.driver_payouts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_loyalty ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.loyalty_transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "driver_earnings_select_own" ON public.driver_earnings
  FOR SELECT USING (auth.uid() = driver_id);

CREATE POLICY "driver_earnings_insert_own" ON public.driver_earnings
  FOR INSERT WITH CHECK (auth.uid() = driver_id);

CREATE POLICY "ride_disputes_select_own" ON public.ride_disputes
  FOR SELECT USING (auth.uid() = opened_by OR auth.uid() = against_user_id);

CREATE POLICY "ride_disputes_insert_own" ON public.ride_disputes
  FOR INSERT WITH CHECK (auth.uid() = opened_by);

CREATE POLICY "ride_disputes_update_own" ON public.ride_disputes
  FOR UPDATE USING (auth.uid() = opened_by);

CREATE POLICY "driver_payouts_select_own" ON public.driver_payouts
  FOR SELECT USING (auth.uid() = driver_id);

CREATE POLICY "driver_payouts_insert_own" ON public.driver_payouts
  FOR INSERT WITH CHECK (auth.uid() = driver_id);

CREATE POLICY "user_loyalty_select_own" ON public.user_loyalty
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "user_loyalty_upsert_own" ON public.user_loyalty
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "user_loyalty_update_own" ON public.user_loyalty
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "loyalty_tx_select_own" ON public.loyalty_transactions
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "loyalty_tx_insert_own" ON public.loyalty_transactions
  FOR INSERT WITH CHECK (auth.uid() = user_id);
