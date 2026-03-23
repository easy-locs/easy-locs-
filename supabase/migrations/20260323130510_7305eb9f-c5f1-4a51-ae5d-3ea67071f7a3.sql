
ALTER TABLE public.storefront_pages 
ADD COLUMN IF NOT EXISTS visibility_mode text DEFAULT 'coming_soon',
ADD COLUMN IF NOT EXISTS route_status text DEFAULT 'valid',
ADD COLUMN IF NOT EXISTS display_priority integer DEFAULT 50,
ADD COLUMN IF NOT EXISTS blocking_reason text;
