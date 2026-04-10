
CREATE OR REPLACE FUNCTION public.auto_create_delivery_on_paid()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _shop RECORD;
  _job_id uuid;
BEGIN
  IF NEW.payment_status = 'paid' AND (OLD.payment_status IS NULL OR OLD.payment_status <> 'paid') THEN
    IF COALESCE(NEW.delivery_requested, false) = false AND NEW.shipping_address IS NOT NULL AND NEW.shipping_address <> '' THEN
      SELECT sp.user_id, om.org_id INTO _shop
      FROM public.storefront_pages sp
      LEFT JOIN public.org_members om ON om.user_id = sp.user_id
      WHERE sp.id = NEW.shop_id
      LIMIT 1;

      IF _shop.org_id IS NOT NULL THEN
        INSERT INTO public.delivery_jobs (
          org_id, seller_id, order_id,
          pickup_address, dropoff_address,
          package_description, status, priority
        ) VALUES (
          _shop.org_id, NEW.seller_id, NEW.id::text,
          'Pickup from shop',
          NEW.shipping_address,
          'Storefront order #' || LEFT(NEW.id::text, 8) || ' for ' || COALESCE(NEW.buyer_name, 'customer'),
          'pending', 'standard'
        )
        RETURNING id INTO _job_id;

        UPDATE public.storefront_orders
        SET delivery_job_id = _job_id,
            delivery_requested = true,
            delivery_status = 'pending'
        WHERE id = NEW.id;
      END IF;
    END IF;
  END IF;
  RETURN NEW;
END;
$$;
