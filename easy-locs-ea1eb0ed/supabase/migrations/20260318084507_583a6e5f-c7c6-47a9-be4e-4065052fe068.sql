
ALTER TABLE public.customer_relationships
  ADD COLUMN IF NOT EXISTS first_order_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS last_seen_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS orders_count INT NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS bookings_count INT NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS favorite_universe TEXT,
  ADD COLUMN IF NOT EXISTS favorite_store_id UUID REFERENCES public.storefront_pages(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS favorite_provider_id UUID,
  ADD COLUMN IF NOT EXISTS reactivation_score NUMERIC(5,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS is_vip BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS churn_risk NUMERIC(5,2) NOT NULL DEFAULT 0;

CREATE INDEX IF NOT EXISTS idx_customer_relationships_vip ON public.customer_relationships(merchant_id) WHERE is_vip = true;
CREATE INDEX IF NOT EXISTS idx_customer_relationships_churn ON public.customer_relationships(merchant_id, churn_risk DESC);
