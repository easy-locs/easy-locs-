
-- PASS134: Loyalty alert trigger — notify buyer when they earn points
CREATE OR REPLACE FUNCTION public.trg_loyalty_alert_notification()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  -- When loyalty points are awarded, create auto-notification
  IF NEW.points_balance > COALESCE(OLD.points_balance, 0) THEN
    INSERT INTO public.storefront_auto_notifications (
      shop_id, buyer_id, notification_type, payload_json
    )
    SELECT sp.id, NEW.user_id, 'loyalty_alert',
      jsonb_build_object('points_earned', NEW.points_balance - COALESCE(OLD.points_balance, 0), 'total_points', NEW.points_balance)
    FROM public.storefront_loyalty_points lp
    JOIN public.storefront_pages sp ON sp.id = lp.shop_id
    WHERE lp.id = NEW.id
    LIMIT 1;
  END IF;
  RETURN NEW;
END;
$$;

-- Only create trigger if storefront_loyalty_points exists
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'storefront_loyalty_points') THEN
    EXECUTE 'CREATE TRIGGER trg_loyalty_alert AFTER UPDATE ON public.storefront_loyalty_points FOR EACH ROW EXECUTE FUNCTION public.trg_loyalty_alert_notification()';
  END IF;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- PASS134: Inactive customer reactivation auto-detection
-- Updates CRM segment and creates notification when customer goes inactive
CREATE OR REPLACE FUNCTION public.trg_crm_inactive_reactivation()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  -- When a customer becomes inactive, create reactivation notification
  IF NEW.segment = 'inactive' AND OLD.segment IS DISTINCT FROM 'inactive' THEN
    INSERT INTO public.storefront_auto_notifications (
      shop_id, buyer_id, buyer_email, notification_type, payload_json
    ) VALUES (
      NEW.shop_id, NEW.buyer_id, NEW.buyer_email, 'inactive_reactivation',
      jsonb_build_object('last_order_at', NEW.last_order_at, 'total_spent', NEW.total_spent, 'total_orders', NEW.total_orders)
    );
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_crm_inactive_notif
  AFTER UPDATE ON public.storefront_crm_customers
  FOR EACH ROW
  EXECUTE FUNCTION public.trg_crm_inactive_reactivation();
