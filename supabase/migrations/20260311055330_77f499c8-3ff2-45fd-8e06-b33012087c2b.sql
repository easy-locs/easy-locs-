-- Add stripe_payment_intent_id to marketplace_bookings for refund support
ALTER TABLE public.marketplace_bookings
  ADD COLUMN IF NOT EXISTS stripe_payment_intent_id text DEFAULT NULL;

-- Add stripe_payment_intent_id to concierge_orders for refund support
ALTER TABLE public.concierge_orders
  ADD COLUMN IF NOT EXISTS stripe_payment_intent_id text DEFAULT NULL;

-- Add refunded_at to marketplace_bookings if not exists
ALTER TABLE public.marketplace_bookings
  ADD COLUMN IF NOT EXISTS refunded_at timestamptz DEFAULT NULL;