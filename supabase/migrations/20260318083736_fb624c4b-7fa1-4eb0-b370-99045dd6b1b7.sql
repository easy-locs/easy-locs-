
-- Customer Ownership: tracks merchant-customer relationships
CREATE TABLE IF NOT EXISTS public.customer_relationships (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  merchant_id UUID NOT NULL,
  customer_id UUID NOT NULL,
  shop_id UUID REFERENCES public.storefront_pages(id) ON DELETE SET NULL,
  total_orders INT NOT NULL DEFAULT 0,
  total_bookings INT NOT NULL DEFAULT 0,
  lifetime_value NUMERIC(12,2) NOT NULL DEFAULT 0,
  currency TEXT NOT NULL DEFAULT 'EUR',
  last_order_at TIMESTAMPTZ,
  last_booking_at TIMESTAMPTZ,
  preferred_categories TEXT[] DEFAULT '{}',
  preferred_payment_method TEXT,
  is_favorite BOOLEAN NOT NULL DEFAULT false,
  loyalty_points INT NOT NULL DEFAULT 0,
  loyalty_tier TEXT DEFAULT 'none',
  reactivation_eligible BOOLEAN NOT NULL DEFAULT false,
  first_interaction_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(merchant_id, customer_id)
);

-- RLS
ALTER TABLE public.customer_relationships ENABLE ROW LEVEL SECURITY;

-- Merchants can read their own customer relationships
CREATE POLICY "Merchants read own customers"
  ON public.customer_relationships
  FOR SELECT
  TO authenticated
  USING (merchant_id = auth.uid());

-- Merchants can insert/update their own customer relationships
CREATE POLICY "Merchants manage own customers"
  ON public.customer_relationships
  FOR ALL
  TO authenticated
  USING (merchant_id = auth.uid())
  WITH CHECK (merchant_id = auth.uid());

-- Customers can see their own relationship entries
CREATE POLICY "Customers read own relationships"
  ON public.customer_relationships
  FOR SELECT
  TO authenticated
  USING (customer_id = auth.uid());

-- Index for fast lookups
CREATE INDEX IF NOT EXISTS idx_customer_relationships_merchant ON public.customer_relationships(merchant_id);
CREATE INDEX IF NOT EXISTS idx_customer_relationships_customer ON public.customer_relationships(customer_id);
CREATE INDEX IF NOT EXISTS idx_customer_relationships_reactivation ON public.customer_relationships(merchant_id) WHERE reactivation_eligible = true;
