
-- PASS101: AutoFlow Engine — Event-driven triggers for order lifecycle automation
-- PASS106: Deal → Order automatic conversion trigger  
-- PASS107: Auto-dispatch delivery on order paid

-- 1. AutoFlow: When order status changes to 'paid', auto-create delivery job
CREATE OR REPLACE FUNCTION public.autoflow_order_paid_dispatch()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _org_id uuid;
  _seller_id uuid;
  _shipping_address text;
  _shop_address text;
  _job_id uuid;
BEGIN
  -- Only fire when payment_status changes to 'paid'
  IF NEW.payment_status = 'paid' AND (OLD.payment_status IS NULL OR OLD.payment_status <> 'paid') THEN
    -- Skip if delivery already requested
    IF NEW.delivery_requested = true THEN RETURN NEW; END IF;
    -- Skip if no shipping address
    IF NEW.shipping_address IS NULL OR NEW.shipping_address = '' THEN RETURN NEW; END IF;

    -- Get shop info for pickup address
    SELECT sp.org_id, sp.user_id, COALESCE(sp.address, sp.city, '')
    INTO _org_id, _seller_id, _shop_address
    FROM public.storefront_pages sp
    WHERE sp.id = NEW.shop_id
    LIMIT 1;

    IF _org_id IS NULL THEN RETURN NEW; END IF;

    -- Create delivery job
    INSERT INTO public.delivery_jobs (
      org_id, seller_id, order_id,
      pickup_address, dropoff_address,
      package_description, status, priority
    ) VALUES (
      _org_id, COALESCE(NEW.seller_id, _seller_id), NEW.id,
      COALESCE(_shop_address, 'Seller address'),
      NEW.shipping_address,
      'Order #' || LEFT(NEW.id::text, 8) || ' for ' || COALESCE(NEW.buyer_name, NEW.buyer_email, 'customer'),
      'pending', 'normal'
    ) RETURNING id INTO _job_id;

    -- Update order with delivery info
    NEW.delivery_requested := true;
    NEW.delivery_job_id := _job_id;
    NEW.delivery_status := 'pending';

    -- Notify seller
    INSERT INTO public.notifications (user_id, org_id, type, title, message, link, metadata_json)
    VALUES (
      COALESCE(NEW.seller_id, _seller_id), _org_id, 'payment',
      '💰 Order paid — delivery dispatched',
      COALESCE(NEW.buyer_name, 'Customer') || ' paid ' || NEW.total || ' ' || COALESCE(NEW.currency, 'EUR') || '. Delivery auto-dispatched.',
      '/dashboard/my-shop',
      jsonb_build_object('target_type', 'storefront_order', 'target_id', NEW.id::text, 'target_url', '/dashboard/my-shop')
    );
  END IF;
  RETURN NEW;
END;
$$;

-- Drop if exists, then create trigger
DROP TRIGGER IF EXISTS trg_autoflow_order_paid ON public.storefront_orders;
CREATE TRIGGER trg_autoflow_order_paid
  BEFORE UPDATE ON public.storefront_orders
  FOR EACH ROW
  EXECUTE FUNCTION public.autoflow_order_paid_dispatch();

-- 2. AutoFlow: Deal accepted → auto-convert to order (PASS106)
CREATE OR REPLACE FUNCTION public.autoflow_deal_to_order()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _order_id uuid;
  _shop_user_id uuid;
  _currency text;
  _amount numeric;
BEGIN
  -- Only fire when status changes to 'accepted' and no order yet
  IF NEW.status = 'accepted' AND OLD.status IS DISTINCT FROM 'accepted' AND NEW.converted_order_id IS NULL THEN
    _amount := COALESCE(NEW.accepted_amount, NEW.counter_offer_amount, NEW.current_offer_amount, 0);
    _currency := COALESCE(NEW.current_offer_currency, 'EUR');

    -- Get seller user_id from shop
    SELECT user_id INTO _shop_user_id FROM public.storefront_pages WHERE id = NEW.shop_id LIMIT 1;

    -- Create storefront order
    INSERT INTO public.storefront_orders (
      shop_id, seller_id, buyer_id,
      buyer_name, buyer_email,
      subtotal, total, currency,
      status, notes
    ) VALUES (
      NEW.shop_id, COALESCE(NEW.seller_id, _shop_user_id), NEW.buyer_id,
      '', '',
      _amount, _amount, _currency,
      'pending',
      'Auto-created from deal #' || LEFT(NEW.id::text, 8) || ' — ' || COALESCE(NEW.context_title, '')
    ) RETURNING id INTO _order_id;

    -- Link order to deal
    NEW.converted_order_id := _order_id;
    NEW.status := 'completed';

    -- Notify buyer
    IF NEW.buyer_id IS NOT NULL THEN
      INSERT INTO public.notifications (user_id, org_id, type, title, message, link, metadata_json)
      VALUES (
        NEW.buyer_id, NEW.org_id, 'info',
        '🎉 Deal accepted — order created',
        'Your deal for "' || COALESCE(NEW.context_title, 'item') || '" has been converted to an order.',
        '/my-orders',
        jsonb_build_object('target_type', 'storefront_order', 'target_id', _order_id::text, 'target_url', '/my-orders')
      );
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_autoflow_deal_to_order ON public.deal_rooms;
CREATE TRIGGER trg_autoflow_deal_to_order
  BEFORE UPDATE ON public.deal_rooms
  FOR EACH ROW
  EXECUTE FUNCTION public.autoflow_deal_to_order();

-- 3. AutoFlow: Delivery completed → mark order as completed + request review
CREATE OR REPLACE FUNCTION public.autoflow_delivery_completed()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _order record;
BEGIN
  -- Only fire when delivery status changes to 'completed'
  IF NEW.status = 'completed' AND OLD.status IS DISTINCT FROM 'completed' AND NEW.order_id IS NOT NULL THEN
    -- Update the linked storefront order
    UPDATE public.storefront_orders
    SET status = 'completed', delivery_status = 'completed', updated_at = now()
    WHERE id = NEW.order_id AND status != 'completed';

    -- Get order info for review notification
    SELECT id, buyer_id, buyer_name, shop_id INTO _order
    FROM public.storefront_orders WHERE id = NEW.order_id LIMIT 1;

    IF _order.buyer_id IS NOT NULL THEN
      INSERT INTO public.notifications (user_id, org_id, type, title, message, link, metadata_json)
      VALUES (
        _order.buyer_id, NEW.org_id, 'info',
        '⭐ How was your order?',
        'Your delivery has been completed! Share your experience.',
        '/my-orders',
        jsonb_build_object('target_type', 'review_request', 'target_id', _order.id::text, 'target_url', '/my-orders')
      );
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_autoflow_delivery_completed ON public.delivery_jobs;
CREATE TRIGGER trg_autoflow_delivery_completed
  AFTER UPDATE ON public.delivery_jobs
  FOR EACH ROW
  EXECUTE FUNCTION public.autoflow_delivery_completed();

-- 4. Stock deduction on order creation (PASS104 hardening)
CREATE OR REPLACE FUNCTION public.autoflow_deduct_stock()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Deduct stock from catalog_items if track_inventory is true
  UPDATE public.catalog_items
  SET stock_quantity = GREATEST(0, COALESCE(stock_quantity, 0) - NEW.quantity)
  WHERE id = NEW.item_id AND track_inventory = true;
  
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_autoflow_deduct_stock ON public.storefront_order_items;
CREATE TRIGGER trg_autoflow_deduct_stock
  AFTER INSERT ON public.storefront_order_items
  FOR EACH ROW
  EXECUTE FUNCTION public.autoflow_deduct_stock();
