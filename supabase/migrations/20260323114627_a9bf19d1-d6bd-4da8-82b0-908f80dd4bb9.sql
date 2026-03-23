
-- Add source tracking, readiness, and audit fields to storefront_pages
ALTER TABLE public.storefront_pages
  ADD COLUMN IF NOT EXISTS source_type text DEFAULT 'manual',
  ADD COLUMN IF NOT EXISTS source_confidence integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS products_count integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS has_menu boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS has_photo boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS audit_score integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS readiness_status text DEFAULT 'draft',
  ADD COLUMN IF NOT EXISTS blocking_reason text,
  ADD COLUMN IF NOT EXISTS is_auto_generated boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS is_claimed boolean DEFAULT false;
