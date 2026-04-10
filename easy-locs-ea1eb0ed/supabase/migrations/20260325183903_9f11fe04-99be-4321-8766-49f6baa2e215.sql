ALTER TABLE public.seed_merchants
  ADD COLUMN IF NOT EXISTS gallery_images jsonb DEFAULT '[]',
  ADD COLUMN IF NOT EXISTS menu_quality_score integer DEFAULT 0;