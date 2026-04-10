
-- Shipping zones for storefronts
CREATE TABLE public.storefront_shipping_zones (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id uuid NOT NULL REFERENCES public.storefront_pages(id) ON DELETE CASCADE,
  name text NOT NULL DEFAULT 'Default',
  countries text[] DEFAULT '{}',
  fee numeric NOT NULL DEFAULT 0,
  free_above numeric DEFAULT NULL,
  currency text NOT NULL DEFAULT 'EUR',
  delivery_days_min int DEFAULT 1,
  delivery_days_max int DEFAULT 5,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.storefront_shipping_zones ENABLE ROW LEVEL SECURITY;

-- Shop owner can CRUD
CREATE POLICY "Owner manages shipping zones"
  ON public.storefront_shipping_zones FOR ALL TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.storefront_pages sp WHERE sp.id = shop_id AND sp.user_id = auth.uid())
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.storefront_pages sp WHERE sp.id = shop_id AND sp.user_id = auth.uid())
  );

-- Buyers can read active zones
CREATE POLICY "Public read active zones"
  ON public.storefront_shipping_zones FOR SELECT TO authenticated
  USING (active = true);

-- Add shipping fields to orders
ALTER TABLE public.storefront_orders 
  ADD COLUMN IF NOT EXISTS shipping_fee numeric DEFAULT 0,
  ADD COLUMN IF NOT EXISTS shipping_zone_id uuid REFERENCES public.storefront_shipping_zones(id),
  ADD COLUMN IF NOT EXISTS shipping_address text,
  ADD COLUMN IF NOT EXISTS tracking_number text,
  ADD COLUMN IF NOT EXISTS shipped_at timestamptz;

-- Add default_currency to storefront_pages if not exists
ALTER TABLE public.storefront_pages
  ADD COLUMN IF NOT EXISTS default_currency text DEFAULT 'EUR';
