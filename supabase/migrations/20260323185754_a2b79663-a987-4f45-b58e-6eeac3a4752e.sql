-- 1. Add missing governance + dedup columns to seed_merchants
ALTER TABLE public.seed_merchants 
  ADD COLUMN IF NOT EXISTS is_flagged boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS brand_name text,
  ADD COLUMN IF NOT EXISTS branch_label text,
  ADD COLUMN IF NOT EXISTS duplicate_of uuid,
  ADD COLUMN IF NOT EXISTS duplicate_confidence integer,
  ADD COLUMN IF NOT EXISTS review_required boolean DEFAULT false;

-- 2. Create shop_tables for table management per shop
CREATE TABLE IF NOT EXISTS public.shop_tables (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id uuid NOT NULL REFERENCES public.storefront_pages(id) ON DELETE CASCADE,
  label text NOT NULL,
  table_number integer,
  zone text DEFAULT 'main',
  seats integer DEFAULT 4,
  status text DEFAULT 'available',
  qr_target_id uuid REFERENCES public.qr_order_targets(id),
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(shop_id, label)
);

ALTER TABLE public.shop_tables ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Shop owners manage tables" ON public.shop_tables
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.storefront_pages sp 
      WHERE sp.id = shop_tables.shop_id AND sp.user_id = auth.uid()
    )
  );

CREATE POLICY "Public can view active tables" ON public.shop_tables
  FOR SELECT TO anon
  USING (is_active = true);

-- 3. Create shop_terminals for POS/device management
CREATE TABLE IF NOT EXISTS public.shop_terminals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id uuid NOT NULL REFERENCES public.storefront_pages(id) ON DELETE CASCADE,
  terminal_code text NOT NULL,
  terminal_type text DEFAULT 'counter',
  label text,
  is_active boolean DEFAULT true,
  last_seen_at timestamptz,
  device_info jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(shop_id, terminal_code)
);

ALTER TABLE public.shop_terminals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Shop owners manage terminals" ON public.shop_terminals
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.storefront_pages sp 
      WHERE sp.id = shop_terminals.shop_id AND sp.user_id = auth.uid()
    )
  );

-- 4. Extend qr_order_targets with more QR types
ALTER TABLE public.qr_order_targets
  ADD COLUMN IF NOT EXISTS qr_purpose text DEFAULT 'order',
  ADD COLUMN IF NOT EXISTS shop_table_id uuid REFERENCES public.shop_tables(id),
  ADD COLUMN IF NOT EXISTS terminal_id uuid REFERENCES public.shop_terminals(id),
  ADD COLUMN IF NOT EXISTS payload_json jsonb,
  ADD COLUMN IF NOT EXISTS scan_count integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS last_scanned_at timestamptz,
  ADD COLUMN IF NOT EXISTS expires_at timestamptz;

-- 5. Add fulfillment_type to storefront_orders if missing
ALTER TABLE public.storefront_orders
  ADD COLUMN IF NOT EXISTS fulfillment_type text DEFAULT 'pickup',
  ADD COLUMN IF NOT EXISTS estimated_ready_at timestamptz,
  ADD COLUMN IF NOT EXISTS accepted_at timestamptz,
  ADD COLUMN IF NOT EXISTS preparing_at timestamptz,
  ADD COLUMN IF NOT EXISTS ready_at timestamptz,
  ADD COLUMN IF NOT EXISTS completed_at timestamptz;

-- 6. Create payment_sessions for payment tracking
CREATE TABLE IF NOT EXISTS public.payment_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id uuid NOT NULL REFERENCES public.storefront_pages(id),
  order_id uuid REFERENCES public.storefront_orders(id),
  amount numeric NOT NULL,
  currency text DEFAULT 'AED',
  status text DEFAULT 'pending',
  payment_method text,
  qr_target_id uuid REFERENCES public.qr_order_targets(id),
  payer_id uuid,
  terminal_id uuid REFERENCES public.shop_terminals(id),
  metadata_json jsonb,
  expires_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE public.payment_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Shop owners manage payment sessions" ON public.payment_sessions
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.storefront_pages sp 
      WHERE sp.id = payment_sessions.shop_id AND sp.user_id = auth.uid()
    )
  );

CREATE POLICY "Payers can view own sessions" ON public.payment_sessions
  FOR SELECT TO authenticated
  USING (payer_id = auth.uid());