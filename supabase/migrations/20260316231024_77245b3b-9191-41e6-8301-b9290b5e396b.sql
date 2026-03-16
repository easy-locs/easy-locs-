
CREATE OR REPLACE FUNCTION public.auto_create_order_on_deal_accepted()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _order_id uuid;
BEGIN
  IF NEW.status = 'accepted' AND (OLD.status IS NULL OR OLD.status::text <> 'accepted') THEN
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
        COALESCE(p.first_name || ' ' || p.last_name, p.username, 'Buyer'),
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
