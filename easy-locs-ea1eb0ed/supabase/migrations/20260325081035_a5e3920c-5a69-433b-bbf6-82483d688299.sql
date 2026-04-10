-- Fix trg_auto_invoice_on_complete: profiles.full_name doesn't exist, use COALESCE(name, first_name)
CREATE OR REPLACE FUNCTION public.trg_auto_invoice_on_complete()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_inv_number text;
  v_next_num int;
  v_prefix text;
  v_tax_rate numeric;
  v_tax_name text;
  v_subtotal numeric;
  v_tax_amount numeric;
  v_buyer_email text;
  v_buyer_name text;
  v_exists boolean;
BEGIN
  IF NEW.status <> 'completed' OR OLD.status = 'completed' THEN
    RETURN NEW;
  END IF;

  SELECT EXISTS(SELECT 1 FROM public.storefront_invoices WHERE order_id = NEW.id) INTO v_exists;
  IF v_exists THEN RETURN NEW; END IF;

  SELECT
    COALESCE(invoice_prefix, 'INV'),
    COALESCE(invoice_next_number, 1),
    COALESCE(tax_rate, 0),
    COALESCE(tax_name, 'VAT')
  INTO v_prefix, v_next_num, v_tax_rate, v_tax_name
  FROM public.storefront_pages WHERE id = NEW.shop_id;

  IF v_prefix IS NULL THEN
    v_prefix := 'INV';
    v_next_num := 1;
    v_tax_rate := 0;
    v_tax_name := 'VAT';
  END IF;

  v_inv_number := v_prefix || '-' || TO_CHAR(NOW(), 'YYYYMM') || '-' || LPAD(v_next_num::text, 4, '0');
  v_subtotal := COALESCE(NEW.total, 0);
  v_tax_amount := ROUND(v_subtotal * v_tax_rate / 100, 2);

  SELECT email, COALESCE(name, first_name, username, 'Customer') INTO v_buyer_email, v_buyer_name
  FROM public.profiles WHERE id = NEW.buyer_id;

  INSERT INTO public.storefront_invoices (
    shop_id, order_id, invoice_number, status,
    subtotal, tax_rate, tax_name, tax_amount, total,
    currency, buyer_email, buyer_name,
    issued_at, paid_at
  ) VALUES (
    NEW.shop_id, NEW.id, v_inv_number, 'paid',
    v_subtotal, v_tax_rate, v_tax_name, v_tax_amount,
    v_subtotal + v_tax_amount,
    COALESCE(NEW.currency, 'AED'), v_buyer_email, v_buyer_name,
    NOW(), NOW()
  );

  UPDATE public.storefront_pages
  SET invoice_next_number = v_next_num + 1
  WHERE id = NEW.shop_id;

  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'trg_auto_invoice_on_complete failed: %', SQLERRM;
  RETURN NEW;
END;
$$;