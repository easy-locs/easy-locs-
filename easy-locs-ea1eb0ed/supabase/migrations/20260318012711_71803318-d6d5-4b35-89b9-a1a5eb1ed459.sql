
-- Add presence_mode and mobility_type to marketplace_services
ALTER TABLE public.marketplace_services
  ADD COLUMN IF NOT EXISTS presence_mode text NOT NULL DEFAULT 'pin',
  ADD COLUMN IF NOT EXISTS mobility_type text NOT NULL DEFAULT 'fixed_store';

-- Add same columns to concierge_services for consistency
ALTER TABLE public.concierge_services
  ADD COLUMN IF NOT EXISTS presence_mode text NOT NULL DEFAULT 'pin',
  ADD COLUMN IF NOT EXISTS mobility_type text NOT NULL DEFAULT 'fixed_store';

-- Add same columns to storefront_pages
ALTER TABLE public.storefront_pages
  ADD COLUMN IF NOT EXISTS presence_mode text NOT NULL DEFAULT 'pin',
  ADD COLUMN IF NOT EXISTS mobility_type text NOT NULL DEFAULT 'fixed_store';
