
-- Add columns to storefront_orders if missing
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='storefront_orders' AND column_name='idempotency_key') THEN
    ALTER TABLE public.storefront_orders ADD COLUMN idempotency_key text;
    CREATE UNIQUE INDEX IF NOT EXISTS idx_storefront_orders_idempotency ON public.storefront_orders(idempotency_key) WHERE idempotency_key IS NOT NULL;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='storefront_orders' AND column_name='stripe_session_id') THEN
    ALTER TABLE public.storefront_orders ADD COLUMN stripe_session_id text;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='storefront_orders' AND column_name='stripe_payment_intent_id') THEN
    ALTER TABLE public.storefront_orders ADD COLUMN stripe_payment_intent_id text;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='storefront_orders' AND column_name='table_code') THEN
    ALTER TABLE public.storefront_orders ADD COLUMN table_code text;
  END IF;
END $$;
