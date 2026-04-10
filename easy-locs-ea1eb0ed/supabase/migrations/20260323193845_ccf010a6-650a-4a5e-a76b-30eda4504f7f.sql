
-- Fix risk check trigger referencing wrong column name
CREATE OR REPLACE FUNCTION trg_risk_check_order()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_avg numeric;
BEGIN
  SELECT AVG(total) INTO v_avg
  FROM public.storefront_orders 
  WHERE shop_id = NEW.shop_id AND status != 'cancelled';
  
  -- Flag if order is 5x above average
  IF v_avg IS NOT NULL AND v_avg > 0 AND NEW.total > v_avg * 5 THEN
    INSERT INTO admin_alerts (alert_type, severity, title, entity_type, entity_id, status)
    VALUES ('high_value_order', 'warning', 'High value order detected: ' || NEW.total, 'storefront_order', NEW.id::text, 'open');
  END IF;
  
  RETURN NEW;
END;
$$;
