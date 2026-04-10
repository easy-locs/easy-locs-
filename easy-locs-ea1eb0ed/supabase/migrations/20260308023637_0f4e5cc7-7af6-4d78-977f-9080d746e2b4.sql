-- Add multi-currency tracking to concierge_orders
ALTER TABLE public.concierge_orders 
  ADD COLUMN IF NOT EXISTS customer_currency text DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS exchange_rate numeric DEFAULT 1;

-- Add multi-currency tracking to marketplace_bookings
ALTER TABLE public.marketplace_bookings 
  ADD COLUMN IF NOT EXISTS customer_currency text DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS exchange_rate numeric DEFAULT 1;

-- Add preferred reporting currency to profiles
ALTER TABLE public.profiles 
  ADD COLUMN IF NOT EXISTS preferred_currency text DEFAULT 'EUR';

-- Add multi-currency tracking to booking_requests (seasonal)
ALTER TABLE public.booking_requests
  ADD COLUMN IF NOT EXISTS customer_currency text DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS exchange_rate numeric DEFAULT 1;