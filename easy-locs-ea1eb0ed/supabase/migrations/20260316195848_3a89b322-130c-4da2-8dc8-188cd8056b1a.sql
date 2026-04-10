
-- Returns & Refunds table
CREATE TABLE public.storefront_returns (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL REFERENCES public.storefront_orders(id) ON DELETE CASCADE,
  shop_id uuid NOT NULL REFERENCES public.storefront_pages(id) ON DELETE CASCADE,
  buyer_id uuid NOT NULL,
  reason text NOT NULL DEFAULT '',
  status text NOT NULL DEFAULT 'requested',
  refund_amount numeric DEFAULT 0,
  currency text NOT NULL DEFAULT 'EUR',
  seller_notes text,
  resolution text,
  created_at timestamptz NOT NULL DEFAULT now(),
  resolved_at timestamptz
);

ALTER TABLE public.storefront_returns ENABLE ROW LEVEL SECURITY;

-- Buyer can create and view own returns
CREATE POLICY "Buyer manages own returns"
  ON public.storefront_returns FOR ALL TO authenticated
  USING (buyer_id = auth.uid())
  WITH CHECK (buyer_id = auth.uid());

-- Seller can view and update returns for their shop
CREATE POLICY "Seller manages shop returns"
  ON public.storefront_returns FOR ALL TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.storefront_pages sp WHERE sp.id = shop_id AND sp.user_id = auth.uid())
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.storefront_pages sp WHERE sp.id = shop_id AND sp.user_id = auth.uid())
  );

-- Notify on return request
CREATE OR REPLACE FUNCTION public.notify_storefront_return()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $$
DECLARE _seller_id uuid; _buyer_id uuid; _shop_name text;
BEGIN
  SELECT user_id, name INTO _seller_id, _shop_name FROM public.storefront_pages WHERE id = NEW.shop_id LIMIT 1;
  _buyer_id := NEW.buyer_id;
  
  IF TG_OP = 'INSERT' AND _seller_id IS NOT NULL THEN
    INSERT INTO public.notifications (user_id, type, title, message, link, metadata_json)
    VALUES (_seller_id, 'info', '↩️ Return requested',
      'A customer requested a return/refund for ' || NEW.refund_amount || ' ' || NEW.currency,
      '/my-shop?tab=orders',
      jsonb_build_object('target_type', 'storefront_return', 'target_id', NEW.id::text));
  END IF;
  
  IF TG_OP = 'UPDATE' AND OLD.status IS DISTINCT FROM NEW.status AND _buyer_id IS NOT NULL THEN
    IF NEW.status = 'approved' THEN
      INSERT INTO public.notifications (user_id, type, title, message, link, metadata_json)
      VALUES (_buyer_id, 'info', '✅ Return approved',
        'Your return from ' || COALESCE(_shop_name, 'shop') || ' has been approved.',
        '/my-orders', jsonb_build_object('target_type', 'storefront_return', 'target_id', NEW.id::text));
    ELSIF NEW.status = 'rejected' THEN
      INSERT INTO public.notifications (user_id, type, title, message, link, metadata_json)
      VALUES (_buyer_id, 'info', '❌ Return rejected',
        'Your return from ' || COALESCE(_shop_name, 'shop') || ' was rejected.',
        '/my-orders', jsonb_build_object('target_type', 'storefront_return', 'target_id', NEW.id::text));
    ELSIF NEW.status = 'refunded' THEN
      INSERT INTO public.notifications (user_id, type, title, message, link, metadata_json)
      VALUES (_buyer_id, 'payment', '💰 Refund processed',
        'Your refund of ' || NEW.refund_amount || ' ' || NEW.currency || ' has been processed.',
        '/my-orders', jsonb_build_object('target_type', 'storefront_return', 'target_id', NEW.id::text));
    END IF;
  END IF;
  RETURN NEW;
END; $$;

CREATE TRIGGER trg_notify_storefront_return
  AFTER INSERT OR UPDATE ON public.storefront_returns
  FOR EACH ROW EXECUTE FUNCTION public.notify_storefront_return();
