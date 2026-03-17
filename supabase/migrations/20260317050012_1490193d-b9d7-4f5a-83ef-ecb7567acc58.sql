
-- ============================================================
-- PASS121-123: Automation Triggers for Analytics, Notifications, Invoicing
-- ============================================================

-- ── PASS122: Auto-notify on order status changes ──
CREATE OR REPLACE FUNCTION public.trg_auto_notify_order()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_event_type text;
  v_title text;
  v_body text;
  v_buyer_id uuid;
  v_seller_id uuid;
BEGIN
  -- Determine event type based on status
  IF TG_OP = 'INSERT' THEN
    v_event_type := 'order_placed';
    v_title := '🛒 New order received';
    v_body := 'Order #' || LEFT(NEW.id::text, 8) || ' — ' || COALESCE(NEW.currency, 'EUR') || ' ' || COALESCE(NEW.total, 0);
  ELSIF TG_OP = 'UPDATE' AND NEW.status IS DISTINCT FROM OLD.status THEN
    CASE NEW.status
      WHEN 'shipped' THEN
        v_event_type := 'order_shipped';
        v_title := '📦 Order shipped';
        v_body := 'Your order #' || LEFT(NEW.id::text, 8) || ' is on its way';
      WHEN 'completed' THEN
        v_event_type := 'order_delivered';
        v_title := '✅ Order completed';
        v_body := 'Order #' || LEFT(NEW.id::text, 8) || ' has been delivered';
      WHEN 'cancelled' THEN
        v_event_type := 'order_cancelled';
        v_title := '❌ Order cancelled';
        v_body := 'Order #' || LEFT(NEW.id::text, 8) || ' was cancelled';
      ELSE
        RETURN NEW;
    END CASE;
  ELSIF TG_OP = 'UPDATE' AND NEW.payment_status = 'paid' AND OLD.payment_status IS DISTINCT FROM 'paid' THEN
    v_event_type := 'payment_received';
    v_title := '💰 Payment received';
    v_body := COALESCE(NEW.currency, 'EUR') || ' ' || COALESCE(NEW.total, 0) || ' received for order #' || LEFT(NEW.id::text, 8);
  ELSE
    RETURN NEW;
  END IF;

  -- Get seller from shop
  SELECT user_id INTO v_seller_id FROM public.storefront_pages WHERE id = NEW.shop_id;

  -- Notify seller (on INSERT or payment)
  IF v_event_type IN ('order_placed', 'payment_received') THEN
    INSERT INTO public.storefront_notification_log (shop_id, user_id, event_type, title, body, channel)
    VALUES (NEW.shop_id, v_seller_id, v_event_type, v_title, v_body, 'push');
  END IF;

  -- Notify buyer (on shipped, completed, cancelled)
  IF v_event_type IN ('order_shipped', 'order_delivered', 'order_cancelled') AND NEW.buyer_id IS NOT NULL THEN
    INSERT INTO public.storefront_notification_log (shop_id, user_id, event_type, title, body, channel)
    VALUES (NEW.shop_id, NEW.buyer_id, v_event_type, v_title, v_body, 'push');
  END IF;

  RETURN NEW;
END;
$$;

-- Drop if exists then create
DROP TRIGGER IF EXISTS trg_auto_notify_order ON public.storefront_orders;
CREATE TRIGGER trg_auto_notify_order
  AFTER INSERT OR UPDATE ON public.storefront_orders
  FOR EACH ROW EXECUTE FUNCTION public.trg_auto_notify_order();

-- ── PASS123: Auto-generate invoice on order completion ──
CREATE OR REPLACE FUNCTION public.trg_auto_invoice_on_complete()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_inv_number text;
  v_next_num int;
  v_prefix text;
  v_tax_rate numeric;
  v_tax_name text;
  v_subtotal numeric;
  v_tax_amount numeric;
  v_buyer_email text;
  v_buyer_name text;
  v_exists boolean;
BEGIN
  -- Only fire on status change to 'completed'
  IF NEW.status <> 'completed' OR OLD.status = 'completed' THEN
    RETURN NEW;
  END IF;

  -- Check if invoice already exists for this order
  SELECT EXISTS(SELECT 1 FROM public.storefront_invoices WHERE order_id = NEW.id) INTO v_exists;
  IF v_exists THEN RETURN NEW; END IF;

  -- Get shop invoice settings
  SELECT 
    COALESCE(invoice_prefix, 'INV'),
    COALESCE(invoice_next_number, 1),
    COALESCE(tax_rate, 0),
    COALESCE(tax_name, 'VAT')
  INTO v_prefix, v_next_num, v_tax_rate, v_tax_name
  FROM public.storefront_pages WHERE id = NEW.shop_id;

  -- Generate invoice number
  v_inv_number := v_prefix || '-' || TO_CHAR(NOW(), 'YYYYMM') || '-' || LPAD(v_next_num::text, 4, '0');

  -- Calculate amounts
  v_subtotal := COALESCE(NEW.total, 0);
  v_tax_amount := ROUND(v_subtotal * v_tax_rate / 100, 2);

  -- Get buyer info
  SELECT email, full_name INTO v_buyer_email, v_buyer_name
  FROM public.profiles WHERE id = NEW.buyer_id;

  -- Insert invoice
  INSERT INTO public.storefront_invoices (
    shop_id, order_id, invoice_number, status,
    subtotal, tax_rate, tax_name, tax_amount, total,
    currency, buyer_email, buyer_name,
    issued_at, paid_at
  ) VALUES (
    NEW.shop_id, NEW.id, v_inv_number, 'paid',
    v_subtotal, v_tax_rate, v_tax_name, v_tax_amount, v_subtotal + v_tax_amount,
    COALESCE(NEW.currency, 'EUR'), v_buyer_email, v_buyer_name,
    NOW(), NOW()
  );

  -- Increment invoice counter
  UPDATE public.storefront_pages SET invoice_next_number = v_next_num + 1 WHERE id = NEW.shop_id;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_auto_invoice_on_complete ON public.storefront_orders;
CREATE TRIGGER trg_auto_invoice_on_complete
  AFTER UPDATE ON public.storefront_orders
  FOR EACH ROW EXECUTE FUNCTION public.trg_auto_invoice_on_complete();

-- ── PASS121: Enhance analytics with review-submitted notification ──
CREATE OR REPLACE FUNCTION public.trg_notify_on_review()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_seller_id uuid;
BEGIN
  SELECT user_id INTO v_seller_id FROM public.storefront_pages WHERE id = NEW.shop_id;
  
  IF v_seller_id IS NOT NULL THEN
    INSERT INTO public.storefront_notification_log (shop_id, user_id, event_type, title, body, channel)
    VALUES (
      NEW.shop_id, v_seller_id, 'review_posted',
      '⭐ New review received',
      'Rating: ' || COALESCE(NEW.rating, 0) || '/5 — ' || COALESCE(LEFT(NEW.comment, 60), 'No comment'),
      'push'
    );
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notify_on_review ON public.storefront_reviews;
CREATE TRIGGER trg_notify_on_review
  AFTER INSERT ON public.storefront_reviews
  FOR EACH ROW EXECUTE FUNCTION public.trg_notify_on_review();

-- Enable realtime for notification_log so buyers/sellers get instant updates
ALTER PUBLICATION supabase_realtime ADD TABLE public.storefront_notification_log;
