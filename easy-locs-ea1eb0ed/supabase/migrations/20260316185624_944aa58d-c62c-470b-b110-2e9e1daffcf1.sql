
-- ═══════════════════════════════════════════════════
-- ORBIT V1 COMMERCE FOUNDATION — Phase 1 Migration
-- ═══════════════════════════════════════════════════

-- 1. STOREFRONT PAGES (mini shops)
CREATE TABLE public.storefront_pages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES public.orgs(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  tagline TEXT,
  description TEXT,
  logo_url TEXT,
  banner_url TEXT,
  theme_color TEXT DEFAULT '#d4a853',
  contact_email TEXT,
  contact_phone TEXT,
  contact_whatsapp TEXT,
  contact_telegram TEXT,
  country TEXT DEFAULT '',
  city TEXT DEFAULT '',
  address TEXT,
  latitude NUMERIC,
  longitude NUMERIC,
  radius_km NUMERIC DEFAULT 50,
  geo_scope TEXT DEFAULT 'city',
  shop_visibility TEXT DEFAULT 'draft',
  scheduled_publish_at TIMESTAMPTZ,
  currency TEXT DEFAULT 'EUR',
  is_verified BOOLEAN DEFAULT false,
  views_count INTEGER DEFAULT 0,
  rating NUMERIC DEFAULT 0,
  reviews_count INTEGER DEFAULT 0,
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.storefront_pages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owners manage their storefronts" ON public.storefront_pages
  FOR ALL TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

CREATE POLICY "Public can view published storefronts" ON public.storefront_pages
  FOR SELECT TO anon USING (shop_visibility = 'public' AND active = true);

CREATE POLICY "Authenticated can view published storefronts" ON public.storefront_pages
  FOR SELECT TO authenticated USING (shop_visibility IN ('public', 'unlisted') AND active = true);

-- 2. STOREFRONT CATALOG CATEGORIES
CREATE TABLE public.storefront_catalog_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id UUID NOT NULL REFERENCES public.storefront_pages(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  sort_order INTEGER DEFAULT 0,
  icon TEXT,
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.storefront_catalog_categories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Shop owners manage categories" ON public.storefront_catalog_categories
  FOR ALL TO authenticated USING (
    EXISTS (SELECT 1 FROM public.storefront_pages sp WHERE sp.id = shop_id AND sp.user_id = auth.uid())
  ) WITH CHECK (
    EXISTS (SELECT 1 FROM public.storefront_pages sp WHERE sp.id = shop_id AND sp.user_id = auth.uid())
  );

CREATE POLICY "Public view categories" ON public.storefront_catalog_categories
  FOR SELECT TO anon USING (active = true);

CREATE POLICY "Auth view categories" ON public.storefront_catalog_categories
  FOR SELECT TO authenticated USING (active = true);

-- 3. CATALOG ITEMS (products + services)
CREATE TABLE public.catalog_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id UUID NOT NULL REFERENCES public.storefront_pages(id) ON DELETE CASCADE,
  category_id UUID REFERENCES public.storefront_catalog_categories(id) ON DELETE SET NULL,
  user_id UUID NOT NULL,
  item_type TEXT DEFAULT 'product',
  title TEXT NOT NULL,
  description TEXT,
  price NUMERIC DEFAULT 0,
  compare_at_price NUMERIC,
  currency TEXT DEFAULT 'EUR',
  photo_url TEXT,
  photo_urls JSONB DEFAULT '[]',
  sku TEXT,
  stock_quantity INTEGER,
  track_inventory BOOLEAN DEFAULT false,
  available BOOLEAN DEFAULT true,
  sort_order INTEGER DEFAULT 0,
  tags TEXT[] DEFAULT '{}',
  metadata_json JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.catalog_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Shop owners manage items" ON public.catalog_items
  FOR ALL TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

CREATE POLICY "Public view available items" ON public.catalog_items
  FOR SELECT TO anon USING (available = true);

CREATE POLICY "Auth view available items" ON public.catalog_items
  FOR SELECT TO authenticated USING (available = true);

-- 4. CATALOG VARIANTS
CREATE TABLE public.catalog_variants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  item_id UUID NOT NULL REFERENCES public.catalog_items(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  price_adjustment NUMERIC DEFAULT 0,
  sku TEXT,
  stock_quantity INTEGER,
  available BOOLEAN DEFAULT true,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.catalog_variants ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owners manage variants" ON public.catalog_variants
  FOR ALL TO authenticated USING (
    EXISTS (SELECT 1 FROM public.catalog_items ci WHERE ci.id = item_id AND ci.user_id = auth.uid())
  ) WITH CHECK (
    EXISTS (SELECT 1 FROM public.catalog_items ci WHERE ci.id = item_id AND ci.user_id = auth.uid())
  );

CREATE POLICY "Public view variants" ON public.catalog_variants
  FOR SELECT TO anon USING (available = true);

CREATE POLICY "Auth view variants" ON public.catalog_variants
  FOR SELECT TO authenticated USING (available = true);

-- 5. CART SYSTEM
CREATE TABLE public.storefront_carts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id UUID NOT NULL REFERENCES public.storefront_pages(id) ON DELETE CASCADE,
  user_id UUID,
  session_id TEXT,
  status TEXT DEFAULT 'active',
  currency TEXT DEFAULT 'EUR',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.storefront_carts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own carts" ON public.storefront_carts
  FOR ALL TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

CREATE TABLE public.storefront_cart_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cart_id UUID NOT NULL REFERENCES public.storefront_carts(id) ON DELETE CASCADE,
  item_id UUID NOT NULL REFERENCES public.catalog_items(id) ON DELETE CASCADE,
  variant_id UUID REFERENCES public.catalog_variants(id) ON DELETE SET NULL,
  quantity INTEGER DEFAULT 1,
  unit_price NUMERIC DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.storefront_cart_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own cart items" ON public.storefront_cart_items
  FOR ALL TO authenticated USING (
    EXISTS (SELECT 1 FROM public.storefront_carts sc WHERE sc.id = cart_id AND sc.user_id = auth.uid())
  ) WITH CHECK (
    EXISTS (SELECT 1 FROM public.storefront_carts sc WHERE sc.id = cart_id AND sc.user_id = auth.uid())
  );

-- 6. ORDER ENGINE
CREATE TABLE public.storefront_orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id UUID NOT NULL REFERENCES public.storefront_pages(id) ON DELETE CASCADE,
  seller_id UUID NOT NULL,
  buyer_id UUID,
  buyer_name TEXT DEFAULT '',
  buyer_email TEXT DEFAULT '',
  buyer_phone TEXT,
  status TEXT DEFAULT 'pending',
  payment_status TEXT DEFAULT 'unpaid',
  payment_method TEXT,
  subtotal NUMERIC DEFAULT 0,
  delivery_fee NUMERIC DEFAULT 0,
  total NUMERIC DEFAULT 0,
  currency TEXT DEFAULT 'EUR',
  notes TEXT,
  delivery_address TEXT,
  delivery_lat NUMERIC,
  delivery_lng NUMERIC,
  deal_id UUID,
  stripe_session_id TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.storefront_orders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Sellers manage orders" ON public.storefront_orders
  FOR ALL TO authenticated USING (seller_id = auth.uid()) WITH CHECK (seller_id = auth.uid());

CREATE POLICY "Buyers view own orders" ON public.storefront_orders
  FOR SELECT TO authenticated USING (buyer_id = auth.uid());

CREATE TABLE public.storefront_order_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES public.storefront_orders(id) ON DELETE CASCADE,
  item_id UUID REFERENCES public.catalog_items(id) ON DELETE SET NULL,
  variant_id UUID REFERENCES public.catalog_variants(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  quantity INTEGER DEFAULT 1,
  unit_price NUMERIC DEFAULT 0,
  total_price NUMERIC DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.storefront_order_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Sellers manage order items" ON public.storefront_order_items
  FOR ALL TO authenticated USING (
    EXISTS (SELECT 1 FROM public.storefront_orders so WHERE so.id = order_id AND so.seller_id = auth.uid())
  ) WITH CHECK (
    EXISTS (SELECT 1 FROM public.storefront_orders so WHERE so.id = order_id AND so.seller_id = auth.uid())
  );

CREATE POLICY "Buyers view own order items" ON public.storefront_order_items
  FOR SELECT TO authenticated USING (
    EXISTS (SELECT 1 FROM public.storefront_orders so WHERE so.id = order_id AND so.buyer_id = auth.uid())
  );

-- 7. STOREFRONT ACCESS INVITES (private shops)
CREATE TABLE public.storefront_access_invites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id UUID NOT NULL REFERENCES public.storefront_pages(id) ON DELETE CASCADE,
  email TEXT,
  user_id UUID,
  invite_token TEXT NOT NULL DEFAULT encode(gen_random_bytes(16), 'hex'),
  expires_at TIMESTAMPTZ DEFAULT (now() + interval '30 days'),
  accepted BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.storefront_access_invites ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Shop owners manage invites" ON public.storefront_access_invites
  FOR ALL TO authenticated USING (
    EXISTS (SELECT 1 FROM public.storefront_pages sp WHERE sp.id = shop_id AND sp.user_id = auth.uid())
  ) WITH CHECK (
    EXISTS (SELECT 1 FROM public.storefront_pages sp WHERE sp.id = shop_id AND sp.user_id = auth.uid())
  );

CREATE POLICY "Invited users view invites" ON public.storefront_access_invites
  FOR SELECT TO authenticated USING (user_id = auth.uid() OR email IN (SELECT email FROM public.profiles WHERE id = auth.uid()));

-- 8. STOREFRONT ANALYTICS
CREATE TABLE public.storefront_analytics_daily (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id UUID NOT NULL REFERENCES public.storefront_pages(id) ON DELETE CASCADE,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  views INTEGER DEFAULT 0,
  visitors INTEGER DEFAULT 0,
  orders INTEGER DEFAULT 0,
  revenue NUMERIC DEFAULT 0,
  conversion_rate NUMERIC DEFAULT 0,
  currency TEXT DEFAULT 'EUR',
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(shop_id, date)
);

ALTER TABLE public.storefront_analytics_daily ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Shop owners view analytics" ON public.storefront_analytics_daily
  FOR ALL TO authenticated USING (
    EXISTS (SELECT 1 FROM public.storefront_pages sp WHERE sp.id = shop_id AND sp.user_id = auth.uid())
  ) WITH CHECK (
    EXISTS (SELECT 1 FROM public.storefront_pages sp WHERE sp.id = shop_id AND sp.user_id = auth.uid())
  );

-- Enable realtime on orders for live updates
ALTER PUBLICATION supabase_realtime ADD TABLE public.storefront_orders;

-- Auto-generate slug trigger
CREATE OR REPLACE FUNCTION public.generate_storefront_slug()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
BEGIN
  IF NEW.slug IS NULL OR NEW.slug = '' THEN
    NEW.slug := LOWER(REGEXP_REPLACE(NEW.name, '[^a-z0-9]+', '-', 'gi')) || '-' || SUBSTR(NEW.id::text, 1, 8);
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_storefront_slug
  BEFORE INSERT ON public.storefront_pages
  FOR EACH ROW EXECUTE FUNCTION public.generate_storefront_slug();
