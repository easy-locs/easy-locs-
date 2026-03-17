
-- PASS111: Order notification trigger
CREATE OR REPLACE FUNCTION public.autoflow_order_notification()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _seller_id uuid;
  _shop_name text;
BEGIN
  IF TG_OP = 'INSERT' THEN
    SELECT name, user_id INTO _shop_name, _seller_id
    FROM public.storefront_pages WHERE id = NEW.shop_id LIMIT 1;

    IF _seller_id IS NOT NULL THEN
      INSERT INTO public.notifications (user_id, org_id, type, title, message, link, metadata_json)
      SELECT _seller_id, sp.org_id, 'info',
        '🛒 New order received',
        COALESCE(NEW.buyer_name, NEW.buyer_email, 'Customer') || ' placed an order — ' || COALESCE(NEW.total::text, '0') || ' ' || COALESCE(NEW.currency, 'EUR'),
        '/dashboard/my-shop',
        jsonb_build_object('target_type', 'storefront_order', 'target_id', NEW.id::text, 'target_url', '/dashboard/my-shop')
      FROM public.storefront_pages sp WHERE sp.id = NEW.shop_id LIMIT 1;
    END IF;

    IF NEW.buyer_id IS NOT NULL THEN
      INSERT INTO public.notifications (user_id, type, title, message, link, metadata_json)
      VALUES (NEW.buyer_id, 'info', '✅ Order confirmed',
        'Your order at ' || COALESCE(_shop_name, 'shop') || ' has been placed.', '/my-orders',
        jsonb_build_object('target_type', 'storefront_order', 'target_id', NEW.id::text, 'target_url', '/my-orders'));
    END IF;
  END IF;

  IF TG_OP = 'UPDATE' AND OLD.status IS DISTINCT FROM NEW.status THEN
    SELECT name INTO _shop_name FROM public.storefront_pages WHERE id = NEW.shop_id LIMIT 1;
    IF NEW.buyer_id IS NOT NULL AND NEW.status IN ('accepted', 'preparing', 'shipped', 'completed', 'cancelled') THEN
      INSERT INTO public.notifications (user_id, type, title, message, link, metadata_json)
      VALUES (NEW.buyer_id, 'info',
        CASE NEW.status WHEN 'accepted' THEN '✅ Order accepted' WHEN 'preparing' THEN '📦 Order being prepared'
          WHEN 'shipped' THEN '🚚 Order shipped' WHEN 'completed' THEN '🎉 Order delivered'
          WHEN 'cancelled' THEN '❌ Order cancelled' ELSE '📋 Order updated' END,
        'Your order at ' || COALESCE(_shop_name, 'shop') || ' is now ' || NEW.status || '.', '/my-orders',
        jsonb_build_object('target_type', 'storefront_order', 'target_id', NEW.id::text, 'target_url', '/my-orders', 'status', NEW.status));
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_autoflow_order_notify ON public.storefront_orders;
CREATE TRIGGER trg_autoflow_order_notify
  AFTER INSERT OR UPDATE ON public.storefront_orders
  FOR EACH ROW
  EXECUTE FUNCTION public.autoflow_order_notification();

-- PASS116: SEO auto-fill trigger
CREATE OR REPLACE FUNCTION public.autoflow_catalog_seo()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF NEW.seo_title IS NULL OR NEW.seo_title = '' THEN
    NEW.seo_title := LEFT(NEW.title || ' | Buy Online', 60);
  END IF;
  IF NEW.seo_description IS NULL OR NEW.seo_description = '' THEN
    NEW.seo_description := LEFT(COALESCE(NEW.description, NEW.title || ' — available now at great prices.'), 155);
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_autoflow_catalog_seo ON public.catalog_items;
CREATE TRIGGER trg_autoflow_catalog_seo
  BEFORE INSERT OR UPDATE ON public.catalog_items
  FOR EACH ROW
  EXECUTE FUNCTION public.autoflow_catalog_seo();
