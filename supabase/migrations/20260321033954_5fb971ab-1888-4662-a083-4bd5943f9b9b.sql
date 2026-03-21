
-- Delivery missions table for radar system
CREATE TABLE IF NOT EXISTS public.delivery_missions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id text NOT NULL,
  seller_id uuid NOT NULL,
  seller_shop_id text,
  pickup_lat double precision NOT NULL,
  pickup_lng double precision NOT NULL,
  pickup_address text,
  drop_lat double precision NOT NULL,
  drop_lng double precision NOT NULL,
  drop_address text,
  price numeric(12,2) NOT NULL DEFAULT 0,
  currency text NOT NULL DEFAULT 'AED',
  status text NOT NULL DEFAULT 'open',
  assigned_driver_id uuid,
  accepted_at timestamptz,
  picked_up_at timestamptz,
  delivered_at timestamptz,
  cancelled_at timestamptz,
  cancel_reason text,
  broadcast_radius_km numeric(5,1) DEFAULT 5.0,
  retry_count int DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Wallet transaction challenges
CREATE TABLE IF NOT EXISTS public.wallet_transaction_challenges (
  id text PRIMARY KEY,
  owner_user_id uuid NOT NULL,
  nonce text NOT NULL,
  amount numeric(12,2) NOT NULL,
  currency text NOT NULL DEFAULT 'AED',
  receiver_user_id uuid NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  verified_at timestamptz,
  expires_at timestamptz NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Wallet trusted devices
CREATE TABLE IF NOT EXISTS public.wallet_trusted_devices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_user_id uuid NOT NULL,
  device_id text NOT NULL,
  device_name text,
  trusted_at timestamptz NOT NULL DEFAULT now(),
  last_seen_at timestamptz,
  revoked_at timestamptz,
  UNIQUE(owner_user_id, device_id)
);

-- Wallet security events
CREATE TABLE IF NOT EXISTS public.wallet_security_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_user_id uuid NOT NULL,
  event_type text NOT NULL,
  device_id text,
  metadata_json jsonb DEFAULT '{}',
  ip_hint text,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- RLS
ALTER TABLE public.delivery_missions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.wallet_transaction_challenges ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.wallet_trusted_devices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.wallet_security_events ENABLE ROW LEVEL SECURITY;

-- delivery_missions policies
CREATE POLICY "dm_select_v1" ON public.delivery_missions
  FOR SELECT TO authenticated
  USING (seller_id = auth.uid() OR assigned_driver_id = auth.uid() OR status = 'open');

CREATE POLICY "dm_insert_v1" ON public.delivery_missions
  FOR INSERT TO authenticated
  WITH CHECK (seller_id = auth.uid());

CREATE POLICY "dm_update_v1" ON public.delivery_missions
  FOR UPDATE TO authenticated
  USING (status = 'open' OR assigned_driver_id = auth.uid() OR seller_id = auth.uid());

-- wallet tables policies
CREATE POLICY "wtc_owner_v1" ON public.wallet_transaction_challenges
  FOR ALL TO authenticated
  USING (owner_user_id = auth.uid());

CREATE POLICY "wtd_owner_v1" ON public.wallet_trusted_devices
  FOR ALL TO authenticated
  USING (owner_user_id = auth.uid());

CREATE POLICY "wse_read_v1" ON public.wallet_security_events
  FOR SELECT TO authenticated
  USING (owner_user_id = auth.uid());

CREATE POLICY "wse_insert_v1" ON public.wallet_security_events
  FOR INSERT TO authenticated
  WITH CHECK (owner_user_id = auth.uid());

-- Enable realtime for delivery
ALTER PUBLICATION supabase_realtime ADD TABLE public.delivery_missions;

-- Indexes
CREATE INDEX IF NOT EXISTS idx_dm_status ON public.delivery_missions (status);
CREATE INDEX IF NOT EXISTS idx_dm_seller ON public.delivery_missions (seller_id);
