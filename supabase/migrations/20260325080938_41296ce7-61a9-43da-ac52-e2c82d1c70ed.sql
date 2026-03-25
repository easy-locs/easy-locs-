-- Add invoice settings columns to storefront_pages (needed by trg_auto_invoice_on_complete)
ALTER TABLE public.storefront_pages 
  ADD COLUMN IF NOT EXISTS invoice_prefix text DEFAULT 'INV',
  ADD COLUMN IF NOT EXISTS invoice_next_number int DEFAULT 1,
  ADD COLUMN IF NOT EXISTS tax_rate numeric DEFAULT 0,
  ADD COLUMN IF NOT EXISTS tax_name text DEFAULT 'VAT';

-- Also check storefront_invoices exists
CREATE TABLE IF NOT EXISTS public.storefront_invoices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id uuid REFERENCES public.storefront_pages(id) ON DELETE CASCADE,
  order_id uuid,
  invoice_number text,
  status text DEFAULT 'issued',
  subtotal numeric DEFAULT 0,
  tax_rate numeric DEFAULT 0,
  tax_name text DEFAULT 'VAT',
  tax_amount numeric DEFAULT 0,
  total numeric DEFAULT 0,
  currency text DEFAULT 'AED',
  buyer_email text,
  buyer_name text,
  issued_at timestamptz DEFAULT now(),
  paid_at timestamptz,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.storefront_invoices ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'storefront_invoices' AND policyname = 'anon_insert_invoices') THEN
    CREATE POLICY "anon_insert_invoices" ON public.storefront_invoices FOR ALL USING (true) WITH CHECK (true);
  END IF;
END $$;