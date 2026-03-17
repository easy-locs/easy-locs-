
-- ============================================================
-- PASS124-127: Auto-lifecycle, Returns automation, Seller onboarding
-- ============================================================

-- ── PASS124: Auto-confirm paid orders (pending + paid → accepted) ──
CREATE OR REPLACE FUNCTION public.trg_auto_confirm_paid_order()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  -- Auto-confirm when payment is received on a pending order
  IF NEW.payment_status = 'paid' AND OLD.payment_status IS DISTINCT FROM 'paid'
     AND NEW.status = 'pending' THEN
    NEW.status := 'accepted';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_auto_confirm_paid ON public.storefront_orders;
CREATE TRIGGER trg_auto_confirm_paid
  BEFORE UPDATE ON public.storefront_orders
  FOR EACH ROW EXECUTE FUNCTION public.trg_auto_confirm_paid_order();

-- ── PASS126: Auto-process approved returns → refund status ──
CREATE OR REPLACE FUNCTION public.trg_auto_process_return()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  -- When return is approved, auto-set refund amount from order total if not set
  IF NEW.status = 'approved' AND OLD.status IS DISTINCT FROM 'approved' THEN
    IF NEW.refund_amount IS NULL OR NEW.refund_amount = 0 THEN
      SELECT total INTO NEW.refund_amount
      FROM public.storefront_orders WHERE id = NEW.order_id;
    END IF;
    NEW.approved_at := NOW();
  END IF;

  -- When return is marked refunded, update order status
  IF NEW.status = 'refunded' AND OLD.status IS DISTINCT FROM 'refunded' THEN
    NEW.refunded_at := NOW();
    UPDATE public.storefront_orders 
    SET status = 'refunded', updated_at = NOW()
    WHERE id = NEW.order_id;
  END IF;

  -- Notify buyer on status change
  IF NEW.status IS DISTINCT FROM OLD.status AND NEW.buyer_id IS NOT NULL THEN
    INSERT INTO public.storefront_notification_log (shop_id, user_id, event_type, title, body, channel)
    VALUES (
      NEW.shop_id,
      NEW.buyer_id,
      'return_update',
      CASE NEW.status
        WHEN 'approved' THEN '✅ Return approved'
        WHEN 'rejected' THEN '❌ Return rejected'
        WHEN 'refunded' THEN '💰 Refund processed'
        ELSE '📦 Return updated'
      END,
      'Return request #' || LEFT(NEW.id::text, 8) || ' is now ' || NEW.status,
      'push'
    );
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_auto_process_return ON public.storefront_returns;
CREATE TRIGGER trg_auto_process_return
  BEFORE UPDATE ON public.storefront_returns
  FOR EACH ROW EXECUTE FUNCTION public.trg_auto_process_return();

-- ── PASS126: Auto-notify seller on new return request ──
CREATE OR REPLACE FUNCTION public.trg_notify_new_return()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_seller_id uuid;
BEGIN
  SELECT user_id INTO v_seller_id FROM public.storefront_pages WHERE id = NEW.shop_id;
  IF v_seller_id IS NOT NULL THEN
    INSERT INTO public.storefront_notification_log (shop_id, user_id, event_type, title, body, channel)
    VALUES (
      NEW.shop_id, v_seller_id, 'return_request',
      '📦 New return request',
      'Reason: ' || COALESCE(NEW.reason, 'Not specified') || ' — Order #' || LEFT(NEW.order_id::text, 8),
      'push'
    );
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notify_new_return ON public.storefront_returns;
CREATE TRIGGER trg_notify_new_return
  AFTER INSERT ON public.storefront_returns
  FOR EACH ROW EXECUTE FUNCTION public.trg_notify_new_return();

-- ── PASS127: Add onboarding_completed flag to storefront_pages ──
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'storefront_pages' AND column_name = 'onboarding_completed'
  ) THEN
    ALTER TABLE public.storefront_pages ADD COLUMN onboarding_completed boolean DEFAULT false;
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'storefront_pages' AND column_name = 'onboarding_step'
  ) THEN
    ALTER TABLE public.storefront_pages ADD COLUMN onboarding_step int DEFAULT 0;
  END IF;
END $$;
