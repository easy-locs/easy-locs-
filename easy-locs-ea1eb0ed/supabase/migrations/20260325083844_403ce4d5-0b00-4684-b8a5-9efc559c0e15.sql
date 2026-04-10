
-- Engine support columns
ALTER TABLE public.seed_merchants ADD COLUMN IF NOT EXISTS seo_status text;
ALTER TABLE public.seed_merchants ADD COLUMN IF NOT EXISTS seo_issues text[];
ALTER TABLE public.seed_merchants ADD COLUMN IF NOT EXISTS dedup_status text;

-- Loyalty transactions table
CREATE TABLE IF NOT EXISTS public.loyalty_transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  points integer NOT NULL DEFAULT 0,
  transaction_type text NOT NULL DEFAULT 'earn',
  reference_id text,
  reference_type text,
  description text,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.loyalty_transactions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users see own loyalty" ON public.loyalty_transactions FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "System insert loyalty" ON public.loyalty_transactions FOR INSERT WITH CHECK (true);

-- Coupons table
CREATE TABLE IF NOT EXISTS public.coupons (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL,
  shop_id text,
  discount_type text NOT NULL DEFAULT 'percentage',
  discount_value numeric NOT NULL DEFAULT 0,
  min_order_amount numeric DEFAULT 0,
  max_uses integer,
  used_count integer DEFAULT 0,
  status text NOT NULL DEFAULT 'active',
  expires_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.coupons ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read coupons" ON public.coupons FOR SELECT USING (true);

-- Catalog items table (if not exists)
CREATE TABLE IF NOT EXISTS public.catalog_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id text,
  title text NOT NULL,
  description text,
  price numeric DEFAULT 0,
  photo_url text,
  stock_quantity integer,
  is_active boolean DEFAULT true,
  category text,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.catalog_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read catalog" ON public.catalog_items FOR SELECT USING (true);
CREATE POLICY "System manage catalog" ON public.catalog_items FOR ALL USING (true);
