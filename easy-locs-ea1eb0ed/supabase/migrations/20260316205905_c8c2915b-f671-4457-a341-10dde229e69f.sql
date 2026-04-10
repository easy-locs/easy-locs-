
-- Only create tables that don't exist yet and use DROP POLICY IF EXISTS

-- Shipments
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'storefront_shipments') THEN
    CREATE TABLE public.storefront_shipments (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      shop_id UUID NOT NULL REFERENCES public.storefront_pages(id) ON DELETE CASCADE,
      order_id UUID NOT NULL REFERENCES public.storefront_orders(id) ON DELETE CASCADE,
      tracking_number TEXT, carrier TEXT DEFAULT 'standard',
      status TEXT DEFAULT 'pending' CHECK (status IN ('pending','label_created','picked_up','in_transit','out_for_delivery','delivered','returned','exception')),
      shipped_at TIMESTAMPTZ, delivered_at TIMESTAMPTZ, estimated_delivery TIMESTAMPTZ,
      shipping_fee NUMERIC DEFAULT 0, currency TEXT DEFAULT 'EUR', weight_kg NUMERIC,
      notes TEXT, tracking_url TEXT, tracking_events JSONB DEFAULT '[]',
      created_at TIMESTAMPTZ DEFAULT now(), updated_at TIMESTAMPTZ DEFAULT now()
    );
    ALTER TABLE public.storefront_shipments ENABLE ROW LEVEL SECURITY;
    CREATE POLICY "Shop owner manages shipments" ON public.storefront_shipments FOR ALL TO authenticated
      USING (EXISTS (SELECT 1 FROM storefront_pages sp WHERE sp.id = shop_id AND sp.user_id = auth.uid()));
    CREATE POLICY "Buyer views own shipments" ON public.storefront_shipments FOR SELECT TO authenticated
      USING (EXISTS (SELECT 1 FROM storefront_orders so WHERE so.id = order_id AND so.buyer_id = auth.uid()));
  END IF;
END $$;

-- Tax rules
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'storefront_tax_rules') THEN
    CREATE TABLE public.storefront_tax_rules (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      shop_id UUID NOT NULL REFERENCES public.storefront_pages(id) ON DELETE CASCADE,
      user_id UUID NOT NULL, country TEXT NOT NULL, region TEXT,
      tax_name TEXT DEFAULT 'VAT', tax_rate NUMERIC NOT NULL DEFAULT 20,
      tax_inclusive BOOLEAN DEFAULT true,
      applies_to TEXT DEFAULT 'all' CHECK (applies_to IN ('all','physical','digital','services')),
      tax_exempt_categories TEXT[] DEFAULT '{}', active BOOLEAN DEFAULT true,
      created_at TIMESTAMPTZ DEFAULT now()
    );
    ALTER TABLE public.storefront_tax_rules ENABLE ROW LEVEL SECURITY;
    CREATE POLICY "Owner manages tax rules" ON public.storefront_tax_rules FOR ALL TO authenticated
      USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
  END IF;
END $$;

-- Invoices
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'storefront_invoices') THEN
    CREATE TABLE public.storefront_invoices (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      shop_id UUID NOT NULL REFERENCES public.storefront_pages(id) ON DELETE CASCADE,
      order_id UUID NOT NULL REFERENCES public.storefront_orders(id) ON DELETE CASCADE,
      invoice_number TEXT NOT NULL, buyer_name TEXT, buyer_email TEXT, buyer_address TEXT, buyer_tax_id TEXT,
      subtotal NUMERIC DEFAULT 0, tax_amount NUMERIC DEFAULT 0, tax_rate NUMERIC DEFAULT 0,
      tax_name TEXT DEFAULT 'VAT', shipping_amount NUMERIC DEFAULT 0, discount_amount NUMERIC DEFAULT 0,
      total NUMERIC DEFAULT 0, currency TEXT DEFAULT 'EUR', display_currency TEXT, exchange_rate NUMERIC DEFAULT 1,
      status TEXT DEFAULT 'draft' CHECK (status IN ('draft','sent','paid','cancelled','refunded')),
      issued_at TIMESTAMPTZ DEFAULT now(), due_at TIMESTAMPTZ, paid_at TIMESTAMPTZ, notes TEXT,
      created_at TIMESTAMPTZ DEFAULT now()
    );
    ALTER TABLE public.storefront_invoices ENABLE ROW LEVEL SECURITY;
    CREATE POLICY "Owner manages invoices" ON public.storefront_invoices FOR ALL TO authenticated
      USING (EXISTS (SELECT 1 FROM storefront_pages sp WHERE sp.id = shop_id AND sp.user_id = auth.uid()));
    CREATE POLICY "Buyer views own invoices" ON public.storefront_invoices FOR SELECT TO authenticated
      USING (EXISTS (SELECT 1 FROM storefront_orders so WHERE so.id = order_id AND so.buyer_id = auth.uid()));
    
    CREATE OR REPLACE FUNCTION public.generate_invoice_number()
    RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $fn$
    DECLARE _seq INTEGER;
    BEGIN
      SELECT COUNT(*) + 1 INTO _seq FROM public.storefront_invoices WHERE shop_id = NEW.shop_id;
      NEW.invoice_number := 'INV-' || TO_CHAR(NOW(), 'YYYYMM') || '-' || LPAD(_seq::TEXT, 4, '0');
      RETURN NEW;
    END; $fn$;
    CREATE TRIGGER trg_generate_invoice_number BEFORE INSERT ON public.storefront_invoices
    FOR EACH ROW EXECUTE FUNCTION public.generate_invoice_number();
  END IF;
END $$;

-- Analytics events
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'storefront_analytics_events') THEN
    CREATE TABLE public.storefront_analytics_events (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      shop_id UUID NOT NULL REFERENCES public.storefront_pages(id) ON DELETE CASCADE,
      event_type TEXT NOT NULL CHECK (event_type IN ('page_view','product_view','add_to_cart','checkout_start','purchase','search','wishlist_add','share')),
      item_id UUID, user_id UUID, session_id TEXT, referrer TEXT, country TEXT, device_type TEXT,
      metadata_json JSONB DEFAULT '{}', revenue NUMERIC DEFAULT 0, currency TEXT DEFAULT 'EUR',
      created_at TIMESTAMPTZ DEFAULT now()
    );
    ALTER TABLE public.storefront_analytics_events ENABLE ROW LEVEL SECURITY;
    CREATE POLICY "Shop owner views analytics" ON public.storefront_analytics_events FOR SELECT TO authenticated
      USING (EXISTS (SELECT 1 FROM storefront_pages sp WHERE sp.id = shop_id AND sp.user_id = auth.uid()));
    CREATE POLICY "Anyone inserts analytics" ON public.storefront_analytics_events FOR INSERT TO authenticated WITH CHECK (true);
    CREATE POLICY "Anon inserts analytics" ON public.storefront_analytics_events FOR INSERT TO anon WITH CHECK (true);
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_analytics_shop_type_date ON public.storefront_analytics_events(shop_id, event_type, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_shipments_order ON public.storefront_shipments(order_id);
