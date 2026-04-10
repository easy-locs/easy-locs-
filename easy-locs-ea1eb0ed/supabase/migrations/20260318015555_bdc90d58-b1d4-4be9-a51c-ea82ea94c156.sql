
-- Add auto_expire column to marketplace_services
ALTER TABLE public.marketplace_services
  ADD COLUMN IF NOT EXISTS auto_expire boolean NOT NULL DEFAULT false;

-- Set auto_expire = true for existing sale listings
UPDATE public.marketplace_services
SET auto_expire = true
WHERE listing_type = 'sale';

-- Set listing_expires_at for existing sale listings that don't have one
UPDATE public.marketplace_services
SET listing_expires_at = created_at::timestamptz + interval '30 days'
WHERE listing_type = 'sale' AND listing_expires_at IS NULL;

-- Add listing_type 'shop' to the allowed values (it's a text column, no constraint needed)
-- Ensure service/shop listings have auto_expire = false
UPDATE public.marketplace_services
SET auto_expire = false
WHERE listing_type IN ('service', 'shop') OR listing_type IS NULL;
