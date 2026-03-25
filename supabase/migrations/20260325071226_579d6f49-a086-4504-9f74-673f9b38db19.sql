-- saved_carts
CREATE TABLE IF NOT EXISTS public.saved_carts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  merchant_id UUID,
  merchant_name TEXT,
  label TEXT DEFAULT 'Saved cart',
  items_json JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.saved_carts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own saved carts" ON public.saved_carts FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- merchant_staff
CREATE TABLE IF NOT EXISTS public.merchant_staff (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  merchant_id UUID NOT NULL,
  full_name TEXT NOT NULL,
  email TEXT,
  role TEXT NOT NULL DEFAULT 'cashier',
  status TEXT NOT NULL DEFAULT 'invited',
  user_id UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.merchant_staff ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated can read merchant staff" ON public.merchant_staff FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated can insert merchant staff" ON public.merchant_staff FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated can update merchant staff" ON public.merchant_staff FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

-- auto_repeat_orders
CREATE TABLE IF NOT EXISTS public.auto_repeat_orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  source_order_id UUID NOT NULL,
  frequency TEXT NOT NULL DEFAULT 'weekly',
  enabled BOOLEAN NOT NULL DEFAULT true,
  last_triggered_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.auto_repeat_orders ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own auto repeat orders" ON public.auto_repeat_orders FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);