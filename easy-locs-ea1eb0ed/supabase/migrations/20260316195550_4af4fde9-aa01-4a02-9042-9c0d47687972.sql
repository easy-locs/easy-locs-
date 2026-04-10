
-- Storefront order notifications trigger
CREATE OR REPLACE FUNCTION public.notify_storefront_order()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _seller_id uuid;
  _buyer_id uuid;
  _shop_name text;
  _title text;
  _message text;
BEGIN
  SELECT user_id, name INTO _seller_id, _shop_name 
  FROM public.storefront_pages WHERE id = NEW.shop_id LIMIT 1;
  
  _buyer_id := NEW.buyer_id;

  -- New order notification to seller
  IF TG_OP = 'INSERT' THEN
    IF _seller_id IS NOT NULL THEN
      INSERT INTO public.notifications (user_id, type, title, message, link, metadata_json)
      VALUES (_seller_id, 'info',
        '🛒 New order received',
        COALESCE(NEW.buyer_name, 'Customer') || ' placed an order for ' || NEW.total || ' ' || NEW.currency,
        '/my-shop?tab=orders',
        jsonb_build_object('target_type', 'storefront_order', 'target_id', NEW.id::text)
      );
    END IF;
  END IF;

  -- Status change notifications
  IF TG_OP = 'UPDATE' AND OLD.status IS DISTINCT FROM NEW.status THEN
    -- Notify buyer on status changes
    IF _buyer_id IS NOT NULL THEN
      CASE NEW.status
        WHEN 'accepted' THEN _title := '✅ Order accepted'; _message := 'Your order from ' || COALESCE(_shop_name, 'shop') || ' has been accepted.';
        WHEN 'preparing' THEN _title := '📦 Order preparing'; _message := 'Your order from ' || COALESCE(_shop_name, 'shop') || ' is being prepared.';
        WHEN 'shipped' THEN _title := '🚚 Order shipped'; _message := 'Your order from ' || COALESCE(_shop_name, 'shop') || ' has been shipped!';
        WHEN 'completed' THEN _title := '🎉 Order completed'; _message := 'Your order from ' || COALESCE(_shop_name, 'shop') || ' is complete.';
        WHEN 'cancelled' THEN _title := '❌ Order cancelled'; _message := 'Your order from ' || COALESCE(_shop_name, 'shop') || ' was cancelled.';
        ELSE _title := NULL;
      END CASE;

      IF _title IS NOT NULL THEN
        INSERT INTO public.notifications (user_id, type, title, message, link, metadata_json)
        VALUES (_buyer_id, 'info', _title, _message, '/client/orders',
          jsonb_build_object('target_type', 'storefront_order', 'target_id', NEW.id::text, 'status', NEW.status)
        );
      END IF;
    END IF;

    -- Notify seller on cancellation by buyer
    IF NEW.status = 'cancelled' AND _seller_id IS NOT NULL THEN
      INSERT INTO public.notifications (user_id, type, title, message, link, metadata_json)
      VALUES (_seller_id, 'info',
        '❌ Order cancelled',
        COALESCE(NEW.buyer_name, 'Customer') || '''s order was cancelled.',
        '/my-shop?tab=orders',
        jsonb_build_object('target_type', 'storefront_order', 'target_id', NEW.id::text)
      );
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_notify_storefront_order
  AFTER INSERT OR UPDATE ON public.storefront_orders
  FOR EACH ROW EXECUTE FUNCTION public.notify_storefront_order();

-- Low stock notification function (called by app when stock drops)
CREATE OR REPLACE FUNCTION public.notify_low_stock()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _shop_owner uuid;
  _threshold int := 5;
BEGIN
  -- Only fire when stock was updated and is now low
  IF NEW.track_inventory = true 
     AND NEW.stock_quantity IS NOT NULL 
     AND NEW.stock_quantity <= _threshold
     AND NEW.stock_quantity >= 0
     AND (OLD.stock_quantity IS NULL OR OLD.stock_quantity > _threshold) THEN
    
    SELECT user_id INTO _shop_owner FROM public.storefront_pages WHERE id = NEW.shop_id LIMIT 1;
    
    IF _shop_owner IS NOT NULL THEN
      INSERT INTO public.notifications (user_id, type, title, message, link, metadata_json)
      VALUES (_shop_owner, 'info',
        CASE WHEN NEW.stock_quantity = 0 THEN '🚨 Out of stock' ELSE '⚠️ Low stock alert' END,
        '"' || NEW.title || '" has ' || NEW.stock_quantity || ' units remaining.',
        '/my-shop?tab=settings',
        jsonb_build_object('target_type', 'catalog_item', 'target_id', NEW.id::text, 'stock', NEW.stock_quantity)
      );
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_notify_low_stock
  AFTER UPDATE ON public.catalog_items
  FOR EACH ROW EXECUTE FUNCTION public.notify_low_stock();
