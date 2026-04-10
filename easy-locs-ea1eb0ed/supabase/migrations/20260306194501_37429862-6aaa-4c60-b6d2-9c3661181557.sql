
-- Add payment_status column to rent_calls for granular tracking
ALTER TABLE public.rent_calls 
ADD COLUMN IF NOT EXISTS payment_status text NOT NULL DEFAULT 'unpaid';

-- Add payment_reference for manual SEPA transfers
ALTER TABLE public.rent_calls 
ADD COLUMN IF NOT EXISTS payment_reference text;

-- Add stripe_payment_intent_id for tracking
ALTER TABLE public.rent_calls 
ADD COLUMN IF NOT EXISTS stripe_payment_intent_id text;

COMMENT ON COLUMN public.rent_calls.payment_status IS 'Payment status: unpaid, pending, processing, paid, failed';
COMMENT ON COLUMN public.rent_calls.payment_reference IS 'Unique reference for manual bank transfers';
COMMENT ON COLUMN public.rent_calls.stripe_payment_intent_id IS 'Stripe PaymentIntent ID for online payments';
