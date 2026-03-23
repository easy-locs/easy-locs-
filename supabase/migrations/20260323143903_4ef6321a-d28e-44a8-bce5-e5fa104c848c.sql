
-- PHASE 1: Add columns
ALTER TABLE public.seed_merchants
  ADD COLUMN IF NOT EXISTS visibility_mode TEXT DEFAULT 'coming_soon',
  ADD COLUMN IF NOT EXISTS route_status TEXT DEFAULT 'valid',
  ADD COLUMN IF NOT EXISTS display_priority NUMERIC DEFAULT 0;

-- PHASE 2: Backfill existing rows
UPDATE public.seed_merchants
SET
  visibility_mode = 'coming_soon',
  route_status = 'valid',
  display_priority = COALESCE(visibility_score, 0) * 0.5;

-- PHASE 3: Constraints
ALTER TABLE public.seed_merchants
  ADD CONSTRAINT seed_merchants_visibility_mode_check
    CHECK (visibility_mode IN ('live','ready','coming_soon','search_only','map_only','hidden'));

ALTER TABLE public.seed_merchants
  ADD CONSTRAINT seed_merchants_route_status_check
    CHECK (route_status IN ('valid','broken'));

-- PHASE 3: Indexes
CREATE INDEX IF NOT EXISTS idx_seed_merchants_visibility_mode ON public.seed_merchants (visibility_mode);
CREATE INDEX IF NOT EXISTS idx_seed_merchants_route_status ON public.seed_merchants (route_status);
CREATE INDEX IF NOT EXISTS idx_seed_merchants_display_priority ON public.seed_merchants (display_priority DESC);
