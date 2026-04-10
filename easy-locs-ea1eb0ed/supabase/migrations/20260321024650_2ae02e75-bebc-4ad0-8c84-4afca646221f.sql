
-- 1) Atomic order creation RPC (order + items + status history in one transaction)
CREATE OR REPLACE FUNCTION public.create_storefront_order_atomic(
  p_order JSONB,
  p_items JSONB
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_order_id UUID;
  v_item JSONB;
BEGIN
  -- Insert order
  INSERT INTO storefront_orders (
    shop_id, seller_id, buyer_id, buyer_email,
    status, payment_status, payment_method,
    subtotal, delivery_fee, shipping_fee, total, currency,
    notes, delivery_address, delivery_lat, delivery_lng,
    requires_delivery, idempotency_key, table_code, fulfillment_type
  )
  VALUES (
    (p_order->>'shop_id')::UUID,
    (p_order->>'seller_id')::UUID,
    (p_order->>'buyer_id')::UUID,
    p_order->>'buyer_email',
    'pending_payment',
    'pending',
    COALESCE(p_order->>'payment_method', 'card'),
    COALESCE((p_order->>'subtotal')::NUMERIC, 0),
    COALESCE((p_order->>'delivery_fee')::NUMERIC, 0),
    COALESCE((p_order->>'shipping_fee')::NUMERIC, 0),
    COALESCE((p_order->>'total')::NUMERIC, 0),
    COALESCE(p_order->>'currency', 'EUR'),
    p_order->>'notes',
    p_order->>'delivery_address',
    (p_order->>'delivery_lat')::DOUBLE PRECISION,
    (p_order->>'delivery_lng')::DOUBLE PRECISION,
    COALESCE((p_order->>'requires_delivery')::BOOLEAN, false),
    p_order->>'idempotency_key',
    p_order->>'table_code',
    COALESCE(p_order->>'fulfillment_type', 'pickup')
  )
  RETURNING id INTO v_order_id;

  -- Insert items (atomic — if this fails, order rolls back too)
  FOR v_item IN SELECT * FROM jsonb_array_elements(p_items)
  LOOP
    INSERT INTO storefront_order_items (
      order_id, item_id, title, unit_price, quantity, total_price, notes
    )
    VALUES (
      v_order_id,
      (v_item->>'item_id')::UUID,
      v_item->>'title',
      COALESCE((v_item->>'unit_price')::NUMERIC, 0),
      COALESCE((v_item->>'quantity')::INT, 1),
      COALESCE((v_item->>'total_price')::NUMERIC, 0),
      v_item->>'notes'
    );
  END LOOP;

  -- Initial status history
  INSERT INTO order_status_history (order_id, status, actor_type, actor_id, notes)
  VALUES (v_order_id, 'pending_payment', 'customer', (p_order->>'buyer_id')::UUID, 'Order created');

  RETURN jsonb_build_object('order_id', v_order_id);
END;
$$;

-- 2) Add unique constraint on payment_events for idempotency
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'payment_events_external_id_event_type_key') THEN
    ALTER TABLE public.payment_events
      ADD CONSTRAINT payment_events_external_id_event_type_key UNIQUE (external_id, event_type);
  END IF;
EXCEPTION WHEN others THEN
  NULL;
END $$;

-- 3) Add unique constraint on order_status_history to prevent dupe status+order combos from webhook
-- (We use a partial unique index instead to allow same status from different actor types)
CREATE UNIQUE INDEX IF NOT EXISTS idx_order_status_history_idempotent
  ON public.order_status_history (order_id, status, actor_type)
  WHERE actor_type = 'system';
