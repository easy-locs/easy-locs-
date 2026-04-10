
ALTER TABLE public.rent_calls ADD COLUMN IF NOT EXISTS payment_method text DEFAULT NULL;
COMMENT ON COLUMN public.rent_calls.payment_method IS 'Payment method: online, bank_transfer, cash';
