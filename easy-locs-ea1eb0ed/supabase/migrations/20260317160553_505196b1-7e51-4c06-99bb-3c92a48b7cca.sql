
-- =====================================================
-- V4 MAX REAL: Auto-delivery trigger + validation infra
-- =====================================================

-- 1. Add requires_delivery flag to storefront_orders if missing
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'storefront_orders' AND column_name = 'requires_delivery'
  ) THEN
    ALTER TABLE public.storefront_orders ADD COLUMN requires_delivery boolean DEFAULT false;
  END IF;
END $$;

-- 2. Add delivery_job_id to storefront_orders for linking
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'storefront_orders' AND column_name = 'delivery_job_id'
  ) THEN
    ALTER TABLE public.storefront_orders ADD COLUMN delivery_job_id uuid REFERENCES public.delivery_jobs(id);
  END IF;
END $$;

-- 3. Add crypto_id to wallet_transactions for unique crypto reference
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'wallet_transactions' AND column_name = 'crypto_id'
  ) THEN
    ALTER TABLE public.wallet_transactions ADD COLUMN crypto_id text;
  END IF;
END $$;

-- 4. Auto-generate crypto_id on wallet_transactions insert
CREATE OR REPLACE FUNCTION public.generate_wallet_crypto_id()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.crypto_id IS NULL THEN
    NEW.crypto_id := 'TX-' || encode(gen_random_bytes(8), 'hex');
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

DROP TRIGGER IF EXISTS trg_wallet_crypto_id ON public.wallet_transactions;
CREATE TRIGGER trg_wallet_crypto_id
  BEFORE INSERT ON public.wallet_transactions
  FOR EACH ROW
  EXECUTE FUNCTION public.generate_wallet_crypto_id();

-- 5. Auto-generate reference_code if missing
CREATE OR REPLACE FUNCTION public.generate_wallet_reference_code()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.reference_code IS NULL THEN
    NEW.reference_code := 'EL-' || to_char(NOW(), 'YYYYMMDD') || '-' || lpad(floor(random() * 10000)::text, 4, '0');
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

DROP TRIGGER IF EXISTS trg_wallet_reference_code ON public.wallet_transactions;
CREATE TRIGGER trg_wallet_reference_code
  BEFORE INSERT ON public.wallet_transactions
  FOR EACH ROW
  EXECUTE FUNCTION public.generate_wallet_reference_code();

-- 6. Auto-create delivery job when order is completed + requires_delivery
CREATE OR REPLACE FUNCTION public.auto_create_delivery_on_order_complete()
RETURNS TRIGGER AS $$
DECLARE
  v_job_id uuid;
  v_confirmation_code text;
  v_shop record;
BEGIN
  -- Only fire on status change to 'completed' or 'accepted' with requires_delivery
  IF (NEW.status IN ('completed', 'accepted', 'preparing') 
      AND NEW.requires_delivery = true 
      AND (OLD.status IS DISTINCT FROM NEW.status)
      AND NEW.delivery_job_id IS NULL) THEN

    -- Get shop info for addresses
    SELECT name, city, country INTO v_shop
    FROM public.storefront_pages WHERE id = NEW.shop_id;

    v_confirmation_code := lpad(floor(random() * 1000000)::text, 6, '0');

    INSERT INTO public.delivery_jobs (
      org_id, seller_id, order_id, status, priority,
      pickup_address, dropoff_address,
      package_description, weight_kg,
      delivery_fee, currency,
      confirmation_code, notes
    ) VALUES (
      NEW.org_id,
      NEW.shop_id,  -- seller = shop
      NEW.id,
      'pending',
      'standard',
      COALESCE(v_shop.name, '') || ', ' || COALESCE(v_shop.city, '') || ', ' || COALESCE(v_shop.country, ''),
      COALESCE(NEW.shipping_address, 'Address pending'),
      'Order #' || left(NEW.id::text, 8),
      1,
      COALESCE(NEW.shipping_fee, 0),
      COALESCE(NEW.currency, 'EUR'),
      v_confirmation_code,
      'Auto-created from order completion'
    )
    RETURNING id INTO v_job_id;

    -- Link back
    UPDATE public.storefront_orders SET delivery_job_id = v_job_id WHERE id = NEW.id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

DROP TRIGGER IF EXISTS trg_auto_delivery_on_order ON public.storefront_orders;
CREATE TRIGGER trg_auto_delivery_on_order
  AFTER UPDATE ON public.storefront_orders
  FOR EACH ROW
  EXECUTE FUNCTION public.auto_create_delivery_on_order_complete();

-- 7. Ensure wallet_transactions status is always set
ALTER TABLE public.wallet_transactions ALTER COLUMN status SET DEFAULT 'pending';
