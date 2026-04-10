
-- Add video_url to marketplace_services for video showcase
ALTER TABLE public.marketplace_services ADD COLUMN IF NOT EXISTS video_url text;

-- Add is_live flag to marketplace_providers for live status
ALTER TABLE public.marketplace_providers ADD COLUMN IF NOT EXISTS is_live boolean DEFAULT false;
ALTER TABLE public.marketplace_providers ADD COLUMN IF NOT EXISTS live_since timestamptz;
