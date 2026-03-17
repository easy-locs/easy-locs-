-- V5: Add wallet_reference_code and delivery_source to storefront_orders
ALTER TABLE public.storefront_orders
  ADD COLUMN IF NOT EXISTS wallet_reference_code text,
  ADD COLUMN IF NOT EXISTS delivery_source text DEFAULT 'trigger';
