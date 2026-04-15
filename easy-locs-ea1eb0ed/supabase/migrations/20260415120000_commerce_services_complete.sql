-- Commerce + Services + Admin End-to-End Migration
-- Tables: product_returns, user_wishlist_items, service_catalog, service_availability, service_bookings_v2, platform_config
-- Triggers: variant stock decrement + alerts

-- ══════════════════════════════════════════════════════════════════
--  1. product_returns
-- ══════════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS public.product_returns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID REFERENCES public.storefront_orders(id) ON DELETE CASCADE,
  order_item_id UUID,
  buyer_id UUID,
  seller_id UUID,
  reason TEXT CHECK (reason IN ('defective','wrong_size','not_as_described','changed_mind','damaged_in_transit','other')),
  reason_details TEXT,
  photos TEXT[] DEFAULT '{}',
  status TEXT DEFAULT 'requested' CHECK (status IN ('requested','approved','rejected','returned','refunded','closed')),
  refund_amount NUMERIC,
  refund_method TEXT DEFAULT 'wallet',
  admin_notes TEXT,
  requested_at TIMESTAMPTZ DEFAULT now(),
  resolved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.product_returns ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'product_returns' AND policyname = 'product_returns_buyer_select') THEN
    CREATE POLICY product_returns_buyer_select ON public.product_returns FOR SELECT USING (buyer_id = auth.uid());
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'product_returns' AND policyname = 'product_returns_buyer_insert') THEN
    CREATE POLICY product_returns_buyer_insert ON public.product_returns FOR INSERT WITH CHECK (buyer_id = auth.uid());
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'product_returns' AND policyname = 'product_returns_seller_select') THEN
    CREATE POLICY product_returns_seller_select ON public.product_returns FOR SELECT USING (seller_id = auth.uid());
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'product_returns' AND policyname = 'product_returns_seller_update') THEN
    CREATE POLICY product_returns_seller_update ON public.product_returns FOR UPDATE USING (seller_id = auth.uid());
  END IF;
END $$;

-- ══════════════════════════════════════════════════════════════════
--  2. user_wishlist_items
-- ══════════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS public.user_wishlist_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  item_id UUID REFERENCES public.catalog_items(id) ON DELETE CASCADE,
  variant_id UUID,
  shop_id UUID,
  added_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, item_id, COALESCE(variant_id, '00000000-0000-0000-0000-000000000000'))
);

ALTER TABLE public.user_wishlist_items ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'user_wishlist_items' AND policyname = 'wishlist_user_all') THEN
    CREATE POLICY wishlist_user_all ON public.user_wishlist_items FOR ALL USING (user_id = auth.uid());
  END IF;
END $$;

-- ══════════════════════════════════════════════════════════════════
--  3. service_catalog
-- ══════════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS public.service_catalog (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_id UUID NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  category TEXT,
  subcategory TEXT,
  duration_minutes INTEGER DEFAULT 60,
  price NUMERIC DEFAULT 0,
  price_type TEXT DEFAULT 'fixed' CHECK (price_type IN ('fixed', 'hourly')),
  at_home BOOLEAN DEFAULT false,
  in_office BOOLEAN DEFAULT true,
  remote BOOLEAN DEFAULT false,
  photos TEXT[] DEFAULT '{}',
  requirements TEXT[] DEFAULT '{}',
  is_active BOOLEAN DEFAULT true,
  sort_order INTEGER DEFAULT 0,
  rating_avg NUMERIC DEFAULT 5.0,
  booking_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.service_catalog ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'service_catalog' AND policyname = 'service_catalog_public_read') THEN
    CREATE POLICY service_catalog_public_read ON public.service_catalog FOR SELECT USING (is_active = true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'service_catalog' AND policyname = 'service_catalog_provider_all') THEN
    CREATE POLICY service_catalog_provider_all ON public.service_catalog FOR ALL USING (provider_id = auth.uid());
  END IF;
END $$;

-- ══════════════════════════════════════════════════════════════════
--  4. service_availability
-- ══════════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS public.service_availability (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_id UUID NOT NULL,
  day_of_week INTEGER CHECK (day_of_week BETWEEN 0 AND 6),
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  max_concurrent INTEGER DEFAULT 1,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.service_availability ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'service_availability' AND policyname = 'service_availability_public_read') THEN
    CREATE POLICY service_availability_public_read ON public.service_availability FOR SELECT USING (is_active = true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'service_availability' AND policyname = 'service_availability_provider_all') THEN
    CREATE POLICY service_availability_provider_all ON public.service_availability FOR ALL USING (provider_id = auth.uid());
  END IF;
END $$;

-- ══════════════════════════════════════════════════════════════════
--  5. service_bookings_v2
-- ══════════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS public.service_bookings_v2 (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  service_id UUID REFERENCES public.service_catalog(id) ON DELETE SET NULL,
  provider_id UUID NOT NULL,
  client_id UUID NOT NULL,
  booked_date DATE NOT NULL,
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  status TEXT DEFAULT 'requested' CHECK (status IN ('requested','confirmed','rejected','in_progress','completed','cancelled_by_client','cancelled_by_provider')),
  client_notes TEXT,
  provider_notes TEXT,
  address TEXT,
  lat NUMERIC,
  lng NUMERIC,
  total_price NUMERIC DEFAULT 0,
  currency TEXT DEFAULT 'AED',
  cancel_reason TEXT,
  cancelled_by TEXT CHECK (cancelled_by IN ('client', 'provider', NULL)),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.service_bookings_v2 ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'service_bookings_v2' AND policyname = 'bookings_client_select') THEN
    CREATE POLICY bookings_client_select ON public.service_bookings_v2 FOR SELECT USING (client_id = auth.uid());
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'service_bookings_v2' AND policyname = 'bookings_client_insert') THEN
    CREATE POLICY bookings_client_insert ON public.service_bookings_v2 FOR INSERT WITH CHECK (client_id = auth.uid());
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'service_bookings_v2' AND policyname = 'bookings_provider_select') THEN
    CREATE POLICY bookings_provider_select ON public.service_bookings_v2 FOR SELECT USING (provider_id = auth.uid());
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'service_bookings_v2' AND policyname = 'bookings_provider_update') THEN
    CREATE POLICY bookings_provider_update ON public.service_bookings_v2 FOR UPDATE USING (provider_id = auth.uid());
  END IF;
END $$;

-- ══════════════════════════════════════════════════════════════════
--  6. platform_config
-- ══════════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS public.platform_config (
  key TEXT PRIMARY KEY,
  value JSONB NOT NULL DEFAULT '{}',
  updated_at TIMESTAMPTZ DEFAULT now(),
  updated_by UUID
);

ALTER TABLE public.platform_config ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'platform_config' AND policyname = 'platform_config_public_read') THEN
    CREATE POLICY platform_config_public_read ON public.platform_config FOR SELECT USING (true);
  END IF;
END $$;

INSERT INTO public.platform_config (key, value) VALUES
  ('commissions', '{"food": 15, "hotel": 12, "taxi": 20, "commerce": 10, "services": 18}'::jsonb)
ON CONFLICT (key) DO NOTHING;

-- ══════════════════════════════════════════════════════════════════
--  7. Variant stock decrement trigger
-- ══════════════════════════════════════════════════════════════════
CREATE OR REPLACE FUNCTION public.decrement_variant_stock()
RETURNS TRIGGER AS $$
DECLARE
  v_stock INTEGER;
BEGIN
  IF NEW.variant_id IS NOT NULL THEN
    UPDATE public.catalog_variants
    SET stock_quantity = GREATEST(0, stock_quantity - NEW.quantity)
    WHERE id = NEW.variant_id
    RETURNING stock_quantity INTO v_stock;

    IF v_stock IS NOT NULL AND v_stock <= 5 THEN
      INSERT INTO public.storefront_inventory_alerts (item_id, variant_id, alert_type, current_stock)
      VALUES (NEW.item_id, NEW.variant_id, CASE WHEN v_stock = 0 THEN 'out_of_stock' ELSE 'low_stock' END, v_stock)
      ON CONFLICT DO NOTHING;
    END IF;

    IF v_stock IS NOT NULL AND v_stock = 0 THEN
      UPDATE public.catalog_variants SET available = false WHERE id = NEW.variant_id;
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_variant_stock_on_order_item') THEN
    CREATE TRIGGER trg_variant_stock_on_order_item
      AFTER INSERT ON public.storefront_order_items
      FOR EACH ROW
      WHEN (NEW.variant_id IS NOT NULL)
      EXECUTE FUNCTION public.decrement_variant_stock();
  END IF;
END $$;

-- Add variant_id column to storefront_order_items if not exists
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'storefront_order_items' AND column_name = 'variant_id') THEN
    ALTER TABLE public.storefront_order_items ADD COLUMN variant_id UUID;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'storefront_order_items' AND column_name = 'variant_name') THEN
    ALTER TABLE public.storefront_order_items ADD COLUMN variant_name TEXT;
  END IF;
END $$;

-- Add variant_id to storefront_inventory_alerts if not exists
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'storefront_inventory_alerts' AND column_name = 'variant_id') THEN
    ALTER TABLE public.storefront_inventory_alerts ADD COLUMN variant_id UUID;
  END IF;
END $$;

-- Add missing extended fields to catalog_items if not present
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'catalog_items' AND column_name = 'weight_grams') THEN
    ALTER TABLE public.catalog_items ADD COLUMN weight_grams NUMERIC;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'catalog_items' AND column_name = 'dimensions_json') THEN
    ALTER TABLE public.catalog_items ADD COLUMN dimensions_json JSONB;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'catalog_items' AND column_name = 'brand_name') THEN
    ALTER TABLE public.catalog_items ADD COLUMN brand_name TEXT;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'catalog_items' AND column_name = 'specifications') THEN
    ALTER TABLE public.catalog_items ADD COLUMN specifications JSONB DEFAULT '{}';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'catalog_items' AND column_name = 'warranty_info') THEN
    ALTER TABLE public.catalog_items ADD COLUMN warranty_info JSONB;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'catalog_items' AND column_name = 'compare_at_price') THEN
    ALTER TABLE public.catalog_items ADD COLUMN compare_at_price NUMERIC;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'catalog_items' AND column_name = 'track_inventory') THEN
    ALTER TABLE public.catalog_items ADD COLUMN track_inventory BOOLEAN DEFAULT false;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'catalog_items' AND column_name = 'stock_quantity') THEN
    ALTER TABLE public.catalog_items ADD COLUMN stock_quantity INTEGER DEFAULT 0;
  END IF;
END $$;

-- Add color column to catalog_variants for visual display
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'catalog_variants' AND column_name = 'color_hex') THEN
    ALTER TABLE public.catalog_variants ADD COLUMN color_hex TEXT;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'catalog_variants' AND column_name = 'photo_url') THEN
    ALTER TABLE public.catalog_variants ADD COLUMN photo_url TEXT;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'catalog_variants' AND column_name = 'option_values') THEN
    ALTER TABLE public.catalog_variants ADD COLUMN option_values JSONB DEFAULT '{}';
  END IF;
END $$;
