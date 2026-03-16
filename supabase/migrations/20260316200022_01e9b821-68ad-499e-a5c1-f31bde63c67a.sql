
-- Storefront product subscriptions (recurring orders)
CREATE TABLE public.storefront_subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id uuid NOT NULL REFERENCES public.storefront_pages(id) ON DELETE CASCADE,
  buyer_id uuid NOT NULL,
  buyer_email text NOT NULL DEFAULT '',
  item_id uuid REFERENCES public.catalog_items(id) ON DELETE SET NULL,
  variant_id uuid REFERENCES public.catalog_variants(id) ON DELETE SET NULL,
  quantity int NOT NULL DEFAULT 1,
  unit_price numeric NOT NULL DEFAULT 0,
  currency text NOT NULL DEFAULT 'EUR',
  frequency text NOT NULL DEFAULT 'monthly',
  status text NOT NULL DEFAULT 'active',
  next_order_at timestamptz NOT NULL DEFAULT (now() + interval '30 days'),
  last_order_at timestamptz,
  total_orders int NOT NULL DEFAULT 0,
  cancelled_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.storefront_subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Buyer manages own subscriptions"
  ON public.storefront_subscriptions FOR ALL TO authenticated
  USING (buyer_id = auth.uid())
  WITH CHECK (buyer_id = auth.uid());

CREATE POLICY "Seller views shop subscriptions"
  ON public.storefront_subscriptions FOR SELECT TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.storefront_pages sp WHERE sp.id = shop_id AND sp.user_id = auth.uid())
  );
