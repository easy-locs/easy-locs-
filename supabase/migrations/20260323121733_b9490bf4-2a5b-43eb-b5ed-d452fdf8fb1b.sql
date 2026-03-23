
-- Add activation fields to storefront_pages
ALTER TABLE public.storefront_pages
  ADD COLUMN IF NOT EXISTS activation_status text DEFAULT 'draft',
  ADD COLUMN IF NOT EXISTS activated_at timestamptz,
  ADD COLUMN IF NOT EXISTS activated_by text,
  ADD COLUMN IF NOT EXISTS activation_channel text,
  ADD COLUMN IF NOT EXISTS activation_notes text,
  ADD COLUMN IF NOT EXISTS last_reviewed_at timestamptz,
  ADD COLUMN IF NOT EXISTS menu_quality_score integer DEFAULT 0;
