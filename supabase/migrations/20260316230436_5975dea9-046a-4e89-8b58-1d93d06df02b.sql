
-- ============================================
-- AUTOMATION ENGINE: Real PostgreSQL triggers
-- ============================================

-- 1. order_paid → auto-create delivery_job
CREATE OR REPLACE FUNCTION public.auto_create_delivery_on_paid()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _shop RECORD;
  _org_id uuid;
BEGIN
  -- Only fire when payment_status changes to 'paid'
  IF NEW.payment_status = 'paid' AND (OLD.payment_status IS NULL OR OLD.payment_status <> 'paid') THEN
    -- Only if delivery not already requested and shipping address exists
    IF COALESCE(NEW.delivery_requested, false) = false AND NEW.shipping_address IS NOT NULL AND NEW.shipping_address <> '' THEN
      
      -- Get shop info and org
      SELECT sp.user_id, om.org_id INTO _shop
      FROM public.storefront_pages sp
      LEFT JOIN public.org_members om ON om.user_id = sp.user_id
      WHERE sp.id = NEW.shop_id
      LIMIT 1;

      IF _shop.org_id IS NOT NULL THEN
        -- Create delivery job
        INSERT INTO public.delivery_jobs (
          org_id, seller_id, order_id,
          pickup_address, dropoff_address,
          package_description, status, priority
        ) VALUES (
          _shop.org_id, NEW.seller_id, NEW.id::text,
          'Pickup from shop', -- seller can update later
          NEW.shipping_address,
          'Storefront order #' || LEFT(NEW.id::text, 8) || ' for ' || COALESCE(NEW.buyer_name, 'customer'),
          'pending', 'normal'
        )
        RETURNING id INTO _shop; -- reuse variable

        -- Link delivery job to order
        UPDATE public.storefront_orders
        SET delivery_job_id = _shop.id,
            delivery_requested = true,
            delivery_status = 'pending'
        WHERE id = NEW.id;
      END IF;
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

-- Drop if exists then create trigger
DROP TRIGGER IF EXISTS trg_auto_delivery_on_paid ON public.storefront_orders;
CREATE TRIGGER trg_auto_delivery_on_paid
  AFTER UPDATE ON public.storefront_orders
  FOR EACH ROW
  EXECUTE FUNCTION public.auto_create_delivery_on_paid();

-- 2. deal_accepted → auto-create storefront order
CREATE OR REPLACE FUNCTION public.auto_create_order_on_deal_accepted()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _order_id uuid;
BEGIN
  -- Only fire when status changes to 'accepted'
  IF NEW.status = 'accepted' AND (OLD.status IS NULL OR OLD.status::text <> 'accepted') THEN
    -- Only if no order already created and shop_id exists
    IF NEW.converted_order_id IS NULL AND NEW.shop_id IS NOT NULL THEN
      INSERT INTO public.storefront_orders (
        shop_id, seller_id, buyer_id,
        buyer_name, status, payment_status,
        total, currency, deal_id, notes
      )
      SELECT
        NEW.shop_id,
        sp.user_id,
        NEW.buyer_id,
        COALESCE(p.full_name, 'Buyer'),
        'pending',
        'unpaid',
        COALESCE(NEW.accepted_amount, NEW.current_offer_amount, 0),
        COALESCE(NEW.current_offer_currency, 'EUR'),
        NEW.id,
        'Auto-created from accepted deal: ' || COALESCE(NEW.context_title, '')
      FROM public.storefront_pages sp
      LEFT JOIN public.profiles p ON p.id = NEW.buyer_id
      WHERE sp.id = NEW.shop_id
      RETURNING id INTO _order_id;

      IF _order_id IS NOT NULL THEN
        UPDATE public.deal_rooms
        SET converted_order_id = _order_id::text
        WHERE id = NEW.id;
      END IF;
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_auto_order_on_deal_accepted ON public.deal_rooms;
CREATE TRIGGER trg_auto_order_on_deal_accepted
  AFTER UPDATE ON public.deal_rooms
  FOR EACH ROW
  EXECUTE FUNCTION public.auto_create_order_on_deal_accepted();

-- 3. delivery_completed → trigger review request notification
CREATE OR REPLACE FUNCTION public.auto_review_request_on_delivery()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _order RECORD;
  _shop_name text;
BEGIN
  -- Only fire when status changes to 'completed'
  IF NEW.status = 'completed' AND (OLD.status IS NULL OR OLD.status <> 'completed') THEN
    -- Find associated storefront order
    IF NEW.order_id IS NOT NULL THEN
      SELECT so.buyer_id, so.shop_id, so.buyer_name
      INTO _order
      FROM public.storefront_orders so
      WHERE so.id::text = NEW.order_id
      LIMIT 1;

      IF _order.buyer_id IS NOT NULL THEN
        SELECT name INTO _shop_name FROM public.storefront_pages WHERE id = _order.shop_id LIMIT 1;

        -- Create review request notification
        INSERT INTO public.notifications (user_id, type, title, message, link, metadata_json)
        VALUES (
          _order.buyer_id,
          'info',
          '⭐ How was your order?',
          'Your order from ' || COALESCE(_shop_name, 'shop') || ' has been delivered. Share your review!',
          '/s/' || COALESCE((SELECT slug FROM public.storefront_pages WHERE id = _order.shop_id LIMIT 1), ''),
          jsonb_build_object(
            'target_type', 'review_request',
            'target_id', NEW.order_id,
            'shop_id', _order.shop_id::text
          )
        );
      END IF;

      -- Also update storefront order delivery status
      UPDATE public.storefront_orders
      SET delivery_status = 'completed', status = 'completed'
      WHERE id::text = NEW.order_id;
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_auto_review_on_delivery ON public.delivery_jobs;
CREATE TRIGGER trg_auto_review_on_delivery
  AFTER UPDATE ON public.delivery_jobs
  FOR EACH ROW
  EXECUTE FUNCTION public.auto_review_request_on_delivery();
