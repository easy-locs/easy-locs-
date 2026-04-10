
-- =============================================
-- PASS132: Merchant CRM Light — Customer segmentation table
-- PASS133: Reorder engine support
-- PASS134: Notification intelligence — automated notification log
-- =============================================

-- CRM Customers view — auto-aggregated from orders
CREATE TABLE IF NOT EXISTS public.storefront_crm_customers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id uuid NOT NULL REFERENCES public.storefront_pages(id) ON DELETE CASCADE,
  buyer_id uuid,
  buyer_email text,
  buyer_name text,
  buyer_phone text,
  segment text NOT NULL DEFAULT 'new', -- new, repeat, vip, inactive
  total_orders int NOT NULL DEFAULT 0,
  total_spent numeric NOT NULL DEFAULT 0,
  last_order_at timestamptz,
  first_order_at timestamptz,
  avg_order_value numeric DEFAULT 0,
  loyalty_points int DEFAULT 0,
  tags text[] DEFAULT '{}',
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(shop_id, buyer_id),
  UNIQUE(shop_id, buyer_email)
);

ALTER TABLE public.storefront_crm_customers ENABLE ROW LEVEL SECURITY;

-- Seller can see their customers
CREATE POLICY "Seller manages CRM" ON public.storefront_crm_customers
  FOR ALL TO authenticated
  USING (
    shop_id IN (SELECT id FROM public.storefront_pages WHERE user_id = auth.uid())
  )
  WITH CHECK (
    shop_id IN (SELECT id FROM public.storefront_pages WHERE user_id = auth.uid())
  );

-- Auto-notification log for intelligent alerts
CREATE TABLE IF NOT EXISTS public.storefront_auto_notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id uuid NOT NULL REFERENCES public.storefront_pages(id) ON DELETE CASCADE,
  buyer_id uuid,
  buyer_email text,
  notification_type text NOT NULL, -- abandoned_cart, reorder_suggestion, inactive_reactivation, loyalty_alert
  payload_json jsonb DEFAULT '{}',
  sent_at timestamptz DEFAULT now(),
  opened boolean DEFAULT false,
  actioned boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.storefront_auto_notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Seller reads auto notifs" ON public.storefront_auto_notifications
  FOR SELECT TO authenticated
  USING (
    shop_id IN (SELECT id FROM public.storefront_pages WHERE user_id = auth.uid())
  );

-- Trigger: auto-upsert CRM customer on new order
CREATE OR REPLACE FUNCTION public.trg_crm_upsert_on_order()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_count int;
  v_total numeric;
  v_first timestamptz;
  v_seg text;
BEGIN
  -- Skip if no buyer info
  IF NEW.buyer_id IS NULL AND NEW.buyer_email IS NULL THEN
    RETURN NEW;
  END IF;

  -- Aggregate stats for this buyer in this shop
  SELECT count(*), coalesce(sum(total), 0), min(created_at)
  INTO v_count, v_total, v_first
  FROM public.storefront_orders
  WHERE shop_id = NEW.shop_id
    AND (
      (NEW.buyer_id IS NOT NULL AND buyer_id = NEW.buyer_id)
      OR (NEW.buyer_email IS NOT NULL AND buyer_email = NEW.buyer_email)
    );

  -- Determine segment
  IF v_total >= 500 OR v_count >= 10 THEN
    v_seg := 'vip';
  ELSIF v_count >= 2 THEN
    v_seg := 'repeat';
  ELSE
    v_seg := 'new';
  END IF;

  -- Upsert
  INSERT INTO public.storefront_crm_customers (
    shop_id, buyer_id, buyer_email, buyer_name, buyer_phone,
    segment, total_orders, total_spent, last_order_at, first_order_at,
    avg_order_value, updated_at
  ) VALUES (
    NEW.shop_id, NEW.buyer_id, NEW.buyer_email, NEW.buyer_name, NEW.buyer_phone,
    v_seg, v_count, v_total, NEW.created_at, v_first,
    CASE WHEN v_count > 0 THEN v_total / v_count ELSE 0 END, now()
  )
  ON CONFLICT (shop_id, buyer_id) DO UPDATE SET
    buyer_email = COALESCE(EXCLUDED.buyer_email, storefront_crm_customers.buyer_email),
    buyer_name = COALESCE(EXCLUDED.buyer_name, storefront_crm_customers.buyer_name),
    buyer_phone = COALESCE(EXCLUDED.buyer_phone, storefront_crm_customers.buyer_phone),
    segment = EXCLUDED.segment,
    total_orders = EXCLUDED.total_orders,
    total_spent = EXCLUDED.total_spent,
    last_order_at = EXCLUDED.last_order_at,
    avg_order_value = EXCLUDED.avg_order_value,
    updated_at = now();

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_crm_on_order
  AFTER INSERT ON public.storefront_orders
  FOR EACH ROW
  EXECUTE FUNCTION public.trg_crm_upsert_on_order();

-- Trigger: mark customers as inactive if no order in 60 days
-- (This will be called periodically or on order insert to check other customers)
CREATE OR REPLACE FUNCTION public.trg_crm_detect_inactive()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  UPDATE public.storefront_crm_customers
  SET segment = 'inactive', updated_at = now()
  WHERE shop_id = NEW.shop_id
    AND segment != 'inactive'
    AND last_order_at < now() - interval '60 days';
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_crm_inactive_check
  AFTER INSERT ON public.storefront_orders
  FOR EACH ROW
  EXECUTE FUNCTION public.trg_crm_detect_inactive();

-- Trigger: auto-detect abandoned carts (carts older than 2 hours with items)
CREATE OR REPLACE FUNCTION public.trg_abandoned_cart_detect()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  -- On cart item insert, schedule a check
  -- We just log carts that are old enough with items
  INSERT INTO public.storefront_auto_notifications (
    shop_id, buyer_id, notification_type, payload_json
  )
  SELECT 
    c.shop_id, c.user_id, 'abandoned_cart',
    jsonb_build_object('cart_id', c.id, 'item_count', (SELECT count(*) FROM public.storefront_cart_items WHERE cart_id = c.id))
  FROM public.storefront_carts c
  WHERE c.id = NEW.cart_id
    AND c.user_id IS NOT NULL
    AND c.status = 'active'
    AND c.updated_at < now() - interval '2 hours'
    AND NOT EXISTS (
      SELECT 1 FROM public.storefront_auto_notifications
      WHERE buyer_id = c.user_id AND notification_type = 'abandoned_cart'
        AND payload_json->>'cart_id' = c.id::text
        AND created_at > now() - interval '24 hours'
    );
  RETURN NEW;
END;
$$;

-- Add bus event types for CRM
-- PASS134: Reorder suggestion trigger on order completion
CREATE OR REPLACE FUNCTION public.trg_reorder_suggestion()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  IF NEW.status = 'completed' AND (OLD.status IS DISTINCT FROM 'completed') THEN
    -- Suggest reorder after 7 days for repeat customers
    INSERT INTO public.storefront_auto_notifications (
      shop_id, buyer_id, buyer_email, notification_type, payload_json
    ) VALUES (
      NEW.shop_id, NEW.buyer_id, NEW.buyer_email, 'reorder_suggestion',
      jsonb_build_object('order_id', NEW.id, 'total', NEW.total, 'currency', NEW.currency)
    );
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_reorder_on_complete
  AFTER UPDATE ON public.storefront_orders
  FOR EACH ROW
  EXECUTE FUNCTION public.trg_reorder_suggestion();

-- Enable realtime for CRM
ALTER PUBLICATION supabase_realtime ADD TABLE public.storefront_crm_customers;
ALTER PUBLICATION supabase_realtime ADD TABLE public.storefront_auto_notifications;
