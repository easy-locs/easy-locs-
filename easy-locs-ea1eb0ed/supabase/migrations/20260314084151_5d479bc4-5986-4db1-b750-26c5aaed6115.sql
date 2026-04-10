
-- Add reference_code column to wallet_transactions for human-readable transaction references
ALTER TABLE public.wallet_transactions ADD COLUMN IF NOT EXISTS reference_code TEXT;

-- Create a function to generate unique reference codes (EL-YYYYMMDD-XXXX format)
CREATE OR REPLACE FUNCTION public.generate_wallet_reference_code()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _date_part TEXT;
  _seq INTEGER;
  _code TEXT;
BEGIN
  _date_part := TO_CHAR(NOW(), 'YYYYMMDD');
  
  -- Get count of transactions today for sequence
  SELECT COUNT(*) + 1 INTO _seq
  FROM public.wallet_transactions
  WHERE reference_code IS NOT NULL
    AND reference_code LIKE 'EL-' || _date_part || '-%';
  
  _code := 'EL-' || _date_part || '-' || LPAD(_seq::TEXT, 4, '0');
  
  NEW.reference_code := _code;
  RETURN NEW;
END;
$$;

-- Create trigger to auto-generate reference codes
DROP TRIGGER IF EXISTS trg_wallet_reference_code ON public.wallet_transactions;
CREATE TRIGGER trg_wallet_reference_code
  BEFORE INSERT ON public.wallet_transactions
  FOR EACH ROW
  WHEN (NEW.reference_code IS NULL)
  EXECUTE FUNCTION public.generate_wallet_reference_code();

-- Create index for quick lookup by reference_code
CREATE INDEX IF NOT EXISTS idx_wallet_transactions_reference_code ON public.wallet_transactions(reference_code);
