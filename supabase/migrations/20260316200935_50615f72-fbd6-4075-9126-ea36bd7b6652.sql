
-- ==============================
-- ORBIT V1: Bundles, Loyalty, Inventory Alerts, Delivery Integration
-- ==============================

-- 1. Product Bundles table
CREATE TABLE public.storefront_bundles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id UUID NOT NULL REFERENCES public.storefront_pages(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  bundle_price NUMERIC NOT NULL DEFAULT 0,
  currency TEXT DEFAULT 'EUR',
  photo_url TEXT,
  active BOOLEAN DEFAULT true,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Bundle items (many-to-many)
CREATE TABLE public.storefront_bundle_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  bundle_id UUID NOT NULL REFERENCES public.storefront_bundles(id) ON DELETE CASCADE,
  item_id UUID NOT NULL REFERENCES public.catalog_items(id) ON DELETE CASCADE,
  quantity INTEGER DEFAULT 1,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(bundle_id, item_id)
);

-- 2. Loyalty / Rewards system
CREATE TABLE public.storefront_loyalty_programs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id UUID NOT NULL REFERENCES public.storefront_pages(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  name TEXT NOT NULL DEFAULT 'Loyalty Program',
  points_per_currency NUMERIC DEFAULT 1,
  currency TEXT DEFAULT 'EUR',
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(shop_id)
);

CREATE TABLE public.storefront_loyalty_tiers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  program_id UUID NOT NULL REFERENCES public.storefront_loyalty_programs(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  min_points INTEGER NOT NULL DEFAULT 0,
  discount_percent NUMERIC DEFAULT 0,
  badge_emoji TEXT DEFAULT '⭐',
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE public.storefront_loyalty_points (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  program_id UUID NOT NULL REFERENCES public.storefront_loyalty_programs(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  points INTEGER NOT NULL DEFAULT 0,
  lifetime_points INTEGER NOT NULL DEFAULT 0,
  tier_id UUID REFERENCES public.storefront_loyalty_tiers(id),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(program_id, user_id)
);

CREATE TABLE public.storefront_loyalty_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  program_id UUID NOT NULL REFERENCES public.storefront_loyalty_programs(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  points_change INTEGER NOT NULL,
  reason TEXT NOT NULL,
  order_id UUID,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 3. Inventory alerts table
CREATE TABLE public.storefront_inventory_alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id UUID NOT NULL REFERENCES public.storefront_pages(id) ON DELETE CASCADE,
  item_id UUID NOT NULL REFERENCES public.catalog_items(id) ON DELETE CASCADE,
  alert_type TEXT NOT NULL DEFAULT 'low_stock',
  threshold INTEGER DEFAULT 5,
  current_stock INTEGER DEFAULT 0,
  resolved BOOLEAN DEFAULT false,
  resolved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Stock movement log
CREATE TABLE public.storefront_stock_movements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id UUID NOT NULL REFERENCES public.storefront_pages(id) ON DELETE CASCADE,
  item_id UUID NOT NULL REFERENCES public.catalog_items(id) ON DELETE CASCADE,
  movement_type TEXT NOT NULL, -- 'sale', 'restock', 'adjustment', 'return'
  quantity INTEGER NOT NULL,
  previous_stock INTEGER,
  new_stock INTEGER,
  reference_id TEXT,
  notes TEXT,
  user_id UUID,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 4. Link storefront orders to delivery jobs
ALTER TABLE public.storefront_orders
  ADD COLUMN IF NOT EXISTS delivery_job_id UUID REFERENCES public.delivery_jobs(id),
  ADD COLUMN IF NOT EXISTS delivery_status TEXT,
  ADD COLUMN IF NOT EXISTS delivery_requested BOOLEAN DEFAULT false;

-- RLS for all new tables
ALTER TABLE public.storefront_bundles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.storefront_bundle_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.storefront_loyalty_programs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.storefront_loyalty_tiers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.storefront_loyalty_points ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.storefront_loyalty_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.storefront_inventory_alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.storefront_stock_movements ENABLE ROW LEVEL SECURITY;

-- Bundles: public read, owner write
CREATE POLICY "Anyone can view active bundles" ON public.storefront_bundles FOR SELECT USING (active = true);
CREATE POLICY "Owner manages bundles" ON public.storefront_bundles FOR ALL TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

CREATE POLICY "Anyone can view bundle items" ON public.storefront_bundle_items FOR SELECT USING (true);
CREATE POLICY "Owner manages bundle items" ON public.storefront_bundle_items FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.storefront_bundles b WHERE b.id = bundle_id AND b.user_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.storefront_bundles b WHERE b.id = bundle_id AND b.user_id = auth.uid()));

-- Loyalty: owner manages program, users read their own points
CREATE POLICY "Owner manages loyalty program" ON public.storefront_loyalty_programs FOR ALL TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY "Anyone reads active programs" ON public.storefront_loyalty_programs FOR SELECT USING (active = true);

CREATE POLICY "Anyone reads tiers" ON public.storefront_loyalty_tiers FOR SELECT USING (true);
CREATE POLICY "Owner manages tiers" ON public.storefront_loyalty_tiers FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.storefront_loyalty_programs p WHERE p.id = program_id AND p.user_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.storefront_loyalty_programs p WHERE p.id = program_id AND p.user_id = auth.uid()));

CREATE POLICY "User reads own points" ON public.storefront_loyalty_points FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "System manages points" ON public.storefront_loyalty_points FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "User reads own history" ON public.storefront_loyalty_history FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "System inserts history" ON public.storefront_loyalty_history FOR INSERT TO authenticated WITH CHECK (true);

-- Inventory alerts: owner only
CREATE POLICY "Owner reads alerts" ON public.storefront_inventory_alerts FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.storefront_pages sp WHERE sp.id = shop_id AND sp.user_id = auth.uid()));
CREATE POLICY "System manages alerts" ON public.storefront_inventory_alerts FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Owner reads movements" ON public.storefront_stock_movements FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.storefront_pages sp WHERE sp.id = shop_id AND sp.user_id = auth.uid()));
CREATE POLICY "System manages movements" ON public.storefront_stock_movements FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Trigger: auto-create inventory alert + stock movement on order
CREATE OR REPLACE FUNCTION public.trg_storefront_stock_on_order()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = 'public' AS $$
DECLARE
  _item RECORD;
  _shop_id UUID;
BEGIN
  -- Only on new orders (INSERT)
  IF TG_OP != 'INSERT' THEN RETURN NEW; END IF;

  _shop_id := NEW.shop_id;

  -- Process each order item
  FOR _item IN
    SELECT oi.item_id, oi.quantity, ci.stock_quantity, ci.track_inventory, ci.title
    FROM public.storefront_order_items oi
    JOIN public.catalog_items ci ON ci.id = oi.item_id
    WHERE oi.order_id = NEW.id AND ci.track_inventory = true
  LOOP
    -- Decrement stock
    UPDATE public.catalog_items
    SET stock_quantity = GREATEST(0, COALESCE(stock_quantity, 0) - _item.quantity),
        updated_at = now()
    WHERE id = _item.item_id;

    -- Log stock movement
    INSERT INTO public.storefront_stock_movements (shop_id, item_id, movement_type, quantity, previous_stock, new_stock, reference_id, notes)
    VALUES (_shop_id, _item.item_id, 'sale', -_item.quantity, _item.stock_quantity,
            GREATEST(0, COALESCE(_item.stock_quantity, 0) - _item.quantity), NEW.id::text, 'Order placed');

    -- Create alert if stock is low
    IF COALESCE(_item.stock_quantity, 0) - _item.quantity <= 5 THEN
      INSERT INTO public.storefront_inventory_alerts (shop_id, item_id, alert_type, threshold, current_stock)
      VALUES (_shop_id, _item.item_id, 'low_stock', 5, GREATEST(0, COALESCE(_item.stock_quantity, 0) - _item.quantity))
      ON CONFLICT DO NOTHING;
    END IF;
  END LOOP;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_storefront_stock_on_order ON public.storefront_orders;
CREATE TRIGGER trg_storefront_stock_on_order
  AFTER INSERT ON public.storefront_orders
  FOR EACH ROW EXECUTE FUNCTION trg_storefront_stock_on_order();

-- Trigger: award loyalty points on completed order
CREATE OR REPLACE FUNCTION public.trg_storefront_loyalty_on_complete()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = 'public' AS $$
DECLARE
  _program RECORD;
  _points INTEGER;
BEGIN
  IF TG_OP != 'UPDATE' THEN RETURN NEW; END IF;
  IF NEW.status != 'completed' OR OLD.status = 'completed' THEN RETURN NEW; END IF;
  IF NEW.buyer_id IS NULL THEN RETURN NEW; END IF;

  -- Find loyalty program for this shop
  SELECT * INTO _program FROM public.storefront_loyalty_programs
  WHERE shop_id = NEW.shop_id AND active = true LIMIT 1;

  IF NOT FOUND THEN RETURN NEW; END IF;

  _points := GREATEST(1, FLOOR(COALESCE(NEW.total, 0) * COALESCE(_program.points_per_currency, 1)));

  -- Upsert points
  INSERT INTO public.storefront_loyalty_points (program_id, user_id, points, lifetime_points)
  VALUES (_program.id, NEW.buyer_id, _points, _points)
  ON CONFLICT (program_id, user_id)
  DO UPDATE SET
    points = storefront_loyalty_points.points + _points,
    lifetime_points = storefront_loyalty_points.lifetime_points + _points,
    updated_at = now();

  -- Log history
  INSERT INTO public.storefront_loyalty_history (program_id, user_id, points_change, reason, order_id)
  VALUES (_program.id, NEW.buyer_id, _points, 'Order completed', NEW.id);

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_storefront_loyalty_on_complete ON public.storefront_orders;
CREATE TRIGGER trg_storefront_loyalty_on_complete
  AFTER UPDATE ON public.storefront_orders
  FOR EACH ROW EXECUTE FUNCTION trg_storefront_loyalty_on_complete();
